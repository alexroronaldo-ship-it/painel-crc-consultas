import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  listOrtoCrcs,
  previewCrcTransfer,
  restoreOrtoCrc,
  transferAndRetireCrc,
} from "../crcTransferDb";
const scope = z.enum(["funnel", "ortho_active", "odontomab"]);
const ids = z
  .object({
    scope,
    sourceId: z.string().min(1).max(32),
    targetId: z.string().min(1).max(32),
  })
  .refine(input => input.sourceId !== input.targetId, {
    message: "Escolha outra CRC de destino",
    path: ["targetId"],
  });
const manager = (role: string) => {
  if (role !== "admin")
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Somente a gerência pode transferir ou reativar CRCs",
    });
};
export const crcTransfersRouter = router({
  ortoList: protectedProcedure
    .input(z.object({ scope: z.enum(["funnel", "ortho_active"]) }))
    .query(({ input }) => listOrtoCrcs(input.scope)),
  preview: protectedProcedure.input(ids).query(({ ctx, input }) => {
    manager(ctx.user.role);
    return previewCrcTransfer(input.scope, input.sourceId, input.targetId);
  }),
  transfer: protectedProcedure
    .input(
      ids.safeExtend({
        password: z.string().max(128),
        revision: z.string().regex(/^[a-f0-9]{64}$/),
        confirmed: z.literal(true),
      })
    )
    .mutation(({ ctx, input }) => {
      manager(ctx.user.role);
      if (input.password !== "0000")
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Senha provisória incorreta",
        });
      return transferAndRetireCrc(
        input.scope,
        input.sourceId,
        input.targetId,
        input.revision,
        ctx.user.id
      );
    }),
  restoreOrto: protectedProcedure
    .input(
      z.object({
        scope: z.enum(["funnel", "ortho_active"]),
        crcId: z.enum(["WISLLAYNI", "JAYZA"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      manager(ctx.user.role);
      await restoreOrtoCrc(input.scope, input.crcId);
      return { success: true } as const;
    }),
});
