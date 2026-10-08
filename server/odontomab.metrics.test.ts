import { describe, expect, it } from "vitest";
import { calculateOdontomabMetrics, displayOdontomabInsurance, ODONTOMAB_COMMISSION_RATE, selectOdontomabCrc } from "../shared/odontomab";

describe("Odontomab — métricas por tipo", () => {
  it("separa Ativo/Novo e preserva vendas antigas no total sem classificá-las", () => {
    const result = calculateOdontomabMetrics([{ patientType: "active", value: "8100.00" }, { patientType: "new", value: "3000.00" }, { patientType: null, value: "2500.00" }]);
    expect(result.active).toEqual({ count: 1, revenue: 8100, commission: 16.2 });
    expect(result.new).toEqual({ count: 1, revenue: 3000, commission: 6 });
    expect(result.unclassified).toEqual({ count: 1, revenue: 2500, commission: 5 });
    expect(result.total).toEqual({ count: 3, revenue: 13600, commission: 27.2 });
  });
  it("mantém a comissão em 0,2% mesmo acima de R$75 mil", () => {
    expect(ODONTOMAB_COMMISSION_RATE).toBe(0.002);
    expect(calculateOdontomabMetrics([{ patientType: "active", value: "100000.00" }]).total.commission).toBe(200);
    expect(calculateOdontomabMetrics([]).total).toEqual({ count: 0, revenue: 0, commission: 0 });
  });
  it("exibe Odontoprev nos registros antigos da Rede Unna sem migrar o valor", () => {
    expect(displayOdontomabInsurance("Rede Unna")).toBe("Rede Unna (Odontoprev)");
    expect(displayOdontomabInsurance(null)).toBe("Não informado");
  });
  it("exibe Particular e calcula comissão sobre suas vendas sem transformar convênio ausente em Particular", () => {
    expect(displayOdontomabInsurance("Particular")).toBe("Particular");
    const rows = [{ insurancePlan: "Particular", patientType: "new", value: "2500.00" }, { insurancePlan: "Unimed", patientType: "active", value: "3000.00" }];
    expect(calculateOdontomabMetrics(rows).new.commission).toBe(5);
    expect(calculateOdontomabMetrics(rows).total.commission).toBe(11);
    expect(displayOdontomabInsurance(null)).not.toBe("Particular");
  });
  it("troca para uma CRC ativa após retirada e permite ver histórico explicitamente", () => {
    const crcs = [{ id: "VAL", isActive: false }, { id: "ODO_ANA", isActive: true }];
    expect(selectOdontomabCrc(crcs, "")).toEqual(crcs[1]);
    expect(selectOdontomabCrc(crcs, "VAL")).toEqual(crcs[0]);
    expect(selectOdontomabCrc([crcs[0]], "")).toBeUndefined();
    expect(selectOdontomabCrc([], "VAL")).toBeUndefined();
  });
});
