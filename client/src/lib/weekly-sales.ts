export type SaleRecord = {
  closingDate: string;
  value: string | number;
};

export type WeeklySale = {
  week: number;
  label: string;
  period: string;
  total: number;
  count: number;
};

export const WEEKLY_SALES_GOAL = 37500;

export function calculateWeeklyGoal(total: number, goal = WEEKLY_SALES_GOAL) {
  return {
    reached: total >= goal,
    remaining: Math.max(0, goal - total),
    surplus: Math.max(0, total - goal),
    progressPercent: Math.min(100, (total / goal) * 100),
  };
}

export function getWeekOfMonthByDate(date: string) {
  const day = Number(date.slice(8, 10));
  return Math.min(4, Math.max(1, Math.floor((day - 1) / 7) + 1));
}

export function calculateWeeklySales(records: SaleRecord[], month: string): WeeklySale[] {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  const monthLabel = String(monthNumber).padStart(2, "0");
  const periods = [
    [1, 7],
    [8, 14],
    [15, 21],
    [22, lastDay],
  ] as const;

  return periods.map(([start, end], index) => {
    const week = index + 1;
    const own = records.filter(record => getWeekOfMonthByDate(record.closingDate) === week);
    return {
      week,
      label: `S${week}`,
      period: `${String(start).padStart(2, "0")}–${String(end).padStart(2, "0")}/${monthLabel}`,
      total: own.reduce((sum, record) => sum + Number(record.value), 0),
      count: own.length,
    };
  });
}
