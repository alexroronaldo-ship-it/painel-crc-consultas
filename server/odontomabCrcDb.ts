import { eq, and, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { odontomabCrcs } from "../drizzle/schema";
import { getDb } from "./db";

export const normalizeCrcName = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
async function db() { const instance = await getDb(); if (!instance) throw new Error("Banco indisponível"); return instance; }
export async function listOdontomabCrcs() {
  const instance = await db();
  const rows = await instance.select({ id: odontomabCrcs.id, name: odontomabCrcs.name, photoUrl: odontomabCrcs.photoUrl }).from(odontomabCrcs).orderBy(odontomabCrcs.createdAt, odontomabCrcs.name);
  return rows.sort((a, b) => a.id === "VAL" ? -1 : b.id === "VAL" ? 1 : 0);
}
export async function requireOdontomabCrc(id: string) {
  const instance = await db();
  const [crc] = await instance.select().from(odontomabCrcs).where(eq(odontomabCrcs.id, id)).limit(1);
  if (!crc) throw new TRPCError({ code: "NOT_FOUND", message: "CRC não cadastrada na Odontomab" });
  return crc;
}
function duplicateError(error: unknown): never {
  if (/duplicate|unique|1062/i.test(String(error) + String((error as { cause?: unknown })?.cause))) throw new TRPCError({ code: "CONFLICT", message: "Já existe uma CRC com esse nome" });
  throw error;
}
export async function createOdontomabCrc(name: string, createdBy: number) {
  const instance = await db();
  const normalizedName = normalizeCrcName(name);
  const exists = await instance.select({ id: odontomabCrcs.id }).from(odontomabCrcs).where(eq(odontomabCrcs.normalizedName, normalizedName)).limit(1);
  if (exists.length) throw new TRPCError({ code: "CONFLICT", message: "Já existe uma CRC com esse nome" });
  const id = `ODO_${nanoid(20)}`;
  try { await instance.insert(odontomabCrcs).values({ id, name: name.trim().replace(/\s+/g, " "), normalizedName, createdBy }); } catch (error) { duplicateError(error); }
  return { id, name: name.trim().replace(/\s+/g, " ") };
}
export async function renameOdontomabCrc(id: string, name: string) {
  const instance = await db();
  await requireOdontomabCrc(id);
  const normalizedName = normalizeCrcName(name);
  const exists = await instance.select({ id: odontomabCrcs.id }).from(odontomabCrcs).where(and(eq(odontomabCrcs.normalizedName, normalizedName), ne(odontomabCrcs.id, id))).limit(1);
  if (exists.length) throw new TRPCError({ code: "CONFLICT", message: "Já existe uma CRC com esse nome" });
  try { await instance.update(odontomabCrcs).set({ name: name.trim().replace(/\s+/g, " "), normalizedName }).where(eq(odontomabCrcs.id, id)); } catch (error) { duplicateError(error); }
}
export async function saveOdontomabCrcPhoto(id: string, photoKey: string, photoUrl: string) {
  const instance = await db();
  await requireOdontomabCrc(id);
  await instance.update(odontomabCrcs).set({ photoKey, photoUrl }).where(eq(odontomabCrcs.id, id));
}
