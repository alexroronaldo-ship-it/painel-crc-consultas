import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getSalesByCrc } from "../salesByCrcDb";

const month = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Informe um mês válido");

export const salesByCrcRouter = router({
  summary: protectedProcedure.input(z.object({ month: month.optional() }).optional()).query(({ input }) => getSalesByCrc(input?.month)),
});
