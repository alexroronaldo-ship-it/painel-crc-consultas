import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createCampaign, createClosure, createValSale, deleteClosure, deleteValSale, listCampaigns, listClosures, listCrcWeeklyActivities, listCrcWeeklyAppointments, listValSales, saveCrcWeeklyActivity, saveCrcWeeklyAppointment, updateClosureTime } from "./db";

const crcNames = ["WISLLAYNI", "JAYZA"] as const;
const weeklyActivityNames = ["WISLLAYNI", "JAYZA", "VAL"] as const;

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
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
      await saveCrcWeeklyActivity({ ...input, createdBy: ctx.user.id });
      return { success: true } as const;
    }),
  }),
  weeklyAppointments: router({
    list: protectedProcedure
      .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }))
      .query(({ input }) => listCrcWeeklyAppointments(input.month)),
    save: protectedProcedure.input(z.object({
      crcName: z.enum(crcNames),
      month: z.string().regex(/^\d{4}-\d{2}$/),
      week: z.number().int().min(1).max(5),
      appointmentCount: z.number().int().min(0).max(100000),
      weeklyGoal: z.number().int().min(1).max(100000),
    })).mutation(async ({ ctx, input }) => {
      await saveCrcWeeklyAppointment({ ...input, createdBy: ctx.user.id });
      return { success: true } as const;
    }),
  }),
  campaigns: router({
    list: protectedProcedure.query(() => listCampaigns()),
    create: protectedProcedure.input(z.object({
      name: z.string().trim().min(2, "Informe o nome da campanha").max(160),
      origin: z.string().trim().min(2, "Informe a origem da campanha").max(160),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data de início"),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data final válida").optional(),
      weeklyGoal: z.string().regex(/^\d+(,\d{1,2})?$/, "Informe uma meta semanal válida"),
    })).mutation(async ({ ctx, input }) => {
      if (input.endDate && input.endDate < input.startDate) throw new Error("A data final deve ser igual ou posterior à data inicial");
      await createCampaign({ ...input, weeklyGoal: input.weeklyGoal.replace(",", "."), createdBy: ctx.user.id });
      return { success: true } as const;
    }),
  }),
  valSales: router({
    list: protectedProcedure
      .input(z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional() }).optional())
      .query(({ input }) => listValSales(input?.month)),
    create: protectedProcedure.input(z.object({
      saleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data da venda"),
      value: z.string().regex(/^\d+(,\d{1,2})?$/, "Informe um valor válido"),
      notes: z.string().trim().max(1000).optional(),
    })).mutation(async ({ ctx, input }) => {
      await createValSale({ ...input, value: input.value.replace(",", "."), createdBy: ctx.user.id });
      return { success: true } as const;
    }),
    deleteOne: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), password: z.string() }))
      .mutation(async ({ input }) => {
        if (input.password !== "0000") throw new Error("Senha provisória incorreta");
        await deleteValSale(input.id);
        return { success: true } as const;
      }),
  }),
});

export type AppRouter = typeof appRouter;
