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
    expect(rows[0]).toMatchObject({ name: "Wisllayny", totalSold: 50000, saleCount: 2, remaining: 175000, totalCommission: 100 });
    expect(rows[0]?.channels.marketing).toMatchObject({ totalSold: 30000, goal: 75000, commission: 60, saleCount: 1 });
    expect(rows[0]?.channels.clinic).toMatchObject({ totalSold: 20000, goal: 75000, commission: 40, saleCount: 1 });
    expect(rows[0]?.sources).toEqual(expect.arrayContaining([
      { label: "Comissão Marketing", totalSold: 30000, saleCount: 1 },
      { label: "Comissão Clínica", totalSold: 20000, saleCount: 1 },
    ]));
    expect(rows.find(row => row.name === "JAYZA")).toMatchObject({ totalSold: 0, remaining: 225000, saleCount: 0 });
  });

  it("mantém o excedente quando a CRC ultrapassa a meta", () => {
    const [row] = aggregateSalesByCrc([{ crcName: "JAYZA", value: 90000, module: "clinic" }]);
    expect(row).toMatchObject({ name: "JAYZA", totalSold: 90000, percentOfGoal: 40, surplus: 0, remaining: 135000, totalCommission: 180 });
    expect(row?.channels.clinic).toMatchObject({ totalSold: 90000, percentOfGoal: 120, surplus: 15000, commission: 180 });
  });

  it("direciona Campanha orgânica clínica ao canal Marketing", () => {
    const [row] = aggregateSalesByCrc([
      { crcName: "WISLLAYNI", value: "10000.00", module: "marketing", source: "Campanha orgânica → Marketing" },
      { crcName: "WISLLAYNI", value: "5000.00", module: "clinic", source: "Fechamentos da Comissão Clínica" },
    ]);
    expect(row?.channels.marketing).toMatchObject({ totalSold: 10000, saleCount: 1 });
    expect(row?.channels.clinic).toMatchObject({ totalSold: 5000, saleCount: 1 });
  });
});
