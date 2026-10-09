import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { odontomabCrcs, ortoCrcStates } from "../drizzle/schema";
import { getDb } from "./db";
import type { TransferScope } from "./crcTransferDb";
type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
export type WriteTx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export async function lockOrtoStates(
  tx: WriteTx,
  scope: "funnel" | "ortho_active",
  ids: string[]
) {
  for (const id of Array.from(new Set(ids)).sort()) {
    if (!["WISLLAYNI", "JAYZA"].includes(id))
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "CRC não permitida nesta página",
      });
    await tx
      .insert(ortoCrcStates)
      .values({ scope, crcId: id, isActive: true })
      .onDuplicateKeyUpdate({ set: { crcId: id } });
  }
  return tx
    .select()
    .from(ortoCrcStates)
    .where(
      and(eq(ortoCrcStates.scope, scope), inArray(ortoCrcStates.crcId, ids))
    )
    .orderBy(ortoCrcStates.crcId)
    .for("update");
}
export async function withActiveCrcWrite<T>(
  scope: TransferScope,
  id: string,
  work: (tx: WriteTx) => Promise<T>
) {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  return db.transaction(async tx => {
    if (scope === "odontomab") {
      const [crc] = await tx
        .select()
        .from(odontomabCrcs)
        .where(eq(odontomabCrcs.id, id))
        .for("update");
      if (!crc)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "CRC não cadastrada",
        });
      if (!crc.isActive)
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "CRC retirada. Reative o perfil antes de registrar novos dados.",
        });
    } else {
      const [crc] = await lockOrtoStates(tx, scope, [id]);
      if (!crc?.isActive)
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "CRC retirada nesta página. Reative o perfil antes de registrar novos dados.",
        });
    }
    return work(tx);
  });
}
