import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { createActiveCampaign, createActivePatient, deleteActivePatient, deleteEmptyActiveCampaign, listActiveCampaigns, listActiveGoals, listActivePatients, listActiveWeeks, saveActiveAppointments, saveActiveGoal, saveActiveTasks, updateActiveCampaign, updateActivePatientTime } from "../orthoActiveDb";

import { assertOrtoCrcActive } from "../crcTransferDb";

export const activeCrcNames = ["WISLLAYNI", "JAYZA"] as const;
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida").refine(value => !Number.isNaN(Date.parse(`${value}T12:00:00`)) && new Date(`${value}T12:00:00`).toISOString().slice(0, 10) === value, "Data inexistente");
const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Informe um mês válido");
const money = z.string().regex(/^\d{1,10}(?:,\d{1,2})?$/, "Informe um valor em reais (ex.: 1500,00)");
const positiveMoney = money.refine(value => Number(value.replace(",", ".")) > 0, "Informe um valor maior que zero");
const crc = z.enum(activeCrcNames);
const limitedCount = z.number().int().min(0).max(100000);
const passwordInput = z.object({ id: z.number().int().positive(), password: z.string() });
const checkPassword = (password: string) => { if (password !== "0000") throw new TRPCError({ code: "FORBIDDEN", message: "Senha provisória incorreta" }); };
const requireManager = (role: string) => { if (role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Somente a gerência pode alterar metas e campanhas" }); };
const campaignInput = z.object({
  name: z.string().trim().min(2).max(160), origin: z.string().trim().min(2).max(160),
  startDate: date, endDate: date.optional(), weeklyGoal: positiveMoney.optional(),
}).refine(input => !input.endDate || input.endDate >= input.startDate, { message: "Fim anterior ao início", path: ["endDate"] });
const weekBase = z.object({ crcName: crc, month, week: z.number().int().min(1).max(5) });

export const orthoActiveRouter = router({
  patients: router({
    list: protectedProcedure.input(z.object({ month: month.optional() })).query(({ input }) => listActivePatients(input.month)),
    create: protectedProcedure.input(z.object({
      crcName: crc, patientName: z.string().trim().min(2).max(160), phone: z.string().trim().min(8).max(40),
      contactChannel: z.enum(["WhatsApp", "Ligação", "Presencial", "Instagram"]),
      reference: z.string().trim().min(1).max(160),
      closingDate: date, closedItem: z.string().trim().min(2).max(5000), value: money,
      totalTimeSeconds: z.number().int().min(0).max(86400).default(0),
      internalStatus: z.enum(["closed", "follow_up", "not_closed"]), internalNotes: z.string().trim().max(5000).optional(),
      campaignId: z.number().int().positive().optional(),
    })).mutation(async ({ ctx, input }) => {
      await assertOrtoCrcActive("ortho_active", input.crcName);
      await createActivePatient({ ...input, value: input.value.replace(",", "."), createdBy: ctx.user.id });
      return { success: true } as const;
    }),
    deleteOne: protectedProcedure.input(passwordInput).mutation(async ({ input }) => {
      checkPassword(input.password);
      await deleteActivePatient(input.id);
      return { success: true } as const;
    }),
    updateTime: protectedProcedure.input(z.object({ id: z.number().int().positive(), totalTimeSeconds: z.number().int().min(0).max(86400) })).mutation(async ({ input }) => {
      await updateActivePatientTime(input.id, input.totalTimeSeconds);
      return { success: true } as const;
    }),
  }),
  campaigns: router({
    list: protectedProcedure.query(() => listActiveCampaigns()),
    create: protectedProcedure.input(campaignInput).mutation(async ({ ctx, input }) => {
      await createActiveCampaign({ ...input, weeklyGoal: input.weeklyGoal?.replace(",", ".") ?? null, createdBy: ctx.user.id });
      return { success: true } as const;
    }),
    update: protectedProcedure.input(campaignInput.safeExtend({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      requireManager(ctx.user.role);
      if (input.endDate && input.endDate < input.startDate) throw new TRPCError({ code: "BAD_REQUEST", message: "Fim anterior ao início" });
      await updateActiveCampaign(input.id, { name: input.name, origin: input.origin, startDate: input.startDate, endDate: input.endDate ?? null, weeklyGoal: input.weeklyGoal?.replace(",", ".") ?? null });
      return { success: true } as const;
    }),
    deleteOne: protectedProcedure.input(passwordInput).mutation(async ({ ctx, input }) => {
      requireManager(ctx.user.role); checkPassword(input.password);
      await deleteEmptyActiveCampaign(input.id);
      return { success: true } as const;
    }),
  }),
  goals: router({
    list: protectedProcedure.input(z.object({ month })).query(({ input }) => listActiveGoals(input.month)),
    save: protectedProcedure.input(z.object({ crcName: crc, month, monthlyGoal: positiveMoney.optional(), weeklySalesGoal: positiveMoney.optional(), timeGoalSeconds: z.number().int().min(1).max(86400).optional() })).mutation(async ({ ctx, input }) => {
      requireManager(ctx.user.role);
      await assertOrtoCrcActive("ortho_active", input.crcName);
      await saveActiveGoal({ crcName: input.crcName, month: input.month, monthlyGoal: input.monthlyGoal?.replace(",", ".") ?? null, weeklySalesGoal: input.weeklySalesGoal?.replace(",", ".") ?? null, timeGoalSeconds: input.timeGoalSeconds ?? null, updatedBy: ctx.user.id });
      return { success: true } as const;
    }),
  }),
  weekly: router({
    list: protectedProcedure.input(z.object({ month })).query(({ input }) => listActiveWeeks(input.month)),
    saveTasks: protectedProcedure.input(weekBase.extend({ taskCount: limitedCount, taskGoal: z.number().int().min(1).max(100000).optional(), description: z.string().trim().max(5000).optional() })).mutation(async ({ ctx, input }) => {
      await assertOrtoCrcActive("ortho_active", input.crcName);
      await saveActiveTasks({ ...input, taskGoal: input.taskGoal ?? null, description: input.description ?? null, updatedBy: ctx.user.id });
      return { success: true } as const;
    }),
    saveAppointments: protectedProcedure.input(weekBase.extend({ appointmentCount: limitedCount, appointmentGoal: z.number().int().min(1).max(100000).optional() })).mutation(async ({ ctx, input }) => {
      await assertOrtoCrcActive("ortho_active", input.crcName);
      await saveActiveAppointments({ ...input, appointmentGoal: input.appointmentGoal ?? null, updatedBy: ctx.user.id });
      return { success: true } as const;
    }),
  }),
});
