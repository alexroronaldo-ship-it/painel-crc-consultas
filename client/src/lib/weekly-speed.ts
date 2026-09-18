export type TimedClosure = {
  closingDate: string;
  totalTimeSeconds: number;
};

export type WeeklySpeed = {
  week: number;
  averageSeconds: number | null;
  metGoal: boolean;
  count: number;
};

export function getWeekOfMonth(closingDate: string) {
  const day = Number(closingDate.slice(8, 10));
  return Math.min(4, Math.max(1, Math.floor((day - 1) / 7) + 1));
}

export function calculateWeeklySpeed(records: TimedClosure[], targetSeconds = 120): WeeklySpeed[] {
  return [1, 2, 3, 4].map(week => {
    const measured = records.filter(record => record.totalTimeSeconds > 0 && getWeekOfMonth(record.closingDate) === week);
    const averageSeconds = measured.length
      ? Math.round(measured.reduce((sum, record) => sum + record.totalTimeSeconds, 0) / measured.length)
      : null;

    return {
      week,
      averageSeconds,
      metGoal: averageSeconds !== null && averageSeconds < targetSeconds,
      count: measured.length,
    };
  });
}

export function calculateWeeklyBonus(completedWeeks: number) {
  return completedWeeks === 4 ? 50 : completedWeeks * 10;
}
