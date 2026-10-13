import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ODONTOMAB_INSURANCE_PLANS } from "../../shared/odontomab";
import { ORTHO_REFERENCE_OPTIONS, ORTHO_TREATMENTS } from "../../shared/orthoReference";
import { protectedProcedure, router } from "../_core/trpc";
import { recordManagerAudit } from "../managerAuditDb";
import { createPatientFollowUp, deletePatientFollowUp, effectivePatientFollowUp, listPatientFollowUps, updatePatientFollowUp } from "../patientFollowUpDb";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida").refine(value => !Number.isNaN(Date.parse(`${value}T12:00:00`)) && new Date(`${value}T12:00:00`).toISOString().slice(0, 10) === value, "Data inexistente");
const optionalDate = date.optional();
const money = z.string().regex(/^\d{1,10}(?:,\d{1,2})?$/, "Informe um valor em reais");
const optionalMoney = money.optional();
const actorName = (user: { name: string | null; email: string | null; openId: string }) => user.name || user.email || user.openId;
const base = z.object({
  crcName: z.string().trim().min(2, "Selecione a CRC responsável").max(32),
  hasCampaign: z.boolean(),
  campaignId: z.number().int().positive().optional(),
  patientName: z.string().trim().min(2, "Informe o nome do paciente").max(160),
  phone: z.string().trim().min(8, "Informe um telefone válido").max(40),
  contactChannel: z.enum(["WhatsApp", "Ligação", "Presencial", "Instagram"]),
  reference: z.enum(ORTHO_REFERENCE_OPTIONS),
  closingDate: optionalDate,
  closedItem: z.enum(ORTHO_TREATMENTS).optional(),
  value: optionalMoney,
  notes: z.string().trim().min(2, "Informe uma observação").max(5000),
}).superRefine((input, context) => {
  if (input.hasCampaign && !input.campaignId) context.addIssue({ code: "custom", path: ["campaignId"], message: "Selecione a campanha" });
});

export const patientFollowUpsRouter = router({
  list: protectedProcedure.input(z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional() }).optional()).query(({ input }) => listPatientFollowUps(input?.month)),
  create: protectedProcedure.input(base).mutation(async ({ ctx, input }) => {
    const id = await createPatientFollowUp({ ...input, campaignId: input.hasCampaign ? input.campaignId : null, closingDate: input.closingDate ?? null, closedItem: input.closedItem ?? null, value: input.value?.replace(",", ".") ?? null, createdBy: ctx.user.id });
    await recordManagerAudit({ module: "patient_follow_up", action: "created", entityId: id, patientName: input.patientName, crcName: input.crcName, summary: `Lead inscrito · ${input.hasCampaign ? "com campanha" : "sem campanha"}`, performedBy: ctx.user.id, performedByName: actorName(ctx.user) });
    return { success: true } as const;
  }),
  update: protectedProcedure.input(base.safeExtend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const { id, ...values } = input;
    await updatePatientFollowUp(id, { ...values, campaignId: values.hasCampaign ? values.campaignId : null, closingDate: values.closingDate ?? null, closedItem: values.closedItem ?? null, value: values.value?.replace(",", ".") ?? null }, ctx.user.id);
    await recordManagerAudit({ module: "patient_follow_up", action: "updated", entityId: id, patientName: values.patientName, crcName: values.crcName, summary: "Lead corrigido antes da efetivação", performedBy: ctx.user.id, performedByName: actorName(ctx.user) });
    return { success: true } as const;
  }),
  deleteOne: protectedProcedure.input(z.object({ id: z.number().int().positive(), password: z.string() })).mutation(async ({ ctx, input }) => {
    if (input.password !== "0000") throw new TRPCError({ code: "FORBIDDEN", message: "Senha provisória incorreta" });
    const deleted = await deletePatientFollowUp(input.id);
    await recordManagerAudit({ module: "patient_follow_up", action: "deleted", entityId: deleted.id, patientName: deleted.patientName, crcName: deleted.crcName, summary: "Lead excluído do acompanhamento", performedBy: ctx.user.id, performedByName: actorName(ctx.user) });
    return { success: true } as const;
  }),
  effectivate: protectedProcedure.input(z.object({
    id: z.number().int().positive(),
    commissionDestination: z.enum(["clinic", "marketing", "odontomab"]),
    commissionCrcId: z.string().min(1).max(32),
    closingDate: date,
    closedItem: z.enum(ORTHO_TREATMENTS),
    value: money,
    odontomabPatientType: z.enum(["active", "new"]).optional(),
    insurancePlan: z.enum(ODONTOMAB_INSURANCE_PLANS).optional(),
  })).mutation(async ({ ctx, input }) => {
    const effective = await effectivePatientFollowUp({ ...input, value: input.value.replace(",", "."), effectiveBy: ctx.user.id });
    await recordManagerAudit({ module: input.commissionDestination, action: "effective", entityId: input.id, patientName: effective.patientName, crcName: input.commissionCrcId, summary: `Venda efetivada · destino ${input.commissionDestination}`, performedBy: ctx.user.id, performedByName: actorName(ctx.user) });
    return { success: true } as const;
  }),
});
