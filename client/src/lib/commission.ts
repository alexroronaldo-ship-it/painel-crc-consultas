export const commissionScenarios = [60000, 75000, 90000, 100000, 120000] as const;

export function getCommissionRate(revenue: number) {
  if (revenue >= 120000) return 0.008;
  if (revenue >= 90000) return 0.007;
  if (revenue >= 60000) return 0.005;
  return 0.002;
}

export function calculateCommission(revenue: number) {
  return revenue * getCommissionRate(revenue);
}

export function formatCommissionRate(rate: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rate);
}
