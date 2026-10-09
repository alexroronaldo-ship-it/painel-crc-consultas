import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import {
  closures,
  crcTransfers,
  odontomabCrcs,
  ortoCrcStates,
  orthoActivePatients,
  valSales,
} from "../drizzle/schema";
import { getDb } from "./db";
import { lockOrtoStates } from "./crcWriteGuard";

export type TransferScope = "funnel" | "ortho_active" | "odontomab";
const ortoLabels = { WISLLAYNI: "Wisllayny", JAYZA: "JAYZA" } as const;
async function database() {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  return db;
}
type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type Connection = Db | Tx;
export async function listOrtoCrcs(scope: "funnel" | "ortho_active") {
  const db = await database();
  const states = await db
    .select()
    .from(ortoCrcStates)
    .where(eq(ortoCrcStates.scope, scope));
  return Object.entries(ortoLabels).map(([id, name]) => ({
    id,
    name,
    isActive: states.find(row => row.crcId === id)?.isActive ?? true,
  }));
}
export async function assertOrtoCrcActive(
  scope: "funnel" | "ortho_active",
  id: string
) {
  if (!Object.prototype.hasOwnProperty.call(ortoLabels, id))
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "CRC não permitida nesta página",
    });
  const crcs = await listOrtoCrcs(scope);
  if (!crcs.find(crc => crc.id === id)?.isActive)
    throw new TRPCError({
      code: "CONFLICT",
      message:
        "CRC retirada nesta página. Reative o perfil antes de registrar novos dados.",
    });
}
export async function restoreOrtoCrc(
  scope: "funnel" | "ortho_active",
  id: string
) {
  if (!Object.prototype.hasOwnProperty.call(ortoLabels, id))
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "CRC não permitida nesta página",
    });
  const db = await database();
  await db
    .insert(ortoCrcStates)
    .values({ scope, crcId: id, isActive: true })
    .onDuplicateKeyUpdate({
      set: { isActive: true, removedBy: null, removedAtMs: null },
    });
}
function different(sourceId: string, targetId: string) {
  if (sourceId === targetId)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Escolha uma CRC de destino diferente da origem",
    });
}
async function people(
  db: Connection,
  scope: TransferScope,
  sourceId: string,
  targetId: string,
  lock = false
) {
  different(sourceId, targetId);
  if (scope === "odontomab") {
    const query = db
      .select()
      .from(odontomabCrcs)
      .where(inArray(odontomabCrcs.id, [sourceId, targetId]))
      .orderBy(odontomabCrcs.id);
    const rows = await (lock ? query.for("update") : query);
    const source = rows.find(row => row.id === sourceId),
      target = rows.find(row => row.id === targetId);
    if (!source || !target)
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "CRC de origem ou destino não cadastrada na Odontomab",
      });
    if (!target.isActive)
      throw new TRPCError({
        code: "CONFLICT",
        message: "A CRC de destino está retirada. Reative-a ou escolha outra.",
      });
    return { sourceName: source.name, targetName: target.name };
  }
  if (!Object.prototype.hasOwnProperty.call(ortoLabels, sourceId) || !Object.prototype.hasOwnProperty.call(ortoLabels, targetId))
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Escolha CRCs desta página Orto Implante",
    });
  const query = db
    .select()
    .from(ortoCrcStates)
    .where(
      and(
        eq(ortoCrcStates.scope, scope),
        inArray(ortoCrcStates.crcId, [sourceId, targetId])
      )
    )
    .orderBy(ortoCrcStates.crcId);
  const states = lock
    ? await lockOrtoStates(db as Tx, scope, [sourceId, targetId])
    : await query;
  if (states.find(row => row.crcId === targetId)?.isActive === false)
    throw new TRPCError({
      code: "CONFLICT",
      message: "A CRC de destino está retirada nesta página",
    });
  return {
    sourceName: ortoLabels[sourceId as keyof typeof ortoLabels],
    targetName: ortoLabels[targetId as keyof typeof ortoLabels],
  };
}
async function records(
  db: Connection,
  scope: TransferScope,
  sourceId: string,
  lock = false
) {
  if (scope === "odontomab") {
    const query = db
      .select()
      .from(valSales)
      .where(eq(valSales.crcId, sourceId))
      .orderBy(valSales.id);
    return lock ? query.for("update") : query;
  }
  if (scope === "funnel") {
    const query = db
      .select()
      .from(closures)
      .where(eq(closures.crcName, sourceId))
      .orderBy(closures.id);
    return lock ? query.for("update") : query;
  }
  const query = db
    .select()
    .from(orthoActivePatients)
    .where(eq(orthoActivePatients.crcName, sourceId))
    .orderBy(orthoActivePatients.id);
  return lock ? query.for("update") : query;
}
/** Dinheiro em centavos exatos; IDs e conteúdo compõem o resumo confirmado. */
export function transferSnapshot(
  rows: Array<{ id: number; value: string }>,
  context: object
) {
  const cents = rows.reduce((sum, row) => {
    const [whole, fraction = ""] = row.value.split(".");
    return (
      sum +
      BigInt(whole) * BigInt(100) +
      BigInt(fraction.padEnd(2, "0").slice(0, 2))
    );
  }, BigInt(0));
  const totalValue = `${cents / BigInt(100)}.${String(cents % BigInt(100)).padStart(2, "0")}`;
  const revision = createHash("sha256")
    .update(JSON.stringify({ context, rows }))
    .digest("hex");
  return { recordCount: rows.length, totalValue, revision };
}
export async function previewCrcTransfer(
  scope: TransferScope,
  sourceId: string,
  targetId: string
) {
  const db = await database();
  const names = await people(db, scope, sourceId, targetId);
  const rows = await records(db, scope, sourceId);
  return {
    ...names,
    ...transferSnapshot(rows, { scope, sourceId, targetId, ...names }),
  };
}
export async function transferAndRetireCrc(
  scope: TransferScope,
  sourceId: string,
  targetId: string,
  revision: string,
  performedBy: number
) {
  const db = await database();
  return db.transaction(async tx => {
    const names = await people(tx, scope, sourceId, targetId, true);
    const rows = await records(tx, scope, sourceId, true);
    const snapshot = transferSnapshot(rows, {
      scope,
      sourceId,
      targetId,
      ...names,
    });
    if (snapshot.revision !== revision)
      throw new TRPCError({
        code: "CONFLICT",
        message:
          "Os registros ou nomes mudaram. Atualize o resumo antes de confirmar a transferência.",
      });
    const performedAtMs = Date.now();
    if (scope === "odontomab") {
      await tx
        .update(valSales)
        .set({ crcId: targetId })
        .where(eq(valSales.crcId, sourceId));
      await tx
        .update(odontomabCrcs)
        .set({
          isActive: false,
          removedBy: performedBy,
          removedAt: new Date(performedAtMs),
        })
        .where(eq(odontomabCrcs.id, sourceId));
    } else {
      if (scope === "funnel")
        await tx
          .update(closures)
          .set({ crcName: targetId })
          .where(eq(closures.crcName, sourceId));
      else
        await tx
          .update(orthoActivePatients)
          .set({ crcName: targetId })
          .where(eq(orthoActivePatients.crcName, sourceId));
      await tx
        .insert(ortoCrcStates)
        .values({
          scope,
          crcId: sourceId,
          isActive: false,
          removedBy: performedBy,
          removedAtMs: performedAtMs,
        })
        .onDuplicateKeyUpdate({
          set: {
            isActive: false,
            removedBy: performedBy,
            removedAtMs: performedAtMs,
          },
        });
    }
    await tx
      .insert(crcTransfers)
      .values({
        scope,
        sourceId,
        targetId,
        ...names,
        recordCount: snapshot.recordCount,
        totalValue: snapshot.totalValue,
        recordIds: JSON.stringify(rows.map(row => row.id)),
        performedBy,
        performedAtMs,
      });
    return {
      success: true as const,
      recordCount: snapshot.recordCount,
      totalValue: snapshot.totalValue,
      ...names,
    };
  });
}
