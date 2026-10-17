import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { managerProcedure, router } from "../_core/trpc";
import { getManagerDashboard } from "../managerDb";
import { renameManagerCrcSlot } from "../managerSlotsDb";

const MANAGER_PASSWORD = "0000";

export const managerRouter = router({
  dashboard: managerProcedure
    .input(z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), password: z.string().max(128) }))
    .query(async ({ input }) => {
      if (input.password !== MANAGER_PASSWORD) throw new TRPCError({ code: "FORBIDDEN", message: "Senha da gerente incorreta" });
      return getManagerDashboard(input.month);
    }),
  renameSlot: managerProcedure
    .input(z.object({ slot: z.number().int().min(1).max(5), name: z.string().trim().min(2).max(160) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Somente a administração pode renomear vagas de CRC" });
      await renameManagerCrcSlot(input.slot, input.name, ctx.user.id);
      return { success: true as const };
    }),
});
