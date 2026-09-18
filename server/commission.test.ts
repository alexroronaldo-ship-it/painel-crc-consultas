import { describe, expect, it } from "vitest";
import { calculateCommission, commissionScenarios, getCommissionRate } from "../client/src/lib/commission";

describe("commission tiers", () => {
  it.each([
    [46250, 0.002, 92.5],
    [60000, 0.002, 120],
    [74999.99, 0.002, 149.99998],
    [75000, 0.005, 375],
    [90000, 0.005, 450],
    [120000, 0.005, 600],
  ])("uses 0.20% before R$ 75k and 0.50% from R$ 75k for revenue %s", (revenue, rate, commission) => {
    expect(getCommissionRate(revenue)).toBe(rate);
    expect(calculateCommission(revenue)).toBeCloseTo(commission);
  });

  it("shows only the R$ 75k simulation", () => {
    expect(commissionScenarios).toEqual([75000]);
  });
});
