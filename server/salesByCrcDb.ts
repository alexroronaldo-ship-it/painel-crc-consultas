import { listClosures, listValSales } from "./db";
import { listOdontomabCrcs } from "./odontomabCrcDb";
import { listActivePatients } from "./orthoActiveDb";

export const SALES_BY_CRC_GOAL = 75_000;

type RawSale = {
  crcName: string;
  value: string | number;
  module: "marketing" | "clinic" | "odontomab";
};

export type SalesByCrcRow = {
  id: string;
  name: string;
  totalSold: number;
  goal: number;
  percentOfGoal: number;
  remaining: number;
  surplus: number;
  saleCount: number;
  modules: string[];
};

const normalizeName = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
const displayFixedCrc = (value: string) => value === "WISLLAYNI" ? "Wisllayny" : value === "JAYZA" ? "JAYZA" : value === "VAL" ? "Vivi" : value;

export function aggregateSalesByCrc(sales: RawSale[], goal = SALES_BY_CRC_GOAL, knownNames: string[] = []): SalesByCrcRow[] {
  const grouped = new Map<string, { id: string; name: string; totalSold: number; saleCount: number; modules: Set<string> }>();
  for (const knownName of knownNames) {
    const name = displayFixedCrc(knownName);
    const key = normalizeName(name);
    if (!grouped.has(key)) grouped.set(key, { id: key, name, totalSold: 0, saleCount: 0, modules: new Set<string>() });
  }
  for (const sale of sales) {
    const name = displayFixedCrc(sale.crcName);
    const key = normalizeName(name);
    const current = grouped.get(key) ?? { id: key, name, totalSold: 0, saleCount: 0, modules: new Set<string>() };
    current.totalSold += Number(sale.value) || 0;
    current.saleCount += 1;
    current.modules.add(sale.module);
    grouped.set(key, current);
  }
  return Array.from(grouped.values())
    .map(row => ({
      id: row.id,
      name: row.name,
      totalSold: row.totalSold,
      goal,
      percentOfGoal: goal > 0 ? row.totalSold / goal * 100 : 0,
      remaining: Math.max(0, goal - row.totalSold),
      surplus: Math.max(0, row.totalSold - goal),
      saleCount: row.saleCount,
      modules: Array.from(row.modules),
    }))
    .sort((a, b) => b.totalSold - a.totalSold || a.name.localeCompare(b.name, "pt-BR"));
}

export async function getSalesByCrc(month?: string) {
  const [marketing, clinic, odontomab, odontomabCrcs] = await Promise.all([
    listClosures(month),
    listActivePatients(month),
    listValSales(month),
    listOdontomabCrcs(),
  ]);
  const odontomabNames = new Map(odontomabCrcs.map(crc => [crc.id, crc.name]));
  const sales: RawSale[] = [
    ...marketing.map(row => ({ crcName: row.crcName, value: row.value, module: "marketing" as const })),
    ...clinic.map(row => ({ crcName: row.crcName, value: row.value, module: "clinic" as const })),
    ...odontomab.map(row => ({ crcName: odontomabNames.get(row.crcId) ?? (row.crcId === "VAL" ? "Vivi" : row.crcId), value: row.value, module: "odontomab" as const })),
  ];
  const knownNames = ["WISLLAYNI", "JAYZA", ...odontomabCrcs.map(crc => crc.id === "VAL" ? "Vivi" : crc.name)];
  const rows = aggregateSalesByCrc(sales, SALES_BY_CRC_GOAL, knownNames);
  return {
    month: month ?? null,
    goal: SALES_BY_CRC_GOAL,
    rows,
    totalSold: rows.reduce((sum, row) => sum + row.totalSold, 0),
    totalCrcs: rows.length,
  };
}
