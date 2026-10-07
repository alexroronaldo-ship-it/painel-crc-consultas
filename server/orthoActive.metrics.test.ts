import { describe, expect, it } from "vitest";
import { ACTIVE_COMMISSION_RATE, calculateActiveMetrics } from "../client/src/lib/ortho-active";

const records = [
  { crcName: "WISLLAYNI", value: "8100.00", totalTimeSeconds: 90, internalStatus: "closed" },
  { crcName: "JAYZA", value: "3000.00", totalTimeSeconds: 180, internalStatus: "closed" },
  { crcName: "JESSIKA", value: "2500.00", totalTimeSeconds: 120, internalStatus: "closed" },
  { crcName: "JESSIKA", value: "9000.00", totalTimeSeconds: 0, internalStatus: "follow_up" },
];

describe("Pacientes Ativos — métricas isoladas", () => {
  it("paga apenas 0,2% sobre as vendas fechadas de cada pessoa", () => {
    expect(ACTIVE_COMMISSION_RATE).toBe(0.002);
    expect(calculateActiveMetrics(records, "WISLLAYNI").commission).toBe(16.2);
    expect(calculateActiveMetrics(records, "JAYZA").commission).toBe(6);
    expect(calculateActiveMetrics(records, "JESSIKA").commission).toBe(5);
    expect(calculateActiveMetrics(records).revenue).toBe(13600);
  });
  it("exclui acompanhamento do faturamento e ignora durações não informadas", () => {
    expect(calculateActiveMetrics(records, "JESSIKA")).toMatchObject({ count: 2, closedCount: 1, revenue: 2500, averageTimeSeconds: 120 });
    expect(calculateActiveMetrics([{ crcName: "JAYZA", value: "0.00", totalTimeSeconds: 0, internalStatus: "not_closed" }], "JAYZA").averageTimeSeconds).toBeNull();
  });
});
