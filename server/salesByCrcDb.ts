import { listClosures, listValSales } from "./db";
import { listOdontomabCrcs } from "./odontomabCrcDb";
import { listActiveGoals, listActivePatients } from "./orthoActiveDb";
import { isClinicOrganicReference } from "../shared/orthoReference";
import { isOdontomabSaleCommissionEligible } from "../shared/odontomab";

export const SALES_BY_CRC_GOAL = 75_000;
export const MARKETING_COMMISSION_BEFORE_GOAL = 0.002;
export const MARKETING_COMMISSION_AT_GOAL = 0.005;
export const FIXED_CHANNEL_COMMISSION = 0.002;

export const SALES_CHANNELS = ["marketing", "clinic", "odontomab"] as const;
export type SalesChannel = (typeof SALES_CHANNELS)[number];

export const SALES_CHANNEL_LABELS: Record<SalesChannel, string> = {
  marketing: "Comissão Marketing",
  clinic: "Comissão Clínica",
  odontomab: "Comissão de Vendas Pacientes",
};

export type SourceBreakdown = {
  label: string;
  totalSold: number;
  saleCount: number;
};

type RawSale = {
  crcName: string;
  value: string | number;
  module: SalesChannel;
  source?: string;
  commissionEligible?: boolean;
};

type ChannelBucket = {
  totalSold: number;
  commissionEligibleSold: number;
  saleCount: number;
  sources: Map<string, SourceBreakdown>;
};

export type ChannelSalesSummary = {
  key: SalesChannel;
  label: string;
  totalSold: number;
  goal: number;
  percentOfGoal: number;
  remaining: number;
  surplus: number;
  saleCount: number;
  commissionRate: number;
  commission: number;
  sources: SourceBreakdown[];
};

export type SalesByCrcRow = {
  id: string;
  name: string;
  totalSold: number;
  /** Meta combinada dos três canais; cada canal também expõe sua própria meta. */
  goal: number;
  channelGoal: number;
  percentOfGoal: number;
  remaining: number;
  surplus: number;
  saleCount: number;
  modules: string[];
  totalCommission: number;
  sources: SourceBreakdown[];
  channels: Record<SalesChannel, ChannelSalesSummary>;
};

const normalizeName = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
const displayFixedCrc = (value: string) => value === "WISLLAYNI" ? "Wisllayny" : value === "JAYZA" ? "JAYZA" : value === "VAL" ? "Vivi" : value;
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function emptyBucket(): ChannelBucket {
  return { totalSold: 0, commissionEligibleSold: 0, saleCount: 0, sources: new Map() };
}

function addSale(bucket: ChannelBucket, sale: RawSale) {
  const amount = Number(sale.value) || 0;
  const sourceLabel = sale.source || SALES_CHANNEL_LABELS[sale.module];
  bucket.totalSold = roundMoney(bucket.totalSold + amount);
  if (sale.commissionEligible !== false) bucket.commissionEligibleSold = roundMoney(bucket.commissionEligibleSold + amount);
  bucket.saleCount += 1;
  const source = bucket.sources.get(sourceLabel) ?? { label: sourceLabel, totalSold: 0, saleCount: 0 };
  source.totalSold = roundMoney(source.totalSold + amount);
  source.saleCount += 1;
  bucket.sources.set(sourceLabel, source);
}

function commissionRate(channel: SalesChannel, totalSold: number, goal: number) {
  return channel === "marketing" && totalSold >= goal ? MARKETING_COMMISSION_AT_GOAL : channel === "marketing" ? MARKETING_COMMISSION_BEFORE_GOAL : FIXED_CHANNEL_COMMISSION;
}

function summarizeChannel(key: SalesChannel, bucket: ChannelBucket, goal: number): ChannelSalesSummary {
  const rate = commissionRate(key, bucket.commissionEligibleSold, goal);
  return {
    key,
    label: SALES_CHANNEL_LABELS[key],
    totalSold: bucket.totalSold,
    goal,
    percentOfGoal: goal > 0 ? bucket.totalSold / goal * 100 : 0,
    remaining: Math.max(0, roundMoney(goal - bucket.totalSold)),
    surplus: Math.max(0, roundMoney(bucket.totalSold - goal)),
    saleCount: bucket.saleCount,
    commissionRate: rate,
    commission: roundMoney(bucket.commissionEligibleSold * rate),
    sources: Array.from(bucket.sources.values()).sort((a, b) => b.totalSold - a.totalSold || a.label.localeCompare(b.label, "pt-BR")),
  };
}

export function aggregateSalesByCrc(sales: RawSale[], goal = SALES_BY_CRC_GOAL, knownNames: string[] = [], channelGoalsByCrc: Record<string, Partial<Record<SalesChannel, number>>> = {}): SalesByCrcRow[] {
  const grouped = new Map<string, { id: string; name: string; channels: Record<SalesChannel, ChannelBucket> }>();
  const createGroup = (name: string) => ({ id: normalizeName(name), name, channels: { marketing: emptyBucket(), clinic: emptyBucket(), odontomab: emptyBucket() } });

  for (const knownName of knownNames) {
    const name = displayFixedCrc(knownName);
    const key = normalizeName(name);
    if (!grouped.has(key)) grouped.set(key, createGroup(name));
  }

  for (const sale of sales) {
    const name = displayFixedCrc(sale.crcName);
    const key = normalizeName(name);
    const current = grouped.get(key) ?? createGroup(name);
    addSale(current.channels[sale.module], sale);
    grouped.set(key, current);
  }

  return Array.from(grouped.values())
    .map(row => {
      const configuredGoals = channelGoalsByCrc[row.id] ?? {};
      const channels = Object.fromEntries(SALES_CHANNELS.map(key => [key, summarizeChannel(key, row.channels[key], configuredGoals[key] ?? goal)])) as Record<SalesChannel, ChannelSalesSummary>;
      const totalSold = roundMoney(SALES_CHANNELS.reduce((sum, key) => sum + channels[key].totalSold, 0));
      const combinedGoal = SALES_CHANNELS.reduce((sum, key) => sum + channels[key].goal, 0);
      const sources = SALES_CHANNELS.flatMap(key => channels[key].sources.map(source => ({ ...source, label: source.label })));
      return {
        id: row.id,
        name: row.name,
        totalSold,
        goal: combinedGoal,
        channelGoal: goal,
        percentOfGoal: combinedGoal > 0 ? totalSold / combinedGoal * 100 : 0,
        remaining: Math.max(0, roundMoney(combinedGoal - totalSold)),
        surplus: Math.max(0, roundMoney(totalSold - combinedGoal)),
        saleCount: SALES_CHANNELS.reduce((sum, key) => sum + channels[key].saleCount, 0),
        modules: SALES_CHANNELS.filter(key => channels[key].saleCount > 0),
        totalCommission: roundMoney(SALES_CHANNELS.reduce((sum, key) => sum + channels[key].commission, 0)),
        sources,
        channels,
      };
    })
    .sort((a, b) => b.totalSold - a.totalSold || a.name.localeCompare(b.name, "pt-BR"));
}

export async function getSalesByCrc(month?: string) {
  const [marketing, clinic, odontomab, odontomabCrcs, clinicGoals] = await Promise.all([
    listClosures(month),
    listActivePatients(month),
    listValSales(month),
    listOdontomabCrcs(),
    month ? listActiveGoals(month) : Promise.resolve([]),
  ]);
  const odontomabNames = new Map(odontomabCrcs.map(crc => [crc.id, crc.name]));
  const sales: RawSale[] = [
    ...marketing.map(row => ({ crcName: row.crcName, value: row.value, module: "marketing" as const, source: "Fechamentos da Comissão Marketing" })),
    ...clinic.map(row => ({
      crcName: row.crcName,
      value: row.value,
      module: isClinicOrganicReference(row.reference) ? "marketing" as const : "clinic" as const,
      source: isClinicOrganicReference(row.reference) ? "Campanha orgânica → Marketing" : "Fechamentos da Comissão Clínica",
    })),
    ...odontomab.map(row => ({ crcName: odontomabNames.get(row.crcId) ?? (row.crcId === "VAL" ? "Vivi" : row.crcId), value: row.value, module: "odontomab" as const, source: "Fechamentos da Comissão de Vendas Pacientes", commissionEligible: isOdontomabSaleCommissionEligible(row.saleDate) })),
  ];
  const knownNames = ["WISLLAYNI", "JAYZA", ...odontomabCrcs.map(crc => crc.id === "VAL" ? "Vivi" : crc.name)];
  const clinicGoalsByCrc = Object.fromEntries(clinicGoals.filter(goal => goal.monthlyGoal && Number(goal.monthlyGoal) > 0).map(goal => [normalizeName(displayFixedCrc(goal.crcName)), { clinic: Number(goal.monthlyGoal) }])) as Record<string, Partial<Record<SalesChannel, number>>>;
  const rows = aggregateSalesByCrc(sales, SALES_BY_CRC_GOAL, knownNames, clinicGoalsByCrc);
  return {
    month: month ?? null,
    goal: SALES_BY_CRC_GOAL,
    combinedGoal: rows.reduce((sum, row) => sum + row.goal, 0),
    channelLabels: SALES_CHANNEL_LABELS,
    rows,
    totalSold: rows.reduce((sum, row) => sum + row.totalSold, 0),
    totalCommission: roundMoney(rows.reduce((sum, row) => sum + row.totalCommission, 0)),
    totalCrcs: rows.length,
    totalSalesByChannel: Object.fromEntries(SALES_CHANNELS.map(key => [key, {
      totalSold: roundMoney(rows.reduce((sum, row) => sum + row.channels[key].totalSold, 0)),
      totalCommission: roundMoney(rows.reduce((sum, row) => sum + row.channels[key].commission, 0)),
      saleCount: rows.reduce((sum, row) => sum + row.channels[key].saleCount, 0),
      goal: roundMoney(rows.reduce((sum, row) => sum + row.channels[key].goal, 0)),
    }])) as Record<SalesChannel, { totalSold: number; totalCommission: number; saleCount: number; goal: number }>,
  };
}
