import { describe, expect, it } from "vitest";
import { calculateWeeklyBonus, calculateWeeklySpeed, getWeekOfMonth } from "../client/src/lib/weekly-speed";

describe("weekly response speed", () => {
  it("groups every day of the month into one of four dashboard weeks", () => {
    expect(getWeekOfMonth("2026-09-01")).toBe(1);
    expect(getWeekOfMonth("2026-09-08")).toBe(2);
    expect(getWeekOfMonth("2026-09-15")).toBe(3);
    expect(getWeekOfMonth("2026-09-22")).toBe(4);
    expect(getWeekOfMonth("2026-09-30")).toBe(4);
  });

  it("marks only weekly averages strictly below two minutes", () => {
    const weeks = calculateWeeklySpeed([
      { closingDate: "2026-09-01", totalTimeSeconds: 60 },
      { closingDate: "2026-09-07", totalTimeSeconds: 100 },
      { closingDate: "2026-09-08", totalTimeSeconds: 119 },
      { closingDate: "2026-09-15", totalTimeSeconds: 120 },
      { closingDate: "2026-09-22", totalTimeSeconds: 90 },
    ]);

    expect(weeks.map(week => week.averageSeconds)).toEqual([80, 119, 120, 90]);
    expect(weeks.map(week => week.metGoal)).toEqual([true, true, false, true]);
  });

  it("pays R$ 10 per completed week and R$ 50 for all four", () => {
    expect(calculateWeeklyBonus(0)).toBe(0);
    expect(calculateWeeklyBonus(3)).toBe(30);
    expect(calculateWeeklyBonus(4)).toBe(50);
  });
});
