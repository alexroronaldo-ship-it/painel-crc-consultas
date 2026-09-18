import { describe, expect, it } from "vitest";
import { calculateGoalProgress } from "../client/src/lib/goal-progress";

describe("R$ 75 mil management goal", () => {
  it("shows how much is missing before the goal", () => {
    expect(calculateGoalProgress(46000)).toMatchObject({
      remaining: 29000,
      surplus: 0,
      reached: false,
      commissionRate: 0.002,
      commission: 92,
    });
  });

  it("shows the positive amount and commission after the goal", () => {
    expect(calculateGoalProgress(82000)).toMatchObject({
      remaining: 0,
      surplus: 7000,
      reached: true,
      commissionRate: 0.005,
      commission: 410,
    });
  });

  it("caps the progress bar at one hundred percent", () => {
    expect(calculateGoalProgress(120000).progressPercent).toBe(100);
  });
});
