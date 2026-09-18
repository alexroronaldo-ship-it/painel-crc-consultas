import { describe, expect, it } from "vitest";
import { calculateCommission, getCommissionRate } from "../client/src/lib/commission";

describe("commission tiers", () => {
  it.each([
    [46250, 0.002, 92.5],
    [59999.99, 0.002, 119.99998],
    [60000, 0.005, 300],
    [75000, 0.005, 375],
    [90000, 0.005, 450],
    [120000, 0.005, 600],
  ])("uses only the 0.20% and 0.50% tiers for revenue %s", (revenue, rate, commission) => {
    expect(getCommissionRate(revenue)).toBe(rate);
    expect(calculateCommission(revenue)).toBeCloseTo(commission);
  });
});
