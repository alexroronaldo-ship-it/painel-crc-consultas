export const SALES_CRC_NAMES = ["WISLLAYNI", "JAYZA"] as const;

export function isEligibleSalesCrc(name: string) {
  return SALES_CRC_NAMES.includes(name as (typeof SALES_CRC_NAMES)[number]);
}

export function calculateEligibleSales(records: Array<{ crcName: string; value: string | number; internalStatus?: string | null }>) {
  return records
    .filter(record => isEligibleSalesCrc(record.crcName) && (!record.internalStatus || record.internalStatus === "closed"))
    .reduce((sum, record) => sum + Number(record.value), 0);
}
