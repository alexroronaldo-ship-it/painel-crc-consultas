import { describe, expect, it } from "vitest";
import { calculateWeeklyGoal, calculateWeeklySales, getWeekOfMonthByDate, WEEKLY_SALES_GOAL } from "../client/src/lib/weekly-sales";

describe("weekly team sales", () => {
  it("groups days into five monthly periods", () => {
    expect(getWeekOfMonthByDate("2026-09-01")).toBe(1);
    expect(getWeekOfMonthByDate("2026-09-08")).toBe(2);
    expect(getWeekOfMonthByDate("2026-09-21")).toBe(3);
    expect(getWeekOfMonthByDate("2026-09-28")).toBe(4);
    expect(getWeekOfMonthByDate("2026-09-30")).toBe(5);
  });

  it("sums sales by week without changing the monthly total", () => {
    const weeks = calculateWeeklySales([
      { closingDate: "2026-09-03", value: "8100.00" },
      { closingDate: "2026-09-10", value: "12000.00" },
      { closingDate: "2026-09-18", value: "18000.00" },
      { closingDate: "2026-09-25", value: "17680.00" },
      { closingDate: "2026-09-30", value: "3000.00" },
    ], "2026-09");

    expect(weeks.map(week => week.total)).toEqual([8100, 12000, 18000, 17680, 3000]);
    expect(weeks.reduce((sum, week) => sum + week.total, 0)).toBe(58780);
    expect(weeks.map(week => week.period)).toEqual(["01–07/09", "08–14/09", "15–21/09", "22–28/09", "29–30/09"]);
  });

  it("uses R$ 37,500 as the goal for every week", () => {
    expect(WEEKLY_SALES_GOAL).toBe(37500);
    expect(calculateWeeklyGoal(33020)).toEqual({ reached: false, remaining: 4480, surplus: 0, progressPercent: 88.05333333333333 });
    expect(calculateWeeklyGoal(40000)).toEqual({ reached: true, remaining: 0, surplus: 2500, progressPercent: 100 });
  });
});
