import { and, desc, gte, lt } from "drizzle-orm";
import { managerAuditLogs, type InsertManagerAuditLog } from "../drizzle/schema";
import { getDb } from "./db";

async function database() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db;
}

function nextMonth(month: string) {
  const [year, number] = month.split("-").map(Number);
  return number === 12 ? `${year + 1}-01` : `${year}-${String(number + 1).padStart(2, "0")}`;
}

export async function recordManagerAudit(input: InsertManagerAuditLog) {
  const db = await database();
  await db.insert(managerAuditLogs).values(input);
}

export async function listManagerAudit(month?: string) {
  const db = await database();
  const rows = month
    ? await db.select().from(managerAuditLogs).where(and(gte(managerAuditLogs.occurredAt, new Date(`${month}-01T00:00:00`)), lt(managerAuditLogs.occurredAt, new Date(`${nextMonth(month)}-01T00:00:00`)))).orderBy(desc(managerAuditLogs.occurredAt)).limit(100)
    : await db.select().from(managerAuditLogs).orderBy(desc(managerAuditLogs.occurredAt)).limit(100);
  return rows;
}
