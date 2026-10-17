import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { validateBackup, connectionOptions, restoreDatabase, verifyDatabase } from "./mysql-backup.mjs";

function fixture(sql = "CREATE TABLE `users` (`id` int); INSERT INTO `users` VALUES (1);") {
  const compressed = gzipSync(sql);
  const manifest = { files: { "database.sql.gz": { sha256: createHash("sha256").update(compressed).digest("hex") } }, table_row_counts: { users: 1 } };
  return { compressed, manifest, backup: { sql, counts: { users: 1 } } };
}

test("refuses a corrupt dump before touching a database", () => {
  const { compressed, manifest } = fixture();
  manifest.files["database.sql.gz"].sha256 = "wrong";
  assert.throws(() => validateBackup(compressed, manifest), /SHA-256/);
});

test("rejects a dump that switches databases", () => {
  const { compressed, manifest } = fixture("USE production; CREATE TABLE `users` (`id` int);");
  assert.throws(() => validateBackup(compressed, manifest), /seleciona ou altera/);
});

test("checks manifest table names and counts", () => {
  const { compressed, manifest } = fixture();
  assert.equal(validateBackup(compressed, manifest).counts.users, 1);
  manifest.table_row_counts.users = -1;
  assert.throws(() => validateBackup(compressed, manifest), /Contagem inválida/);
  manifest.table_row_counts = { other: 1 };
  assert.throws(() => validateBackup(compressed, manifest), /não correspondem/);
});

test("refuses system databases and URL configuration overrides", () => {
  for (const url of [undefined, "postgres://user:pass@host/app", "mysql://user:pass@host/mysql", "mysql://user:pass@host/"])
    assert.throws(() => connectionOptions(url));
  assert.throws(() => connectionOptions("mysql://user:pass@host/app?multipleStatements=true"));
  assert.equal(connectionOptions("mysql://user:abc%40def@host/app").password, "abc@def");
  assert.equal(connectionOptions("mysql://user:pass@host/app").multipleStatements, false);
});

test("never imports over existing tables or views", async () => {
  const calls = [];
  const connection = { query: async sql => {
    calls.push(sql);
    if (sql.includes("GET_LOCK")) return [[{ acquired: 1 }]];
    if (sql === "SHOW FULL TABLES") return [[{ Tables_in_app: "existing", Table_type: "VIEW" }]];
    if (sql.includes("RELEASE_LOCK")) return [[]];
    assert.fail("No import must be attempted");
  } };
  await assert.rejects(restoreDatabase(connection, fixture().backup), /contém tabelas ou views/);
  assert.equal(calls.length, 3);
});

test("refuses concurrent restores", async () => {
  let calls = 0;
  const connection = { query: async () => { calls++; return [[{ acquired: 0 }]]; } };
  await assert.rejects(restoreDatabase(connection, fixture().backup), /em andamento/);
  assert.equal(calls, 1);
});

test("restores an empty target and verifies row counts", async () => {
  const { backup } = fixture();
  let imported = false;
  let released = false;
  const connection = { query: async sql => {
    if (sql.includes("GET_LOCK")) return [[{ acquired: 1 }]];
    if (sql.includes("RELEASE_LOCK")) { released = true; return [[]]; }
    if (sql === "SHOW FULL TABLES") return [imported ? [{ Tables_in_app: "users" }] : []];
    if (sql === backup.sql) { imported = true; return [[]]; }
    if (sql === "SELECT COUNT(*) AS total FROM `users`") return [[{ total: 1 }]];
    assert.fail("Unexpected query");
  } };
  assert.deepEqual(await restoreDatabase(connection, backup), [{ table: "users", expected: 1, actual: 1 }]);
  assert.ok(imported && released);
});

test("releases the restore lock when SQL execution fails", async () => {
  const { backup } = fixture();
  let released = false;
  const connection = { query: async sql => {
    if (sql.includes("GET_LOCK")) return [[{ acquired: 1 }]];
    if (sql === "SHOW FULL TABLES") return [[]];
    if (sql.includes("RELEASE_LOCK")) { released = true; return [[]]; }
    throw new Error("SQL failed");
  } };
  await assert.rejects(restoreDatabase(connection, backup), /SQL failed/);
  assert.ok(released);
});

test("does not report success for missing tables or mismatched rows", async () => {
  const { backup } = fixture();
  await assert.rejects(verifyDatabase({ query: async () => [[]] }, backup), /conjunto de tabelas/);
  const connection = { query: async sql => sql === "SHOW FULL TABLES"
    ? [[{ Tables_in_app: "users" }]] : [[{ total: 2 }]] };
  await assert.rejects(verifyDatabase(connection, backup), /Contagem divergente/);
});
