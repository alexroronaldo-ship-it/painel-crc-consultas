import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
const mocks = vi.hoisted(() => ({
  createOdontomabCrc: vi.fn().mockResolvedValue({ id: "ODO_TEST", name: "Ana" }), listOdontomabCrcs: vi.fn().mockResolvedValue([{ id: "VAL", name: "Vivi", photoUrl: null }, { id: "ODO_TEST", name: "Ana", photoUrl: null }]), renameOdontomabCrc: vi.fn(), requireOdontomabCrc: vi.fn().mockResolvedValue({ id: "ODO_TEST", name: "Ana" }), saveOdontomabCrcPhoto: vi.fn(),
  removeOdontomabCrc: vi.fn(), restoreOdontomabCrc: vi.fn(),
  listCrcWeeklyActivities: vi.fn().mockResolvedValue([{ crcName: "VAL", week: 1, taskCount: 123 }, { crcName: "ODO_TEST", week: 1, taskCount: 105 }, { crcName: "JAYZA", week: 1, taskCount: 999 }]),
  listCrcWeeklyAppointments: vi.fn().mockResolvedValue([{ crcName: "VAL", week: 1, appointmentCount: 12 }, { crcName: "ODO_TEST", week: 1, appointmentCount: 30 }]),
  saveCrcWeeklyActivity: vi.fn(), saveCrcWeeklyAppointment: vi.fn(), storagePut: vi.fn().mockResolvedValue({ key: "portrait.png", url: "/manus-storage/portrait.png" }),
}));
vi.mock("./odontomabCrcDb", () => mocks);
vi.mock("./db", () => mocks);
vi.mock("./storage", () => ({ storagePut: mocks.storagePut }));
import { odontomabCrcRouter } from "./routers/odontomabCrc";
function ctx(role: "admin" | "user" = "admin"): TrpcContext { return { user: { id: 1, openId: "test", name: "Gerente", email: null, loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] }; }
const png = Buffer.from("89504e470d0a1a0a00000000", "hex").toString("base64");
describe("CRCs cadastráveis da Odontomab", () => {
  beforeEach(() => vi.clearAllMocks());
  it("lista perfis e permite cadastrar CRC sem foto", async () => {
    const caller = odontomabCrcRouter.createCaller(ctx());
    expect(await caller.list()).toHaveLength(2);
    expect(await caller.create({ name: "Ana" })).toEqual({ id: "ODO_TEST", name: "Ana" });
    expect(mocks.createOdontomabCrc).toHaveBeenCalledWith("Ana", 1);
    expect(mocks.storagePut).not.toHaveBeenCalled();
  });
  it("rejeita nomes vazios e restringe cadastro/renomeação à gerência", async () => {
    const admin = odontomabCrcRouter.createCaller(ctx());
    await expect(admin.create({ name: " " })).rejects.toThrow();
    const user = odontomabCrcRouter.createCaller(ctx("user"));
    await expect(user.create({ name: "Ana" })).rejects.toThrow("Somente a gerência");
    await expect(user.rename({ id: "ODO_TEST", name: "Ana Maria" })).rejects.toThrow("Somente a gerência");
    expect(mocks.createOdontomabCrc).not.toHaveBeenCalled();
    expect(mocks.renameOdontomabCrc).not.toHaveBeenCalled();
  });
  it("corrige nome usando o mesmo ID para preservar dados", async () => {
    const caller = odontomabCrcRouter.createCaller(ctx());
    await caller.rename({ id: "ODO_TEST", name: "Ana Maria" });
    expect(mocks.renameOdontomabCrc).toHaveBeenCalledWith("ODO_TEST", "Ana Maria");
    expect(mocks.createOdontomabCrc).not.toHaveBeenCalled();
    expect(mocks.saveCrcWeeklyActivity).not.toHaveBeenCalled();
  });
  it("mostra erro de duplicata sem criar foto", async () => {
    mocks.createOdontomabCrc.mockRejectedValueOnce(new Error("Já existe uma CRC com esse nome"));
    const caller = odontomabCrcRouter.createCaller(ctx());
    await expect(caller.create({ name: "Vivi" })).rejects.toThrow("Já existe");
    expect(mocks.storagePut).not.toHaveBeenCalled();
  });
  it("vincula foto somente à CRC escolhida, sem alterar fotos das demais", async () => {
    const caller = odontomabCrcRouter.createCaller(ctx());
    await expect(caller.uploadPhoto({ id: "ODO_TEST", mimeType: "image/png", base64: png })).resolves.toMatchObject({ success: true });
    expect(mocks.requireOdontomabCrc).toHaveBeenCalledWith("ODO_TEST");
    expect(mocks.storagePut).toHaveBeenCalledWith("odontomab-crcs/ODO_TEST/portrait.png", expect.any(Buffer), "image/png");
    expect(mocks.saveOdontomabCrcPhoto).toHaveBeenCalledWith("ODO_TEST", "portrait.png", "/manus-storage/portrait.png");
    expect(mocks.saveOdontomabCrcPhoto).not.toHaveBeenCalledWith("VAL", expect.anything(), expect.anything());
  });
  it("rejeita imagem inválida, tamanho excessivo e usuário sem gerência", async () => {
    const admin = odontomabCrcRouter.createCaller(ctx());
    await expect(admin.uploadPhoto({ id: "ODO_TEST", mimeType: "image/png", base64: Buffer.from("invalid").toString("base64") })).rejects.toThrow("válida");
    await expect(admin.uploadPhoto({ id: "ODO_TEST", mimeType: "image/png", base64: Buffer.alloc(2 * 1024 * 1024 + 1).toString("base64") })).rejects.toThrow("2 MB");
    await expect(odontomabCrcRouter.createCaller(ctx("user")).uploadPhoto({ id: "ODO_TEST", mimeType: "image/png", base64: png })).rejects.toThrow("Somente a gerência");
    expect(mocks.storagePut).not.toHaveBeenCalled();
  });
  it("separa as tarefas das novas CRCs, de Vivi e das outras clínicas", async () => {
    const caller = odontomabCrcRouter.createCaller(ctx());
    expect(await caller.tasks.list({ crcId: "ODO_TEST", month: "2026-10" })).toEqual([{ crcName: "ODO_TEST", week: 1, taskCount: 105 }]);
    await caller.tasks.save({ crcId: "ODO_TEST", month: "2026-10", week: 5, taskCount: 115, description: "Retornos e contatos" });
    expect(mocks.saveCrcWeeklyActivity).toHaveBeenCalledWith({ crcName: "ODO_TEST", month: "2026-10", week: 5, taskCount: 115, description: "Retornos e contatos", createdBy: 1 });
  });
  it("separa agenda e meta semanal por CRC com S1–S5", async () => {
    const caller = odontomabCrcRouter.createCaller(ctx());
    expect(await caller.appointments.list({ crcId: "ODO_TEST", month: "2026-10" })).toEqual([{ crcName: "ODO_TEST", week: 1, appointmentCount: 30 }]);
    await caller.appointments.save({ crcId: "ODO_TEST", month: "2026-10", week: 2, appointmentCount: 15, weeklyGoal: 20 });
    expect(mocks.saveCrcWeeklyAppointment).toHaveBeenCalledWith({ crcName: "ODO_TEST", month: "2026-10", week: 2, appointmentCount: 15, weeklyGoal: 20, createdBy: 1 });
    await expect(caller.appointments.save({ crcId: "ODO_TEST", month: "2026-10", week: 6, appointmentCount: 15, weeklyGoal: 20 })).rejects.toThrow();
  });
  it("rejeita perfil não cadastrado antes de escrever dados", async () => {
    const caller = odontomabCrcRouter.createCaller(ctx());
    mocks.requireOdontomabCrc.mockRejectedValueOnce(new Error("CRC não cadastrada"));
    await expect(caller.tasks.save({ crcId: "UNKNOWN", month: "2026-10", week: 1, taskCount: 120, description: "Retornos" })).rejects.toThrow("CRC não cadastrada");
    expect(mocks.saveCrcWeeklyActivity).not.toHaveBeenCalled();
  });
  it("retira somente a CRC escolhida com senha correta e sem apagar outros dados", async () => {
    const caller = odontomabCrcRouter.createCaller(ctx());
    await expect(caller.remove({ id: "ODO_TEST", password: "0000" })).resolves.toEqual({ success: true });
    expect(mocks.removeOdontomabCrc).toHaveBeenCalledTimes(1);
    expect(mocks.removeOdontomabCrc).toHaveBeenCalledWith("ODO_TEST", 1);
    expect(mocks.saveCrcWeeklyActivity).not.toHaveBeenCalled();
    expect(mocks.saveCrcWeeklyAppointment).not.toHaveBeenCalled();
    expect(mocks.saveOdontomabCrcPhoto).not.toHaveBeenCalled();
  });
  it("rejeita senha incorreta e retirada sem gerência", async () => {
    await expect(odontomabCrcRouter.createCaller(ctx()).remove({ id: "VAL", password: "1234" })).rejects.toThrow("Senha provisória incorreta");
    await expect(odontomabCrcRouter.createCaller(ctx("user")).remove({ id: "VAL", password: "0000" })).rejects.toThrow("Somente a gerência");
    expect(mocks.removeOdontomabCrc).not.toHaveBeenCalled();
  });
  it("rejeita retirada e reativação sem autenticação", async () => {
    const anonymous = odontomabCrcRouter.createCaller({ ...ctx(), user: null });
    await expect(anonymous.remove({ id: "VAL", password: "0000" })).rejects.toThrow();
    await expect(anonymous.restore({ id: "VAL" })).rejects.toThrow();
    expect(mocks.removeOdontomabCrc).not.toHaveBeenCalled();
    expect(mocks.restoreOdontomabCrc).not.toHaveBeenCalled();
  });
  it("reativa o mesmo perfil e restringe restauração à gerência", async () => {
    await expect(odontomabCrcRouter.createCaller(ctx()).restore({ id: "VAL" })).resolves.toEqual({ success: true });
    expect(mocks.restoreOdontomabCrc).toHaveBeenCalledTimes(1);
    expect(mocks.restoreOdontomabCrc).toHaveBeenCalledWith("VAL");
    await expect(odontomabCrcRouter.createCaller(ctx("user")).restore({ id: "VAL" })).rejects.toThrow("Somente a gerência");
    expect(mocks.createOdontomabCrc).not.toHaveBeenCalled();
  });
  it("lê as semanas históricas retiradas, mas não salva novos dados sem reativar", async () => {
    const caller = odontomabCrcRouter.createCaller(ctx());
    await caller.tasks.list({ crcId: "VAL", month: "2026-10" });
    expect(mocks.requireOdontomabCrc).toHaveBeenCalledWith("VAL", true);
    await caller.appointments.list({ crcId: "VAL", month: "2026-10" });
    expect(mocks.requireOdontomabCrc).toHaveBeenCalledWith("VAL", true);
    mocks.requireOdontomabCrc.mockRejectedValueOnce(new Error("Esta CRC foi retirada"));
    await expect(caller.tasks.save({ crcId: "VAL", month: "2026-10", week: 1, taskCount: 120, description: "Retornos" })).rejects.toThrow("retirada");
    mocks.requireOdontomabCrc.mockRejectedValueOnce(new Error("Esta CRC foi retirada"));
    await expect(caller.appointments.save({ crcId: "VAL", month: "2026-10", week: 1, appointmentCount: 10, weeklyGoal: 20 })).rejects.toThrow("retirada");
    expect(mocks.saveCrcWeeklyActivity).not.toHaveBeenCalled();
    expect(mocks.saveCrcWeeklyAppointment).not.toHaveBeenCalled();
  });
});
