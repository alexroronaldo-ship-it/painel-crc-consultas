import { withActiveCrcWrite } from "./crcWriteGuard";
import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { campaigns, closures, crcProfiles, crcWeeklyActivities, crcWeeklyAppointments, InsertCampaign, InsertClosure, InsertCrcWeeklyActivity, InsertCrcWeeklyAppointment, InsertUser, InsertValSale, users, valSales, odontomabCrcs } from "../drizzle/schema";
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

export async function listCrcProfiles() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select({ crcName: crcProfiles.crcName, photoUrl: crcProfiles.photoUrl }).from(crcProfiles);
}

export async function saveCrcPhoto(input: { crcName: "WISLLAYNI" | "JAYZA" | "VAL"; photoKey: string; photoUrl: string; updatedBy: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(crcProfiles).values(input).onDuplicateKeyUpdate({
    set: { photoKey: input.photoKey, photoUrl: input.photoUrl, updatedBy: input.updatedBy, updatedAt: new Date() },
  });
}

export async function listClosures(month?: string) {
  const db = await getDb();
  if (!db) return [];
  if (!month) {
    return db.select().from(closures).orderBy(desc(closures.closingDate), desc(closures.createdAt));
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
    ;
}

export async function createClosure(input: InsertClosure) {
  return withActiveCrcWrite("funnel", input.crcName, async db => {
  await db.insert(closures).values(input);
  });
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
  if (input.crcName === "VAL") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  await db.insert(crcWeeklyActivities).values(input).onDuplicateKeyUpdate({
    set: {
      taskCount: input.taskCount,
      description: input.description,
      createdBy: input.createdBy,
      updatedAt: new Date(),
    },
  });
    return;
  }
  return withActiveCrcWrite("funnel", input.crcName, async db => {
  await db.insert(crcWeeklyActivities).values(input).onDuplicateKeyUpdate({
    set: {
      taskCount: input.taskCount,
      description: input.description,
      createdBy: input.createdBy,
      updatedAt: new Date(),
    },
  });
  });
}

export async function listCrcWeeklyAppointments(month: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(crcWeeklyAppointments)
    .where(eq(crcWeeklyAppointments.month, month))
    .orderBy(crcWeeklyAppointments.crcName, crcWeeklyAppointments.week);
}

export async function saveCrcWeeklyAppointment(input: InsertCrcWeeklyAppointment) {
  if (input.crcName === "VAL") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  await db.insert(crcWeeklyAppointments).values(input).onDuplicateKeyUpdate({
    set: {
      appointmentCount: input.appointmentCount,
      weeklyGoal: input.weeklyGoal,
      createdBy: input.createdBy,
      updatedAt: new Date(),
    },
  });
    return;
  }
  return withActiveCrcWrite("funnel", input.crcName, async db => {
  await db.insert(crcWeeklyAppointments).values(input).onDuplicateKeyUpdate({
    set: {
      appointmentCount: input.appointmentCount,
      weeklyGoal: input.weeklyGoal,
      createdBy: input.createdBy,
      updatedAt: new Date(),
    },
  });
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

export async function updateCampaign(id: number, input: Pick<InsertCampaign, "name" | "origin" | "startDate" | "endDate" | "weeklyGoal">) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existing = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.id, id)).limit(1);
  if (!existing.length) throw new Error("Campanha não encontrada");
  await db.update(campaigns).set(input).where(eq(campaigns.id, id));
}

export async function listCampaignUsage() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select({ campaignId: closures.campaignId, count: sql<number>`count(*)` }).from(closures).groupBy(closures.campaignId);
  return rows.filter(row => row.campaignId !== null).map(row => ({ campaignId: row.campaignId!, count: Number(row.count) }));
}

/** Recusa excluir campanhas com vendas; nenhuma venda é apagada implicitamente. */
export async function deleteEmptyCampaign(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.transaction(async tx => {
    const found = await tx.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.id, id)).limit(1);
    if (!found.length) throw new Error("Campanha não encontrada");
    const [linked] = await tx.select({ count: sql<number>`count(*)` }).from(closures).where(eq(closures.campaignId, id));
    if (Number(linked?.count ?? 0) > 0) throw new Error("Esta campanha tem fechamentos: mescle-a com outra campanha antes de excluir");
    await tx.delete(campaigns).where(eq(campaigns.id, id));
  });
}

/** Move todos os vínculos antes de retirar a duplicata, em uma única transação. */
export async function mergeCampaigns(sourceId: number, targetId: number) {
  if (sourceId === targetId) throw new Error("Selecione uma campanha de destino diferente");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.transaction(async tx => {
    const found = await tx.select({ id: campaigns.id }).from(campaigns).where(inArray(campaigns.id, [sourceId, targetId]));
    if (found.length !== 2) throw new Error("Campanha de origem ou destino não encontrada");
    await tx.update(closures).set({ campaignId: targetId }).where(eq(closures.campaignId, sourceId));
    await tx.delete(campaigns).where(eq(campaigns.id, sourceId));
  });
}

export async function listValSales(month?: string) {
  const db = await getDb();
  if (!db) return [];
  if (!month) {
    return db.select().from(valSales).orderBy(desc(valSales.saleDate), desc(valSales.createdAt));
  }

  const [year, monthNumber] = month.split("-").map(Number);
  const nextMonth = monthNumber === 12
    ? `${year + 1}-01`
    : `${year}-${String(monthNumber + 1).padStart(2, "0")}`;

  return db
    .select()
    .from(valSales)
    .where(and(gte(valSales.saleDate, `${month}-01`), lt(valSales.saleDate, `${nextMonth}-01`)))
    .orderBy(desc(valSales.saleDate), desc(valSales.createdAt));
}

export async function createValSale(input: InsertValSale) {
  if (!input.crcId) throw new Error("Selecione uma CRC cadastrada");
  return withActiveCrcWrite("odontomab", input.crcId, async db => {
  await db.insert(valSales).values(input);
  });
}

export async function deleteValSale(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(valSales).where(eq(valSales.id, id));
}

export async function getValSale(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const [sale] = await db.select().from(valSales).where(eq(valSales.id, id)).limit(1);
  if (!sale) throw new Error("Paciente não encontrado");
  return sale;
}

export async function updateValSale(id: number, input: Pick<InsertValSale, "crcId" | "patientName" | "phone" | "patientType" | "internalStatus" | "saleDate" | "value" | "totalTimeSeconds" | "insurancePlan" | "notes">) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  if (!input.crcId) throw new Error("Selecione uma CRC cadastrada");
  await db.transaction(async tx => {
    const [crc] = await tx.select().from(odontomabCrcs).where(eq(odontomabCrcs.id, input.crcId!)).for("update");
    const [existing] = await tx.select().from(valSales).where(eq(valSales.id, id)).for("update");
    if (!existing) throw new Error("Paciente não encontrado");
    if (!crc) throw new Error("CRC não cadastrada");
    if (!crc.isActive && existing.crcId !== input.crcId) throw new Error("CRC retirada. Selecione outra CRC ativa para transferir este paciente.");
    await tx.update(valSales).set(input).where(eq(valSales.id, id));
  });
}

export async function saveValPatientPhoto(id: number, photoKey: string, photoUrl: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(valSales).set({ photoKey, photoUrl }).where(eq(valSales.id, id));
}
