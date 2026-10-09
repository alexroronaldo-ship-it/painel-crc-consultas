import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  listActivePatients: vi.fn().mockResolvedValue([]), createActivePatient: vi.fn(), deleteActivePatient: vi.fn(), updateActivePatientTime: vi.fn(),
  listActiveCampaigns: vi.fn().mockResolvedValue([]), createActiveCampaign: vi.fn(), updateActiveCampaign: vi.fn(), deleteEmptyActiveCampaign: vi.fn(),
  listActiveGoals: vi.fn().mockResolvedValue([]), saveActiveGoal: vi.fn(), listActiveWeeks: vi.fn().mockResolvedValue([]), saveActiveTasks: vi.fn(), saveActiveAppointments: vi.fn(),
}));
vi.mock("./orthoActiveDb", () => mocks);
vi.mock("./crcTransferDb", () => ({ assertOrtoCrcActive: vi.fn().mockResolvedValue(undefined) }));
import { appRouter } from "./routers";

function context(role: "admin" | "user" = "admin"): TrpcContext {
  return { user: { id: 3, openId: "ortho-test", name: "Gerência", email: null, loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
}
const sale = { crcName: "JAYZA", patientName: "Paciente Exemplo", phone: "11999990000", closingDate: "2026-10-07", closedItem: "Tratamento", value: "2500,00", totalTimeSeconds: 90, internalStatus: "closed" } as const;

describe("API isolada de Pacientes Ativos Orto Implante", () => {
  beforeEach(() => vi.clearAllMocks());
  it("lê apenas a base de pacientes ativos do mês selecionado", async () => {
    const caller = appRouter.createCaller(context());
    await caller.orthoActive.patients.list({ month: "2026-10" });
    expect(mocks.listActivePatients).toHaveBeenCalledWith("2026-10");
    expect(mocks.listActiveCampaigns).not.toHaveBeenCalled();
  });
  it("cadastra as duas CRCs sem usar fechamentos do funil", async () => {
    const caller = appRouter.createCaller(context());
    for (const crcName of ["WISLLAYNI", "JAYZA"] as const) await expect(caller.orthoActive.patients.create({ ...sale, crcName })).resolves.toEqual({ success: true });
    expect(mocks.createActivePatient).toHaveBeenCalledWith(expect.objectContaining({ crcName: "JAYZA", value: "2500.00", createdBy: 3 }));
    expect(mocks.createActivePatient).toHaveBeenCalledTimes(2);
  });
  it("rejeita campos obrigatórios vazios e datas impossíveis", async () => {
    const caller = appRouter.createCaller(context());
    await expect(caller.orthoActive.patients.create({ ...sale, patientName: "" })).rejects.toThrow();
    await expect(caller.orthoActive.patients.create({ ...sale, closingDate: "2026-02-30" })).rejects.toThrow();
    expect(mocks.createActivePatient).not.toHaveBeenCalled();
  });
  it("dispensa tempo e recusa novo registro para Jéssika", async () => {
    const caller = appRouter.createCaller(context());
    const { totalTimeSeconds: _time, ...withoutTime } = sale;
    await caller.orthoActive.patients.create(withoutTime);
    expect(mocks.createActivePatient).toHaveBeenCalledWith(expect.objectContaining({ totalTimeSeconds: 0 }));
    mocks.createActivePatient.mockClear();
    await expect(caller.orthoActive.patients.create({ ...withoutTime, crcName: "JESSIKA" } as unknown as Parameters<typeof caller.orthoActive.patients.create>[0])).rejects.toThrow();
    expect(mocks.createActivePatient).not.toHaveBeenCalled();
  });
  it("protege exclusão por linha e mantém a correção de tempo individual", async () => {
    const caller = appRouter.createCaller(context());
    await expect(caller.orthoActive.patients.deleteOne({ id: 5, password: "1234" })).rejects.toThrow("Senha provisória incorreta");
    expect(mocks.deleteActivePatient).not.toHaveBeenCalled();
    await caller.orthoActive.patients.deleteOne({ id: 5, password: "0000" });
    await caller.orthoActive.patients.updateTime({ id: 5, totalTimeSeconds: 110 });
    expect(mocks.deleteActivePatient).toHaveBeenCalledWith(5);
    expect(mocks.updateActivePatientTime).toHaveBeenCalledWith(5, 110);
  });
  it("salva campanhas e metas exclusivamente na base nova", async () => {
    const caller = appRouter.createCaller(context());
    await caller.orthoActive.campaigns.create({ name: "Campanha própria", origin: "Indicação", startDate: "2026-10-01", weeklyGoal: "9000,00" });
    await caller.orthoActive.goals.save({ crcName: "JAYZA", month: "2026-10", monthlyGoal: "25000,00", weeklySalesGoal: "6000,00", timeGoalSeconds: 90 });
    expect(mocks.createActiveCampaign).toHaveBeenCalledWith(expect.objectContaining({ weeklyGoal: "9000.00", createdBy: 3 }));
    expect(mocks.saveActiveGoal).toHaveBeenCalledWith(expect.objectContaining({ crcName: "JAYZA", monthlyGoal: "25000.00", weeklySalesGoal: "6000.00", timeGoalSeconds: 90 }));
  });
  it("não deixa corrigir uma campanha com fim anterior ao início", async () => {
    const caller = appRouter.createCaller(context());
    await expect(caller.orthoActive.campaigns.update({ id: 1, name: "Campanha própria", origin: "Indicação", startDate: "2026-10-20", endDate: "2026-10-01" })).rejects.toThrow();
    expect(mocks.updateActiveCampaign).not.toHaveBeenCalled();
  });
  it("somente a gerência ajusta metas e exclui campanhas vazias com senha", async () => {
    const ordinary = appRouter.createCaller(context("user"));
    await expect(ordinary.orthoActive.goals.save({ crcName: "JAYZA", month: "2026-10", monthlyGoal: "20000" })).rejects.toThrow("Somente a gerência");
    await expect(ordinary.orthoActive.campaigns.deleteOne({ id: 1, password: "0000" })).rejects.toThrow("Somente a gerência");
    const admin = appRouter.createCaller(context());
    await expect(admin.orthoActive.campaigns.deleteOne({ id: 1, password: "errada" })).rejects.toThrow("Senha provisória incorreta");
    await admin.orthoActive.campaigns.deleteOne({ id: 1, password: "0000" });
    expect(mocks.deleteEmptyActiveCampaign).toHaveBeenCalledWith(1);
  });
  it("registra tarefas e agendamentos S1–S5 sem tocar a base semanal do funil", async () => {
    const caller = appRouter.createCaller(context());
    await caller.orthoActive.weekly.saveTasks({ crcName: "JAYZA", month: "2026-10", week: 5, taskCount: 88, taskGoal: 100, description: "Acompanhamentos" });
    await caller.orthoActive.weekly.saveAppointments({ crcName: "JAYZA", month: "2026-10", week: 5, appointmentCount: 30, appointmentGoal: 40 });
    expect(mocks.saveActiveTasks).toHaveBeenCalledWith(expect.objectContaining({ crcName: "JAYZA", week: 5, taskCount: 88, taskGoal: 100 }));
    expect(mocks.saveActiveAppointments).toHaveBeenCalledWith(expect.objectContaining({ crcName: "JAYZA", week: 5, appointmentCount: 30, appointmentGoal: 40 }));
  });
});
