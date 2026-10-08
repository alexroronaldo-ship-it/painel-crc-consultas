import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ODONTOMAB_INSURANCE_PLANS } from "../../shared/odontomab";
import { protectedProcedure, router } from "../_core/trpc";
import { createValSale, deleteValSale, getValSale, listValSales, saveValPatientPhoto, updateValSale } from "../db";
import { storagePut } from "../storage";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data da venda").refine(value => !Number.isNaN(Date.parse(`${value}T12:00:00`)) && new Date(`${value}T12:00:00`).toISOString().slice(0, 10) === value, "Data inválida");
const patientInput = z.object({
  patientName: z.string().trim().min(2, "Informe o nome do paciente").max(160),
  phone: z.string().trim().max(40).optional(),
  patientType: z.enum(["active", "new"], { error: "Selecione paciente Ativo ou Novo" }),
  saleDate: date,
  value: z.string().regex(/^\d{1,10}(,\d{1,2})?$/, "Informe um valor válido"),
  totalTimeSeconds: z.number().int().min(0).max(86400).default(0),
  insurancePlan: z.enum(ODONTOMAB_INSURANCE_PLANS, { error: "Selecione um convênio da lista" }),
  notes: z.string().trim().max(1000).optional(),
});

export const odontomabRouter = router({
  list: protectedProcedure.input(z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional() }).optional()).query(async ({ input }) => {
    const rows = await listValSales(input?.month);
    return rows.map(({ photoKey: _privateKey, ...row }) => row);
  }),
  create: protectedProcedure.input(patientInput).mutation(async ({ ctx, input }) => {
    await createValSale({ ...input, phone: input.phone || null, value: input.value.replace(",", "."), createdBy: ctx.user.id });
    return { success: true } as const;
  }),
  update: protectedProcedure.input(patientInput.extend({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const { id, ...values } = input;
    await updateValSale(id, { ...values, phone: values.phone || null, notes: values.notes || null, value: values.value.replace(",", ".") });
    return { success: true } as const;
  }),
  deleteOne: protectedProcedure.input(z.object({ id: z.number().int().positive(), password: z.string() })).mutation(async ({ input }) => {
    if (input.password !== "0000") throw new TRPCError({ code: "FORBIDDEN", message: "Senha provisória incorreta" });
    await deleteValSale(input.id);
    return { success: true } as const;
  }),
  uploadPatientPhoto: protectedProcedure.input(z.object({
    id: z.number().int().positive(), mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
    base64: z.string().min(1).max(2_800_000).regex(/^[A-Za-z0-9+/]+={0,2}$/, "Arquivo inválido"),
  })).mutation(async ({ ctx, input }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Somente a gerência pode alterar fotos" });
    await getValSale(input.id);
    const bytes = Buffer.from(input.base64, "base64");
    if (!bytes.length || bytes.length > 2 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "A foto deve ter até 2 MB" });
    const png = bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
    const jpeg = bytes.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex"));
    const webp = bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
    const extension = input.mimeType === "image/png" && png ? "png" : input.mimeType === "image/jpeg" && jpeg ? "jpg" : input.mimeType === "image/webp" && webp ? "webp" : null;
    if (!extension) throw new TRPCError({ code: "BAD_REQUEST", message: "Use uma foto JPG, PNG ou WebP válida" });
    const { key, url } = await storagePut(`odontomab-patients/${input.id}/photo.${extension}`, bytes, input.mimeType);
    await saveValPatientPhoto(input.id, key, url);
    return { success: true, photoUrl: url } as const;
  }),
});
