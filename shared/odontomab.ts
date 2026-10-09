export const ODONTOMAB_STATUS_LABELS = { closed: "Paciente fechado", not_closed: "Não fechado", follow_up: "Em acompanhamento" } as const;
export type OdontomabStatus = keyof typeof ODONTOMAB_STATUS_LABELS;

export const ODONTOMAB_INSURANCE_PLANS = ["Rede Unna (Odontoprev)", "Amil", "Hapvida", "Unimed", "Uniodonto", "Particular"] as const;
export const ODONTOMAB_COMMISSION_RATE = 0.002;
export const PATIENT_TYPE_LABELS = { active: "Ativo", new: "Novo" } as const;

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

export function calculateOdontomabMetrics(rows: Array<{ patientType?: string | null; value: string | number; internalStatus?: OdontomabStatus }>) {
  const summarize = (items: typeof rows) => {
    const cents = items.filter(item => !item.internalStatus || item.internalStatus === "closed").reduce((sum, item) => sum + Math.round(Number(item.value) * 100), 0);
    return { count: items.length, revenue: cents / 100, commission: Math.round(cents * ODONTOMAB_COMMISSION_RATE) / 100 };
  };
  return {
    total: summarize(rows),
    active: summarize(rows.filter(row => row.patientType === "active")),
    new: summarize(rows.filter(row => row.patientType === "new")),
    unclassified: summarize(rows.filter(row => row.patientType !== "active" && row.patientType !== "new")),
  };
}
