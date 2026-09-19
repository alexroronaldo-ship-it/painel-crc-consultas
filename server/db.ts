import { and, desc, eq, gte, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { campaigns, closures, crcWeeklyActivities, InsertCampaign, InsertClosure, InsertCrcWeeklyActivity, InsertUser, InsertValSale, users, valSales } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  textFields.forEach(field => { const value = user[field]; if (value !== undefined) { const normalized = value ?? null; values[field] = normalized; updateSet[field] = normalized; } });
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listClosures(month?: string) {
  const db = await getDb();
  if (!db) return [];
  if (!month) {
    return db.select().from(closures).orderBy(desc(closures.closingDate), desc(closures.createdAt)).limit(500);
  }

  const [year, monthNumber] = month.split("-").map(Number);
  const nextMonth = monthNumber === 12
    ? `${year + 1}-01`
    : `${year}-${String(monthNumber + 1).padStart(2, "0")}`;

  return db
    .select()
    .from(closures)
    .where(and(gte(closures.closingDate, `${month}-01`), lt(closures.closingDate, `${nextMonth}-01`)))
    .orderBy(desc(closures.closingDate), desc(closures.createdAt))
    .limit(500);
}

export async function createClosure(input: InsertClosure) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(closures).values(input);
}

export async function deleteClosure(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(closures).where(eq(closures.id, id));
}

export async function updateClosureTime(id: number, totalTimeSeconds: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(closures).set({ totalTimeSeconds }).where(eq(closures.id, id));
}

export async function listCrcWeeklyActivities(month: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(crcWeeklyActivities)
    .where(eq(crcWeeklyActivities.month, month))
    .orderBy(crcWeeklyActivities.crcName, crcWeeklyActivities.week);
}

export async function saveCrcWeeklyActivity(input: InsertCrcWeeklyActivity) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(crcWeeklyActivities).values(input).onDuplicateKeyUpdate({
    set: {
      description: input.description,
      createdBy: input.createdBy,
      updatedAt: new Date(),
    },
  });
}

export async function listCampaigns() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(campaigns).orderBy(desc(campaigns.startDate), desc(campaigns.createdAt)).limit(200);
}

export async function createCampaign(input: InsertCampaign) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(campaigns).values(input);
}

export async function listValSales(month?: string) {
  const db = await getDb();
  if (!db) return [];
  if (!month) {
    return db.select().from(valSales).orderBy(desc(valSales.saleDate), desc(valSales.createdAt)).limit(500);
  }

  const [year, monthNumber] = month.split("-").map(Number);
  const nextMonth = monthNumber === 12
    ? `${year + 1}-01`
    : `${year}-${String(monthNumber + 1).padStart(2, "0")}`;

  return db
    .select()
    .from(valSales)
    .where(and(gte(valSales.saleDate, `${month}-01`), lt(valSales.saleDate, `${nextMonth}-01`)))
    .orderBy(desc(valSales.saleDate), desc(valSales.createdAt))
    .limit(500);
}

export async function createValSale(input: InsertValSale) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(valSales).values(input);
}

export async function deleteValSale(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(valSales).where(eq(valSales.id, id));
}
