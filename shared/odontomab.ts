export const ODONTOMAB_STATUS_LABELS = { closed: "Paciente fechado", not_closed: "Não fechado", follow_up: "Em acompanhamento" } as const;
export type OdontomabStatus = keyof typeof ODONTOMAB_STATUS_LABELS;

export const ODONTOMAB_INSURANCE_PLANS = ["Rede Unna (Odontoprev)", "Amil", "Hapvida", "Unimed", "Uniodonto", "Particular"] as const;
export const ODONTOMAB_TREATMENTS = ["Implante", "Prótese", "Orto", "Clínica em geral"] as const;
export const ODONTOMAB_COMMISSION_RATE = 0.002;
/** A implantação suspende comissões somente para vendas datadas em outubro de 2026. */
export const ODONTOMAB_COMMISSION_SUSPENDED_MONTH = "2026-10";
/** Vivi preserva o ID histórico VAL e teve a comissão reativada neste período. */
export const ODONTOMAB_COMMISSION_REACTIVATED_CRC_ID = "VAL";
export const PATIENT_TYPE_LABELS = { active: "Ativo", new: "Novo" } as const;

export function isOdontomabCommissionSuspended(month?: string | null) {
  return month === ODONTOMAB_COMMISSION_SUSPENDED_MONTH;
}

export function isOdontomabCommissionSuspendedForCrc(month?: string | null, crcId?: string | null) {
  return isOdontomabCommissionSuspended(month) && crcId !== ODONTOMAB_COMMISSION_REACTIVATED_CRC_ID;
}

export function isOdontomabSaleCommissionEligible(saleDate?: string | null, crcId?: string | null) {
  return !isOdontomabCommissionSuspendedForCrc(saleDate?.slice(0, 7), crcId);
}

/** Compatibilidade de rótulo; não altera convênios históricos no banco. */
export function displayOdontomabInsurance(plan?: string | null) {
  return plan === "Rede Unna" ? "Rede Unna (Odontoprev)" : plan || "Não informado";
}

export function salesForOdontomabCrc<T extends { crcId: string }>(rows: T[], crcId: string): T[] {
  return rows.filter(row => row.crcId === crcId);
}

/** Uma retirada pode ser escolhida explicitamente para consultar o histórico. */
export function selectOdontomabCrc<T extends { id: string; isActive: boolean }>(crcs: T[], selectedId: string): T | undefined {
  return crcs.find(crc => crc.id === selectedId) ?? crcs.find(crc => crc.isActive);
}

export function calculateOdontomabMetrics(rows: Array<{ patientType?: string | null; value: string | number; internalStatus?: OdontomabStatus; saleDate?: string | null; crcId?: string | null }>) {
  const summarize = (items: typeof rows) => {
    const closed = items.filter(item => item.internalStatus === "closed" || !item.internalStatus);
    const cents = closed.reduce((sum, item) => sum + Math.round(Number(item.value) * 100), 0);
    const commissionCents = closed.filter(item => isOdontomabSaleCommissionEligible(item.saleDate, item.crcId)).reduce((sum, item) => sum + Math.round(Number(item.value) * 100), 0);
    return { count: closed.length, revenue: cents / 100, commission: Math.round(commissionCents * ODONTOMAB_COMMISSION_RATE) / 100 };
  };
  return {
    total: summarize(rows),
    active: summarize(rows.filter(row => row.patientType === "active")),
    new: summarize(rows.filter(row => row.patientType === "new")),
    unclassified: summarize(rows.filter(row => row.patientType !== "active" && row.patientType !== "new")),
  };
}

export function calculateOdontomabInsuranceMetrics(rows: Array<{ insurancePlan?: string | null; value: string | number; internalStatus?: OdontomabStatus; saleDate?: string | null; crcId?: string | null }>) {
  const plans = [...ODONTOMAB_INSURANCE_PLANS] as string[];
  if (rows.some(row => !row.insurancePlan)) plans.push("Não informado");
  return plans.map(plan => {
    const items = rows.filter(row => displayOdontomabInsurance(row.insurancePlan) === plan || (!row.insurancePlan && plan === "Não informado"));
    const metrics = calculateOdontomabMetrics(items);
    return { plan, count: metrics.total.count, revenue: metrics.total.revenue };
  });
}

export function calculateOdontomabTreatmentMetrics(rows: Array<{ treatment?: string | null; value: string | number; internalStatus?: OdontomabStatus; saleDate?: string | null; crcId?: string | null }>) {
  return ODONTOMAB_TREATMENTS.map(treatment => {
    const items = rows.filter(row => row.treatment === treatment && (!row.internalStatus || row.internalStatus === "closed"));
    const metrics = calculateOdontomabMetrics(items);
    return { treatment, count: metrics.total.count, revenue: metrics.total.revenue };
  });
}
