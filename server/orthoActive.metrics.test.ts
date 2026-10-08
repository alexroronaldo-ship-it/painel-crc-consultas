import { describe, expect, it } from "vitest";
import { ACTIVE_COMMISSION_RATE, calculateActiveMetrics } from "../client/src/lib/ortho-active";

const records = [
  { crcName: "WISLLAYNI", value: "8100.00", totalTimeSeconds: 90, internalStatus: "closed" },
  { crcName: "JAYZA", value: "3000.00", totalTimeSeconds: 180, internalStatus: "closed" },
  { crcName: "JESSIKA", value: "2500.00", totalTimeSeconds: 120, internalStatus: "closed" },
  { crcName: "JAYZA", value: "9000.00", totalTimeSeconds: 0, internalStatus: "follow_up" },
];

describe("Pacientes Ativos — métricas isoladas", () => {
  it("paga apenas 0,2% para as duas CRCs atuais e não soma Jéssika", () => {
    expect(ACTIVE_COMMISSION_RATE).toBe(0.002);
    expect(calculateActiveMetrics(records, "WISLLAYNI").commission).toBe(16.2);
    expect(calculateActiveMetrics(records, "JAYZA").commission).toBe(6);
    expect(calculateActiveMetrics(records).revenue).toBe(11100);
    expect(calculateActiveMetrics(records).count).toBe(3);
  });
  it("exclui acompanhamento do faturamento e preserva o cálculo de durações históricas", () => {
    expect(calculateActiveMetrics(records, "JAYZA")).toMatchObject({ count: 2, closedCount: 1, revenue: 3000, averageTimeSeconds: 180 });
    expect(calculateActiveMetrics([{ crcName: "JAYZA", value: "0.00", totalTimeSeconds: 0, internalStatus: "not_closed" }], "JAYZA").averageTimeSeconds).toBeNull();
  });
});
