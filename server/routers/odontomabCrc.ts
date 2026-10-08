import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createOdontomabCrc, listOdontomabCrcs, renameOdontomabCrc, requireOdontomabCrc, saveOdontomabCrcPhoto } from "../odontomabCrcDb";
import { listCrcWeeklyActivities, listCrcWeeklyAppointments, saveCrcWeeklyActivity, saveCrcWeeklyAppointment } from "../db";
import { storagePut } from "../storage";

const id = z.string().min(1).max(32);
const name = z.string().trim().min(2, "Informe o nome da CRC").max(160);
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const weekBase = z.object({ crcId: id, month, week: z.number().int().min(1).max(5) });
const manager = (role: string) => { if (role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Somente a gerência pode cadastrar e alterar CRCs" }); };
export const odontomabCrcRouter = router({
  list: protectedProcedure.query(() => listOdontomabCrcs()),
  create: protectedProcedure.input(z.object({ name })).mutation(async ({ ctx, input }) => { manager(ctx.user.role); return createOdontomabCrc(input.name, ctx.user.id); }),
  rename: protectedProcedure.input(z.object({ id, name })).mutation(async ({ ctx, input }) => { manager(ctx.user.role); await renameOdontomabCrc(input.id, input.name); return { success: true } as const; }),
  uploadPhoto: protectedProcedure.input(z.object({ id, mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), base64: z.string().min(1).max(2_800_000).regex(/^[A-Za-z0-9+/]+={0,2}$/) })).mutation(async ({ ctx, input }) => {
    manager(ctx.user.role); await requireOdontomabCrc(input.id);
    const bytes = Buffer.from(input.base64, "base64");
    if (!bytes.length || bytes.length > 2 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "A foto deve ter até 2 MB" });
    const png = bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
    const jpeg = bytes.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex"));
    const webp = bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
    const ext = input.mimeType === "image/png" && png ? "png" : input.mimeType === "image/jpeg" && jpeg ? "jpg" : input.mimeType === "image/webp" && webp ? "webp" : null;
    if (!ext) throw new TRPCError({ code: "BAD_REQUEST", message: "Use uma foto JPG, PNG ou WebP válida" });
    const { key, url } = await storagePut(`odontomab-crcs/${input.id}/portrait.${ext}`, bytes, input.mimeType);
    await saveOdontomabCrcPhoto(input.id, key, url);
    return { success: true, photoUrl: url } as const;
  }),
  tasks: router({
    list: protectedProcedure.input(z.object({ crcId: id, month })).query(async ({ input }) => { await requireOdontomabCrc(input.crcId); return (await listCrcWeeklyActivities(input.month)).filter(row => row.crcName === input.crcId); }),
    save: protectedProcedure.input(weekBase.extend({ taskCount: z.number().int().min(0).max(100000), description: z.string().trim().min(2).max(5000) })).mutation(async ({ ctx, input }) => { await requireOdontomabCrc(input.crcId); await saveCrcWeeklyActivity({ crcName: input.crcId, month: input.month, week: input.week, taskCount: input.taskCount, description: input.description, createdBy: ctx.user.id }); return { success: true } as const; }),
  }),
  appointments: router({
    list: protectedProcedure.input(z.object({ crcId: id, month })).query(async ({ input }) => { await requireOdontomabCrc(input.crcId); return (await listCrcWeeklyAppointments(input.month)).filter(row => row.crcName === input.crcId); }),
    save: protectedProcedure.input(weekBase.extend({ appointmentCount: z.number().int().min(0).max(100000), weeklyGoal: z.number().int().min(1).max(100000) })).mutation(async ({ ctx, input }) => { await requireOdontomabCrc(input.crcId); await saveCrcWeeklyAppointment({ crcName: input.crcId, month: input.month, week: input.week, appointmentCount: input.appointmentCount, weeklyGoal: input.weeklyGoal, createdBy: ctx.user.id }); return { success: true } as const; }),
  }),
});
