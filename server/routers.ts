import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createClosure, deleteAllClosures, listClosures } from "./db";

const crcNames = ["WISLLAYNI", "JAYZA"] as const;

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
    list: protectedProcedure.query(() => listClosures()),
    clearTestData: protectedProcedure
      .input(z.object({ password: z.string() }))
      .mutation(async ({ input }) => {
        if (input.password !== "0000") throw new Error("Senha provisória incorreta");
        await deleteAllClosures();
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
    })).mutation(async ({ ctx, input }) => {
      await createClosure({ ...input, value: input.value.replace(",", "."), createdBy: ctx.user.id });
      return { success: true } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
