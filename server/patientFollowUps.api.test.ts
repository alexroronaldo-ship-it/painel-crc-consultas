import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({ listPatientFollowUps: vi.fn().mockResolvedValue([]), createPatientFollowUp: vi.fn(), updatePatientFollowUp: vi.fn(), effectivePatientFollowUp: vi.fn() }));
vi.mock("./patientFollowUpDb", () => mocks);
import { appRouter } from "./routers";

function context(): TrpcContext { return { user: { id: 4, openId: "follow-up-test", name: "Gerência", email: null, loginMethod: "manus", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] }; }
const lead = { crcName: "WISLLAYNI", hasCampaign: false, patientName: "Paciente em acompanhamento", phone: "11999990000", contactChannel: "WhatsApp", reference: "Paciente", notes: "Primeiro atendimento registrado" } as const;

describe("acompanhamento de pacientes", () => {
  beforeEach(() => vi.clearAllMocks());
  it("registra lead sem exigir fechamento e sem campanha", async () => {
    const caller = appRouter.createCaller(context());
    await expect(caller.patientFollowUps.create(lead)).resolves.toEqual({ success: true });
    expect(mocks.createPatientFollowUp).toHaveBeenCalledWith(expect.objectContaining({ patientName: lead.patientName, campaignId: null, closingDate: null, value: null, createdBy: 4 }));
  });
  it("exige campanha quando o lead informa que veio de campanha", async () => {
    const caller = appRouter.createCaller(context());
    await expect(caller.patientFollowUps.create({ ...lead, hasCampaign: true })).rejects.toThrow();
    expect(mocks.createPatientFollowUp).not.toHaveBeenCalled();
  });
  it("permite correção antes da efetivação e normaliza o valor", async () => {
    const caller = appRouter.createCaller(context());
    await caller.patientFollowUps.update({ ...lead, id: 7, closingDate: "2026-10-13", closedItem: "Implante", value: "8000,50" });
    expect(mocks.updatePatientFollowUp).toHaveBeenCalledWith(7, expect.objectContaining({ closedItem: "Implante", value: "8000.50" }), 4);
  });
  it("efetiva a venda com o destino de comissão e tratamento padronizado", async () => {
    const caller = appRouter.createCaller(context());
    await expect(caller.patientFollowUps.effectivate({ id: 7, commissionDestination: "clinic", commissionCrcId: "JAYZA", closingDate: "2026-10-13", closedItem: "Prótese", value: "12000,00" })).resolves.toEqual({ success: true });
    expect(mocks.effectivePatientFollowUp).toHaveBeenCalledWith(expect.objectContaining({ commissionDestination: "clinic", commissionCrcId: "JAYZA", closedItem: "Prótese", value: "12000.00", effectiveBy: 4 }));
  });
  it("bloqueia tratamento fora da lista ao efetivar", async () => {
    const caller = appRouter.createCaller(context());
    await expect(caller.patientFollowUps.effectivate({ id: 7, commissionDestination: "clinic", commissionCrcId: "JAYZA", closingDate: "2026-10-13", closedItem: "Outro" as never, value: "12000,00" })).rejects.toThrow();
    expect(mocks.effectivePatientFollowUp).not.toHaveBeenCalled();
  });
});
