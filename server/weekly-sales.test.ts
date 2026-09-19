import { describe, expect, it } from "vitest";
import { calculateWeeklySales, getWeekOfMonthByDate } from "../client/src/lib/weekly-sales";

describe("weekly team sales", () => {
  it("groups days into four monthly periods", () => {
    expect(getWeekOfMonthByDate("2026-09-01")).toBe(1);
    expect(getWeekOfMonthByDate("2026-09-08")).toBe(2);
    expect(getWeekOfMonthByDate("2026-09-21")).toBe(3);
    expect(getWeekOfMonthByDate("2026-09-30")).toBe(4);
  });

  it("sums sales by week without changing the monthly total", () => {
    const weeks = calculateWeeklySales([
      { closingDate: "2026-09-03", value: "8100.00" },
      { closingDate: "2026-09-10", value: "12000.00" },
      { closingDate: "2026-09-18", value: "18000.00" },
      { closingDate: "2026-09-25", value: "17680.00" },
    ], "2026-09");

    expect(weeks.map(week => week.total)).toEqual([8100, 12000, 18000, 17680]);
    expect(weeks.reduce((sum, week) => sum + week.total, 0)).toBe(55780);
    expect(weeks.map(week => week.period)).toEqual(["01–07/09", "08–14/09", "15–21/09", "22–30/09"]);
  });
});
