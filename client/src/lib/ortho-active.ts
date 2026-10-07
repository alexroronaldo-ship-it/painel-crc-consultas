export const ACTIVE_COMMISSION_RATE = 0.002;
export const ACTIVE_CRC_LABELS = { WISLLAYNI: "Wisllayny", JAYZA: "JAYZA", JESSIKA: "Jéssika" } as const;
export type ActiveCrcName = keyof typeof ACTIVE_CRC_LABELS;
export type ActiveSale = { crcName: string; value: string | number; totalTimeSeconds: number; internalStatus: string };

/** Somente registros efetivamente fechados desta página geram faturamento e comissão. */
export function calculateActiveMetrics(records: ActiveSale[], crcName?: ActiveCrcName) {
  const own = records.filter(item => !crcName || item.crcName === crcName);
  const closed = own.filter(item => item.internalStatus === "closed");
  const revenue = closed.reduce((sum, item) => sum + Number(item.value), 0);
  const measured = own.filter(item => item.totalTimeSeconds > 0);
  return {
    count: own.length,
    closedCount: closed.length,
    revenue,
    commission: Math.round(revenue * ACTIVE_COMMISSION_RATE * 100) / 100,
    averageTimeSeconds: measured.length ? Math.round(measured.reduce((sum, item) => sum + item.totalTimeSeconds, 0) / measured.length) : null,
  };
}
