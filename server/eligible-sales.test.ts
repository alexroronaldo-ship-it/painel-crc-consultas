import { describe, expect, it } from "vitest";
import { calculateEligibleSales, isEligibleSalesCrc } from "../client/src/lib/eligible-sales";

describe("eligible sales totals", () => {
  it("counts WISLLAYNI and JAYZA", () => {
    expect(isEligibleSalesCrc("WISLLAYNI")).toBe(true);
    expect(isEligibleSalesCrc("JAYZA")).toBe(true);
  });

  it("never counts Val in the total", () => {
    const total = calculateEligibleSales([
      { crcName: "WISLLAYNI", value: "8100.00" },
      { crcName: "JAYZA", value: "47680.00" },
      { crcName: "VAL", value: "999999.00" },
    ]);
    expect(total).toBe(55780);
    expect(isEligibleSalesCrc("VAL")).toBe(false);
  });
});
