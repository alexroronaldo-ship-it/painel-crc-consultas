import { withActiveCrcWrite } from "./crcWriteGuard";
import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { orthoActiveCampaigns, orthoActiveGoals, orthoActivePatients, orthoActiveWeekly, type InsertOrthoActiveCampaign, type InsertOrthoActivePatient } from "../drizzle/schema";
import { getDb } from "./db";

async function requiredDb() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db;
}

function nextMonth(month: string) {
  const [year, number] = month.split("-").map(Number);
  return number === 12 ? `${year + 1}-01` : `${year}-${String(number + 1).padStart(2, "0")}`;
}

export async function listActivePatients(month?: string) {
  const db = await requiredDb();
  const query = db.select().from(orthoActivePatients);
  const filtered = month ? query.where(and(gte(orthoActivePatients.closingDate, `${month}-01`), lt(orthoActivePatients.closingDate, `${nextMonth(month)}-01`))) : query;
  return filtered.orderBy(desc(orthoActivePatients.closingDate), desc(orthoActivePatients.createdAt));
}
export async function createActivePatient(input: InsertOrthoActivePatient) {
  return withActiveCrcWrite("ortho_active", input.crcName, async db => {
  if (input.campaignId) {
    const campaign = await db.select({ id: orthoActiveCampaigns.id }).from(orthoActiveCampaigns).where(eq(orthoActiveCampaigns.id, input.campaignId)).limit(1);
    if (!campaign.length) throw new Error("Campanha dos pacientes ativos não encontrada");
  }
  await db.insert(orthoActivePatients).values(input);
  });
}
export async function deleteActivePatient(id: number) {
  const db = await requiredDb();
  await db.delete(orthoActivePatients).where(eq(orthoActivePatients.id, id));
}
export async function updateActivePatientTime(id: number, totalTimeSeconds: number) {
  const db = await requiredDb();
  await db.update(orthoActivePatients).set({ totalTimeSeconds }).where(eq(orthoActivePatients.id, id));
}

export async function listActiveCampaigns() {
  const db = await requiredDb();
  return db.select().from(orthoActiveCampaigns).orderBy(desc(orthoActiveCampaigns.startDate), desc(orthoActiveCampaigns.createdAt));
}
export async function createActiveCampaign(input: InsertOrthoActiveCampaign) {
  const db = await requiredDb();
  await db.insert(orthoActiveCampaigns).values(input);
}
export async function updateActiveCampaign(id: number, input: Pick<InsertOrthoActiveCampaign, "name" | "origin" | "startDate" | "endDate" | "weeklyGoal">) {
  const db = await requiredDb();
  const campaign = await db.select({ id: orthoActiveCampaigns.id }).from(orthoActiveCampaigns).where(eq(orthoActiveCampaigns.id, id)).limit(1);
  if (!campaign.length) throw new Error("Campanha não encontrada");
  await db.update(orthoActiveCampaigns).set(input).where(eq(orthoActiveCampaigns.id, id));
}
export async function deleteEmptyActiveCampaign(id: number) {
  const db = await requiredDb();
  await db.transaction(async tx => {
    const campaign = await tx.select({ id: orthoActiveCampaigns.id }).from(orthoActiveCampaigns).where(eq(orthoActiveCampaigns.id, id)).limit(1);
    if (!campaign.length) throw new Error("Campanha não encontrada");
    const [linked] = await tx.select({ count: sql<number>`count(*)` }).from(orthoActivePatients).where(eq(orthoActivePatients.campaignId, id));
    if (Number(linked?.count ?? 0) > 0) throw new Error("A campanha tem pacientes vinculados e não pode ser excluída");
    await tx.delete(orthoActiveCampaigns).where(eq(orthoActiveCampaigns.id, id));
  });
}

export async function listActiveGoals(month: string) {
  const db = await requiredDb();
  return db.select().from(orthoActiveGoals).where(eq(orthoActiveGoals.month, month));
}
export async function saveActiveGoal(input: { crcName: string; month: string; monthlyGoal: string | null; weeklySalesGoal: string | null; timeGoalSeconds: number | null; updatedBy: number }) {
  return withActiveCrcWrite("ortho_active", input.crcName, async db => {
  await db.insert(orthoActiveGoals).values(input).onDuplicateKeyUpdate({ set: {
    monthlyGoal: input.monthlyGoal, weeklySalesGoal: input.weeklySalesGoal, timeGoalSeconds: input.timeGoalSeconds, updatedBy: input.updatedBy, updatedAt: new Date(),
  } });
  });
}
export async function listActiveWeeks(month: string) {
  const db = await requiredDb();
  return db.select().from(orthoActiveWeekly).where(eq(orthoActiveWeekly.month, month)).orderBy(orthoActiveWeekly.crcName, orthoActiveWeekly.week);
}
export async function saveActiveTasks(input: { crcName: string; month: string; week: number; taskCount: number; taskGoal: number | null; description: string | null; updatedBy: number }) {
  return withActiveCrcWrite("ortho_active", input.crcName, async db => {
  await db.insert(orthoActiveWeekly).values(input).onDuplicateKeyUpdate({ set: {
    taskCount: input.taskCount, taskGoal: input.taskGoal, description: input.description, updatedBy: input.updatedBy, updatedAt: new Date(),
  } });
  });
}
export async function saveActiveAppointments(input: { crcName: string; month: string; week: number; appointmentCount: number; appointmentGoal: number | null; updatedBy: number }) {
  return withActiveCrcWrite("ortho_active", input.crcName, async db => {
  await db.insert(orthoActiveWeekly).values(input).onDuplicateKeyUpdate({ set: {
    appointmentCount: input.appointmentCount, appointmentGoal: input.appointmentGoal, updatedBy: input.updatedBy, updatedAt: new Date(),
  } });
  });
}
