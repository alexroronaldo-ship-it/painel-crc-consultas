import { describe, expect, it } from "vitest";
import { calculateOdontomabMetrics, salesForOdontomabCrc } from "../shared/odontomab";
import { normalizeCrcName } from "./odontomabCrcDb";

describe("CRCs Odontomab — identidade e métricas", () => {
  it("usa nome normalizado para evitar repetição por acentos, caixa ou espaços", () => {
    expect(normalizeCrcName("  Ana   MARÍA  ")).toBe("ana maria");
    expect(normalizeCrcName("VIVI")).toBe(normalizeCrcName(" Vivi "));
  });
  it("cada aba usa só suas próprias vendas sem compartilhar comissão", () => {
    const rows = [{ crcId: "VAL", patientType: "active", value: "8100.00", totalTimeSeconds: 90 }, { crcId: "ODO_ANA", patientType: "new", value: "100000.00", totalTimeSeconds: 360 }, { crcId: "ODO_ANA", patientType: "active", value: "500.00", totalTimeSeconds: 60 }];
    const vivi = salesForOdontomabCrc(rows, "VAL"), ana = salesForOdontomabCrc(rows, "ODO_ANA");
    expect(calculateOdontomabMetrics(vivi).total).toEqual({ count: 1, revenue: 8100, commission: 16.2 });
    expect(calculateOdontomabMetrics(ana).total).toEqual({ count: 2, revenue: 100500, commission: 201 });
    expect(calculateOdontomabMetrics(ana).new.commission).toBe(200);
    expect(vivi.map(row => row.totalTimeSeconds)).toEqual([90]);
    expect(ana.map(row => row.totalTimeSeconds)).toEqual([360, 60]);
    expect(salesForOdontomabCrc(rows, "ODO_NEW")).toEqual([]);
  });
});
