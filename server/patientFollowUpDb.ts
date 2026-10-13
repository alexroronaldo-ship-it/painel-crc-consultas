import { and, desc, eq, gte, lt } from "drizzle-orm";
import { campaigns, closures, odontomabCrcs, orthoActivePatients, patientFollowUps, valSales, type InsertPatientFollowUp } from "../drizzle/schema";
import { getDb } from "./db";
import { assertOrtoCrcActive } from "./crcTransferDb";
import { requireOdontomabCrc } from "./odontomabCrcDb";

async function database() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db;
}

function nextMonth(month: string) {
  const [year, number] = month.split("-").map(Number);
  return number === 12 ? `${year + 1}-01` : `${year}-${String(number + 1).padStart(2, "0")}`;
}

export async function listPatientFollowUps(month?: string) {
  const db = await database();
  const rows = month
    ? await db.select().from(patientFollowUps).where(and(gte(patientFollowUps.createdAt, new Date(`${month}-01T00:00:00`)), lt(patientFollowUps.createdAt, new Date(`${nextMonth(month)}-01T00:00:00`)))).orderBy(desc(patientFollowUps.createdAt))
    : await db.select().from(patientFollowUps).orderBy(desc(patientFollowUps.createdAt));
  const campaignRows = await db.select({ id: campaigns.id, name: campaigns.name }).from(campaigns);
  return rows.map(row => ({ ...row, campaignName: row.campaignId ? campaignRows.find(campaign => campaign.id === row.campaignId)?.name ?? "Campanha removida" : null }));
}

export async function createPatientFollowUp(input: InsertPatientFollowUp) {
  const db = await database();
  if (input.hasCampaign) {
    if (!input.campaignId) throw new Error("Selecione a campanha do lead");
    const campaign = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.id, input.campaignId)).limit(1);
    if (!campaign.length) throw new Error("Campanha não encontrada");
  }
  const result = await db.insert(patientFollowUps).values({ ...input, campaignId: input.hasCampaign ? input.campaignId : null });
  return Number(result[0].insertId);
}

export async function updatePatientFollowUp(id: number, input: Pick<InsertPatientFollowUp, "crcName" | "hasCampaign" | "campaignId" | "patientName" | "phone" | "contactChannel" | "reference" | "closingDate" | "closedItem" | "value" | "notes">, correctedBy: number) {
  const db = await database();
  const [current] = await db.select().from(patientFollowUps).where(eq(patientFollowUps.id, id)).limit(1);
  if (!current) throw new Error("Lead não encontrado");
  if (current.saleEffective) throw new Error("A venda já foi efetivada. Corrija os detalhes na comissão de destino.");
  if (input.hasCampaign) {
    if (!input.campaignId) throw new Error("Selecione a campanha do lead");
    const campaign = await db.select({ id: campaigns.id }).from(campaigns).where(eq(campaigns.id, input.campaignId)).limit(1);
    if (!campaign.length) throw new Error("Campanha não encontrada");
  }
  await db.update(patientFollowUps).set({ ...input, campaignId: input.hasCampaign ? input.campaignId : null, correctedBy, correctedAt: new Date() }).where(eq(patientFollowUps.id, id));
}

export async function deletePatientFollowUp(id: number) {
  const db = await database();
  const [current] = await db.select({ id: patientFollowUps.id, saleEffective: patientFollowUps.saleEffective, patientName: patientFollowUps.patientName, crcName: patientFollowUps.crcName }).from(patientFollowUps).where(eq(patientFollowUps.id, id)).limit(1);
  if (!current) throw new Error("Lead não encontrado");
  if (current.saleEffective) throw new Error("Venda efetivada não pode ser removida do acompanhamento");
  await db.delete(patientFollowUps).where(eq(patientFollowUps.id, id));
  return current;
}

export async function effectivePatientFollowUp(input: { id: number; commissionDestination: "clinic" | "marketing" | "odontomab"; commissionCrcId: string; closingDate: string; closedItem: string; value: string; odontomabPatientType?: "active" | "new"; insurancePlan?: string; effectiveBy: number }) {
  const db = await database();
  const [lead] = await db.select().from(patientFollowUps).where(eq(patientFollowUps.id, input.id)).limit(1);
  if (!lead) throw new Error("Lead não encontrado");
  if (lead.saleEffective) throw new Error("Esta venda já foi efetivada");
  if (input.commissionDestination === "marketing") {
    if (!lead.hasCampaign || !lead.campaignId) throw new Error("Selecione Comissão de Marketing apenas para leads com campanha");
    await assertOrtoCrcActive("funnel", input.commissionCrcId);
  }
  if (input.commissionDestination === "clinic") await assertOrtoCrcActive("ortho_active", input.commissionCrcId);
  if (input.commissionDestination === "odontomab") {
    if (!input.odontomabPatientType || !input.insurancePlan) throw new Error("Informe tipo de paciente e convênio da Odontomab");
    await requireOdontomabCrc(input.commissionCrcId);
  }
  await db.transaction(async tx => {
    const [locked] = await tx.select().from(patientFollowUps).where(eq(patientFollowUps.id, input.id)).for("update");
    if (!locked) throw new Error("Lead não encontrado");
    if (locked.saleEffective) throw new Error("Esta venda já foi efetivada");
    let destinationRecordId = 0;
    if (input.commissionDestination === "marketing") {
      const result = await tx.insert(closures).values({ crcName: input.commissionCrcId, patientName: locked.patientName, phone: locked.phone, contactChannel: locked.contactChannel, reference: locked.reference, closingDate: input.closingDate, closedItem: input.closedItem, value: input.value, totalTimeSeconds: 0, internalStatus: "closed", internalNotes: locked.notes, campaignId: locked.campaignId, createdBy: input.effectiveBy });
      destinationRecordId = Number(result[0].insertId);
    } else if (input.commissionDestination === "clinic") {
      const result = await tx.insert(orthoActivePatients).values({ crcName: input.commissionCrcId, patientName: locked.patientName, phone: locked.phone, contactChannel: locked.contactChannel, reference: locked.reference, closingDate: input.closingDate, closedItem: input.closedItem, value: input.value, totalTimeSeconds: 0, internalStatus: "closed", internalNotes: locked.notes, campaignId: null, createdBy: input.effectiveBy });
      destinationRecordId = Number(result[0].insertId);
    } else {
      const result = await tx.insert(valSales).values({ crcId: input.commissionCrcId, patientName: locked.patientName, phone: locked.phone, contactChannel: locked.contactChannel, patientType: input.odontomabPatientType!, saleDate: input.closingDate, value: input.value, totalTimeSeconds: 0, insurancePlan: input.insurancePlan!, treatment: input.closedItem, internalStatus: "closed", notes: locked.notes, createdBy: input.effectiveBy });
      destinationRecordId = Number(result[0].insertId);
    }
    await tx.update(patientFollowUps).set({ closingDate: input.closingDate, closedItem: input.closedItem, value: input.value, commissionDestination: input.commissionDestination, commissionCrcId: input.commissionCrcId, destinationRecordId, saleEffective: true, effectiveBy: input.effectiveBy, effectiveAt: new Date() }).where(eq(patientFollowUps.id, input.id));
  });
  return { patientName: lead.patientName, crcName: input.commissionCrcId };
}
