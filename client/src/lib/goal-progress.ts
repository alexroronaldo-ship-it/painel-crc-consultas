import { calculateCommission, getCommissionRate } from "./commission";

export const MONTHLY_GOAL = 75000;

export function calculateGoalProgress(total: number, goal = MONTHLY_GOAL) {
  const remaining = Math.max(0, goal - total);
  const surplus = Math.max(0, total - goal);
  const progressPercent = goal > 0 ? Math.min(100, (total / goal) * 100) : 100;

  return {
    goal,
    total,
    remaining,
    surplus,
    progressPercent,
    reached: total >= goal,
    commissionRate: getCommissionRate(total),
    commission: calculateCommission(total),
  };
}
