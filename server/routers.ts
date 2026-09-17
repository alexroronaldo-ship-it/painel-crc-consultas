import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createPatientIntake, listPatientIntakes } from "./db";

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
  patientIntakes: router({
    list: protectedProcedure.query(() => listPatientIntakes()),
    create: protectedProcedure
      .input(
        z.object({
          patientName: z.string().trim().min(2, "Informe o nome do paciente").max(160),
          phone: z.string().trim().min(8, "Informe um telefone válido").max(40),
          firstConsultationRequest: z.string().trim().min(2, "Informe o interesse inicial").max(5000),
          scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data da consulta"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await createPatientIntake({ ...input, createdBy: ctx.user.id });
        return { success: true } as const;
      }),
  }),
});

export type AppRouter = typeof appRouter;
