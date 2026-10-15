import { isClinicOrganicReference } from "@shared/orthoReference";

export const ACTIVE_COMMISSION_RATE = 0.002;
export const ACTIVE_CRC_LABELS = { WISLLAYNI: "Wisllayny", JAYZA: "JAYZA" } as const;
export type ActiveCrcName = keyof typeof ACTIVE_CRC_LABELS;
export type ActiveSale = { crcName: string; value: string | number; totalTimeSeconds: number; internalStatus: string; reference?: string | null };

/** Somente registros efetivamente fechados desta página geram faturamento e comissão. */
export function calculateActiveMetrics(records: ActiveSale[], crcName?: ActiveCrcName) {
  const own = records.filter(item => item.crcName in ACTIVE_CRC_LABELS && (!crcName || item.crcName === crcName));
  const closed = own.filter(item => item.internalStatus === "closed");
  const clinicClosed = closed.filter(item => !isClinicOrganicReference(item.reference));
  const organicClosed = closed.filter(item => isClinicOrganicReference(item.reference));
  const revenue = clinicClosed.reduce((sum, item) => sum + Number(item.value), 0);
  const organicRevenue = organicClosed.reduce((sum, item) => sum + Number(item.value), 0);
  const measured = clinicClosed.filter(item => item.totalTimeSeconds > 0);
  return {
    count: clinicClosed.length,
    closedCount: clinicClosed.length,
    revenue,
    organicRevenue,
    organicCount: organicClosed.length,
    commission: Math.round(revenue * ACTIVE_COMMISSION_RATE * 100) / 100,
    averageTimeSeconds: measured.length ? Math.round(measured.reduce((sum, item) => sum + item.totalTimeSeconds, 0) / measured.length) : null,
  };
}
