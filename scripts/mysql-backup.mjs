import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

class BackupError extends Error {}
const fail = message => { throw new BackupError(message); };
const identifier = value => {
  if (!/^[a-zA-Z0-9_]+$/.test(value)) fail("Identificador de tabela inválido.");
  return `\`${value}\``;
};

export function validateBackup(compressed, manifest) {
  const hash = createHash("sha256").update(compressed).digest("hex");
  if (hash !== manifest?.files?.["database.sql.gz"]?.sha256) {
    fail("O SHA-256 do banco não corresponde ao manifest. Importação cancelada.");
  }
  const counts = manifest.table_row_counts;
  if (!counts || !Object.keys(counts).length) fail("Manifest sem contagens de tabelas.");
  for (const [name, count] of Object.entries(counts)) {
    identifier(name);
    if (!Number.isSafeInteger(count) || count < 0) fail("Contagem inválida no manifest.");
  }
  const sql = gunzipSync(compressed, { maxOutputLength: 128 * 1024 * 1024 }).toString("utf8");
  // This tool accepts the logical export supplied with this project, not arbitrary dumps.
  if (/\b(?:USE\s+|(?:CREATE|DROP|ALTER)\s+(?:DATABASE|SCHEMA)\b)/i.test(sql)) {
    fail("O dump seleciona ou altera um banco. Revise o destino antes de importar.");
  }
  const created = [...sql.matchAll(/CREATE TABLE\s+`([a-zA-Z0-9_]+)`\s*\(/gi)].map(m => m[1]);
  if (JSON.stringify(created.sort()) !== JSON.stringify(Object.keys(counts).sort())) {
    fail("As tabelas do SQL não correspondem ao manifest.");
  }
  return { sql, counts, hash, createdAt: manifest.created_at_utc };
}

export function connectionOptions(value, restore = false) {
  let url;
  try { url = new URL(value); } catch { fail("Configure RESTORE_DATABASE_URL para o banco novo."); }
  const database = decodeURIComponent(url.pathname.slice(1));
  if (url.protocol !== "mysql:" || !/^[a-zA-Z0-9_]+$/.test(database)
      || ["mysql", "sys", "information_schema", "performance_schema"].includes(database.toLowerCase())) {
    fail("Selecione um banco MySQL de aplicação, novo e vazio.");
  }
  // Explicit fields prevent URL parameters from enabling insecure/unexpected options.
  if (url.search) fail("Use MYSQL_SSL_CA_FILE ou MYSQL_REQUIRE_TLS=1 para TLS; remova parâmetros da URL.");
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database,
    charset: "utf8mb4",
    timezone: "Z",
    multipleStatements: restore,
    connectTimeout: 10000,
  };
}

async function listTables(connection) {
  const [tables] = await connection.query("SHOW FULL TABLES");
  return tables.map(row => String(Object.values(row)[0]));
}

export async function verifyDatabase(connection, backup) {
  const tables = await listTables(connection);
  if (JSON.stringify(tables.sort()) !== JSON.stringify(Object.keys(backup.counts).sort())) {
    fail("O conjunto de tabelas do destino difere do backup.");
  }
  const results = [];
  for (const [table, expected] of Object.entries(backup.counts)) {
    const [rows] = await connection.query(`SELECT COUNT(*) AS total FROM ${identifier(table)}`);
    const actual = Number(rows[0].total);
    results.push({ table, expected, actual });
    if (actual !== expected) fail(`Contagem divergente em ${table}: esperado ${expected}, encontrado ${actual}.`);
  }
  return results;
}

export async function restoreDatabase(connection, backup) {
  const [[{ acquired }]] = await connection.query("SELECT GET_LOCK('painel_crc_backup_restore', 0) AS acquired");
  if (Number(acquired) !== 1) fail("Já existe uma restauração em andamento neste servidor.");
  try {
    if ((await listTables(connection)).length) {
      fail("O destino contém tabelas ou views. Nenhum dado foi importado.");
    }
    // DDL is not transactional in MySQL. A failed import requires a new empty target.
    await connection.query(backup.sql);
    return await verifyDatabase(connection, backup);
  } finally {
    await connection.query("SELECT RELEASE_LOCK('painel_crc_backup_restore')");
  }
}

async function main() {
  const { values } = parseArgs({ options: {
    mode: { type: "string", default: "inspect" },
    dump: { type: "string" },
    manifest: { type: "string" },
    "confirm-empty-target": { type: "boolean", default: false },
  } });
  if (!["inspect", "verify", "restore"].includes(values.mode)) fail("Modo: inspect, verify ou restore.");
  if (!values.dump || !values.manifest) fail("Informe --dump e --manifest (arquivos fora do Git).");
  const [compressed, manifestText] = await Promise.all([readFile(values.dump), readFile(values.manifest, "utf8")]);
  const backup = validateBackup(compressed, JSON.parse(manifestText));
  console.log(JSON.stringify({ backupUtc: backup.createdAt, sha256: backup.hash,
    tables: Object.keys(backup.counts).length, rows: Object.values(backup.counts).reduce((a, b) => a + b, 0) }));
  if (values.mode === "inspect") return;
  const restore = values.mode === "restore";
  if (restore && !values["confirm-empty-target"]) fail("Restauração exige --confirm-empty-target.");
  const options = connectionOptions(process.env.RESTORE_DATABASE_URL, restore);
  if (process.env.MYSQL_SSL_CA_FILE) {
    options.ssl = { ca: await readFile(process.env.MYSQL_SSL_CA_FILE, "utf8"), rejectUnauthorized: true };
  } else if (process.env.MYSQL_REQUIRE_TLS === "1") {
    options.ssl = { rejectUnauthorized: true };
  }
  const { createConnection } = await import("mysql2/promise");
  const connection = await createConnection(options);
  try {
    console.table(await (restore ? restoreDatabase(connection, backup) : verifyDatabase(connection, backup)));
    console.log("Contagens conferidas. Login, arquivos e compatibilidade do código ainda exigem validação.");
  } finally {
    await connection.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    // Driver errors may contain SQL values or credentials. Do not print them.
    console.error(error instanceof BackupError ? error.message :
      `Falha na operação (${typeof error.code === "string" && /^[A-Z0-9_]+$/.test(error.code) ? error.code : "detalhes omitidos"}). O destino pode estar parcialmente restaurado; confira antes de continuar.`);
    process.exitCode = 1;
  });
}
