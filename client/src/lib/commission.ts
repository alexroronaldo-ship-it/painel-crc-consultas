export const commissionScenarios = [60000, 75000] as const;

export function getCommissionRate(revenue: number) {
  return revenue >= 60000 ? 0.005 : 0.002;
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
