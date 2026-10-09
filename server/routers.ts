import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createCampaign, createClosure, deleteClosure, deleteEmptyCampaign, listCampaigns, listCampaignUsage, listClosures, listCrcProfiles, listCrcWeeklyActivities, listCrcWeeklyAppointments, mergeCampaigns, saveCrcPhoto, saveCrcWeeklyActivity, saveCrcWeeklyAppointment, updateCampaign, updateClosureTime } from "./db";
import { storagePut } from "./storage";
import { orthoActiveRouter } from "./routers/orthoActive";
import { odontomabRouter } from "./routers/odontomab";
import { crcTransfersRouter } from "./routers/crcTransfers";
import { assertOrtoCrcActive } from "./crcTransferDb";

const crcNames = ["WISLLAYNI", "JAYZA"] as const;
const weeklyActivityNames = ["WISLLAYNI", "JAYZA", "VAL"] as const;
const campaignInput = z.object({
  name: z.string().trim().min(2, "Informe o nome da campanha").max(160),
  origin: z.string().trim().min(2, "Informe a origem da campanha").max(160),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data de início"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data final válida").optional(),
  weeklyGoal: z.string().regex(/^\d+(,\d{1,2})?$/, "Informe uma meta semanal válida"),
});
const assertCampaignDates = (input: { startDate: string; endDate?: string }) => {
  if (input.endDate && input.endDate < input.startDate) throw new Error("A data final deve ser igual ou posterior à data inicial");
};
const assertManager = (role: string) => {
  if (role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Somente a gerência pode alterar campanhas" });
};

export const appRouter = router({
  system: systemRouter,
  orthoActive: orthoActiveRouter,
  crcTransfers: crcTransfersRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  crcProfiles: router({
    list: protectedProcedure.query(() => listCrcProfiles()),
    uploadPhoto: protectedProcedure.input(z.object({
      crcName: z.enum(weeklyActivityNames),
      mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
      base64: z.string().min(1).max(2_800_000).regex(/^[A-Za-z0-9+/]+={0,2}$/, "Arquivo inválido"),
    })).mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Somente a gerência pode alterar fotos" });
      const bytes = Buffer.from(input.base64, "base64");
      if (!bytes.length || bytes.length > 2 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "A foto deve ter até 2 MB" });
      const png = bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
      const jpeg = bytes.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex"));
      const webp = bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
      const extension = input.mimeType === "image/png" && png ? "png" : input.mimeType === "image/jpeg" && jpeg ? "jpg" : input.mimeType === "image/webp" && webp ? "webp" : null;
      if (!extension) throw new TRPCError({ code: "BAD_REQUEST", message: "Use uma foto JPG, PNG ou WebP válida" });
      const { key, url } = await storagePut(`crc-profiles/${input.crcName.toLowerCase()}/portrait.${extension}`, bytes, input.mimeType);
      await saveCrcPhoto({ crcName: input.crcName, photoKey: key, photoUrl: url, updatedBy: ctx.user.id });
      return { success: true, photoUrl: url } as const;
    }),
  }),
  closures: router({
    list: protectedProcedure
      .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional() }).optional())
      .query(({ input }) => listClosures(input?.month)),
    deleteOne: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), password: z.string() }))
      .mutation(async ({ input }) => {
        if (input.password !== "0000") throw new Error("Senha provisória incorreta");
        await deleteClosure(input.id);
        return { success: true } as const;
      }),
    updateTime: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), totalTimeSeconds: z.number().int().min(0).max(86400) }))
      .mutation(async ({ input }) => {
        await updateClosureTime(input.id, input.totalTimeSeconds);
        return { success: true } as const;
      }),
    create: protectedProcedure.input(z.object({
      crcName: z.enum(crcNames),
      patientName: z.string().trim().min(2, "Informe o nome do paciente").max(160),
      phone: z.string().trim().min(8, "Informe um telefone válido").max(40),
      closingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data do fechamento"),
      closedItem: z.string().trim().min(2, "Informe o que foi fechado").max(5000),
      value: z.string().regex(/^\d+(,\d{1,2})?$/, "Informe um valor válido"),
      totalTimeSeconds: z.number().int().min(0).max(86400),
      internalStatus: z.enum(["closed", "follow_up", "not_closed"]),
      internalNotes: z.string().trim().max(5000).optional(),
      nextStep: z.string().trim().max(500).optional(),
      internalClosingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data interna válida").optional(),
      campaignId: z.number().int().positive().optional(),
      leadOrigin: z.string().trim().min(2, "Informe a origem do lead").max(160).optional(),
    })).mutation(async ({ ctx, input }) => {
      await assertOrtoCrcActive("funnel", input.crcName);
      await createClosure({ ...input, value: input.value.replace(",", "."), createdBy: ctx.user.id });
      return { success: true } as const;
    }),
  }),
  weeklyActivities: router({
    list: protectedProcedure
      .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
      .query(({ input }) => listCrcWeeklyActivities(input.month)),
    save: protectedProcedure.input(z.object({
      crcName: z.enum(weeklyActivityNames),
      month: z.string().regex(/^\d{4}-\d{2}$/),
      week: z.number().int().min(1).max(5),
      taskCount: z.number().int().min(0).max(100000),
      description: z.string().trim().min(2, "Descreva as tarefas realizadas").max(5000),
    })).mutation(async ({ ctx, input }) => {
      if (input.crcName !== "VAL") await assertOrtoCrcActive("funnel", input.crcName);
      await saveCrcWeeklyActivity({ ...input, createdBy: ctx.user.id });
      return { success: true } as const;
    }),
  }),
  weeklyAppointments: router({
    list: protectedProcedure
      .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
      .query(({ input }) => listCrcWeeklyAppointments(input.month)),
    save: protectedProcedure.input(z.object({
      crcName: z.enum(weeklyActivityNames),
      month: z.string().regex(/^\d{4}-\d{2}$/),
      week: z.number().int().min(1).max(5),
      appointmentCount: z.number().int().min(0).max(100000),
      weeklyGoal: z.number().int().min(1).max(100000),
    })).mutation(async ({ ctx, input }) => {
      if (input.crcName !== "VAL") await assertOrtoCrcActive("funnel", input.crcName);
      await saveCrcWeeklyAppointment({ ...input, createdBy: ctx.user.id });
      return { success: true } as const;
    }),
  }),
  campaigns: router({
    list: protectedProcedure.query(() => listCampaigns()),
    usage: protectedProcedure.query(() => listCampaignUsage()),
    create: protectedProcedure.input(campaignInput).mutation(async ({ ctx, input }) => {
      assertCampaignDates(input);
      await createCampaign({ ...input, weeklyGoal: input.weeklyGoal.replace(",", "."), createdBy: ctx.user.id });
      return { success: true } as const;
    }),
    update: protectedProcedure.input(campaignInput.extend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      assertManager(ctx.user.role);
      assertCampaignDates(input);
      const { id, ...values } = input;
      await updateCampaign(id, { ...values, endDate: values.endDate ?? null, weeklyGoal: values.weeklyGoal.replace(",", ".") });
      return { success: true } as const;
    }),
    deleteOne: protectedProcedure.input(z.object({ id: z.number().int().positive(), password: z.string() })).mutation(async ({ ctx, input }) => {
      assertManager(ctx.user.role);
      if (input.password !== "0000") throw new TRPCError({ code: "FORBIDDEN", message: "Senha provisória incorreta" });
      await deleteEmptyCampaign(input.id);
      return { success: true } as const;
    }),
    merge: protectedProcedure.input(z.object({ sourceId: z.number().int().positive(), targetId: z.number().int().positive(), password: z.string() })).mutation(async ({ ctx, input }) => {
      assertManager(ctx.user.role);
      if (input.password !== "0000") throw new TRPCError({ code: "FORBIDDEN", message: "Senha provisória incorreta" });
      await mergeCampaigns(input.sourceId, input.targetId);
      return { success: true } as const;
    }),
  }),
  valSales: odontomabRouter,
});

export type AppRouter = typeof appRouter;
