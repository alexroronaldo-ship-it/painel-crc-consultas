import { describe, expect, it } from "vitest";
import { calculateCommission, getCommissionRate } from "../client/src/lib/commission";

describe("commission tiers", () => {
  it.each([
    [46250, 0.002, 92.5],
    [60000, 0.005, 300],
    [75000, 0.005, 375],
    [90000, 0.007, 630],
    [100000, 0.007, 700],
    [120000, 0.008, 960],
  ])("calculates the reference scenario for revenue %s", (revenue, rate, commission) => {
    expect(getCommissionRate(revenue)).toBe(rate);
    expect(calculateCommission(revenue)).toBe(commission);
  });

  it("keeps the lower rate immediately below each threshold", () => {
    expect(getCommissionRate(59999.99)).toBe(0.002);
    expect(getCommissionRate(89999.99)).toBe(0.005);
    expect(getCommissionRate(119999.99)).toBe(0.007);
  });
});
