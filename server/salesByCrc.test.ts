import { describe, expect, it } from "vitest";
import { aggregateSalesByCrc, SALES_BY_CRC_GOAL } from "./salesByCrcDb";

describe("vendas consolidadas por CRC", () => {
  it("soma vendas das três páginas para a mesma CRC", () => {
    const rows = aggregateSalesByCrc([
      { crcName: "WISLLAYNI", value: "30000.00", module: "marketing" },
      { crcName: "WISLLAYNI", value: "20000.00", module: "clinic" },
      { crcName: "VAL", value: "10000.00", module: "odontomab" },
    ], SALES_BY_CRC_GOAL, ["WISLLAYNI", "JAYZA", "Vivi"]);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ name: "Wisllayny", totalSold: 50000, saleCount: 2, remaining: 25000 });
    expect(rows.find(row => row.name === "JAYZA")).toMatchObject({ totalSold: 0, remaining: 75000, saleCount: 0 });
  });

  it("mantém o excedente quando a CRC ultrapassa a meta", () => {
    const [row] = aggregateSalesByCrc([{ crcName: "JAYZA", value: 90000, module: "clinic" }]);
    expect(row).toMatchObject({ name: "JAYZA", totalSold: 90000, percentOfGoal: 120, surplus: 15000, remaining: 0 });
  });
});
