import { eq } from "drizzle-orm";
import { managerCrcSlots } from "../drizzle/schema";
import { getDb } from "./db";

const DEFAULT_SLOTS = ["Wisllayny", "JAYZA", "Aline", "Vaga 4", "Vaga 5"] as const;

async function database() {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  return db;
}

export async function listManagerCrcSlots() {
  const db = await database();
  const rows = await db.select().from(managerCrcSlots).orderBy(managerCrcSlots.slot);
  return Array.from({ length: DEFAULT_SLOTS.length }, (_, index) => {
    const slot = index + 1;
    return rows.find(row => row.slot === slot) ?? { slot, name: DEFAULT_SLOTS[index], updatedBy: null, updatedAt: new Date(0) };
  });
}

export async function renameManagerCrcSlot(slot: number, name: string, updatedBy: number) {
  const db = await database();
  await db.insert(managerCrcSlots).values({ slot, name: name.trim(), updatedBy }).onDuplicateKeyUpdate({ set: { name: name.trim(), updatedBy } });
}
