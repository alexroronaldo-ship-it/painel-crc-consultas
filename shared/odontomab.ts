export const ODONTOMAB_INSURANCE_PLANS = ["Rede Unna (Odontoprev)", "Amil", "Hapvida", "Unimed", "Uniodonto"] as const;
export const ODONTOMAB_COMMISSION_RATE = 0.002;
export const PATIENT_TYPE_LABELS = { active: "Ativo", new: "Novo" } as const;

/** Compatibilidade de rótulo; não altera convênios históricos no banco. */
export function displayOdontomabInsurance(plan?: string | null) {
  return plan === "Rede Unna" ? "Rede Unna (Odontoprev)" : plan || "Não informado";
}

export function calculateOdontomabMetrics(rows: Array<{ patientType?: string | null; value: string | number }>) {
  const summarize = (items: typeof rows) => {
    const cents = items.reduce((sum, item) => sum + Math.round(Number(item.value) * 100), 0);
    return { count: items.length, revenue: cents / 100, commission: Math.round(cents * ODONTOMAB_COMMISSION_RATE) / 100 };
  };
  return {
    total: summarize(rows),
    active: summarize(rows.filter(row => row.patientType === "active")),
    new: summarize(rows.filter(row => row.patientType === "new")),
    unclassified: summarize(rows.filter(row => row.patientType !== "active" && row.patientType !== "new")),
  };
}
