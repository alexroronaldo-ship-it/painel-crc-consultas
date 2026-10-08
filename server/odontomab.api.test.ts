import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { ODONTOMAB_INSURANCE_PLANS } from "../shared/odontomab";
const mocks = vi.hoisted(() => ({ createValSale: vi.fn(), deleteValSale: vi.fn(), getValSale: vi.fn().mockResolvedValue({ id: 9 }), listValSales: vi.fn().mockResolvedValue([]), saveValPatientPhoto: vi.fn(), updateValSale: vi.fn(), storagePut: vi.fn().mockResolvedValue({ key: "patient-photo.png", url: "/manus-storage/patient-photo.png" }) }));
vi.mock("./db", () => mocks);
vi.mock("./storage", () => ({ storagePut: mocks.storagePut }));
import { odontomabRouter } from "./routers/odontomab";
function ctx(role: "admin" | "user" = "admin"): TrpcContext {
  return { user: { id: 1, openId: "test", name: "Gerência", email: null, loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
}
const input = { patientName: "Paciente exemplo", patientType: "active", saleDate: "2026-10-08", value: "2500,50", insurancePlan: "Rede Unna (Odontoprev)" } as const;
const png = Buffer.from("89504e470d0a1a0a00000000", "hex").toString("base64");

describe("Odontomab — pacientes ativos e novos", () => {
  beforeEach(() => vi.clearAllMocks());
  it("registra nome, tipo e convênio e dispensa o tempo de atendimento", async () => {
    const caller = odontomabRouter.createCaller(ctx());
    await expect(caller.create(input)).resolves.toEqual({ success: true });
    expect(mocks.createValSale).toHaveBeenCalledWith(expect.objectContaining({ patientName: "Paciente exemplo", patientType: "active", value: "2500.50", insurancePlan: "Rede Unna (Odontoprev)", totalTimeSeconds: 0, createdBy: 1 }));
  });
  it("permite os cinco convênios definidos e paciente novo", async () => {
    const caller = odontomabRouter.createCaller(ctx());
    for (const insurancePlan of ODONTOMAB_INSURANCE_PLANS) await caller.create({ ...input, patientType: "new", insurancePlan });
    expect(mocks.createValSale).toHaveBeenCalledTimes(5);
    expect(mocks.createValSale).toHaveBeenCalledWith(expect.objectContaining({ patientType: "new", insurancePlan: "Hapvida" }));
  });
  it("rejeita nome vazio, tipo ausente e convênio fora da lista", async () => {
    const caller = odontomabRouter.createCaller(ctx());
    await expect(caller.create({ ...input, patientName: " " })).rejects.toThrow();
    await expect(caller.create({ ...input, patientType: undefined } as unknown as Parameters<typeof caller.create>[0])).rejects.toThrow();
    await expect(caller.create({ ...input, insurancePlan: "Outro" } as unknown as Parameters<typeof caller.create>[0])).rejects.toThrow();
    expect(mocks.createValSale).not.toHaveBeenCalled();
  });
  it("corrige registro existente sem apagar vendas nem tocar a foto", async () => {
    const caller = odontomabRouter.createCaller(ctx());
    await caller.update({ ...input, id: 9, patientType: "new", insurancePlan: "Amil" });
    expect(mocks.updateValSale).toHaveBeenCalledWith(9, expect.objectContaining({ patientType: "new", insurancePlan: "Amil", value: "2500.50" }));
    expect(mocks.deleteValSale).not.toHaveBeenCalled();
    expect(mocks.saveValPatientPhoto).not.toHaveBeenCalled();
  });
  it("não expõe a chave de armazenamento ao listar fotos", async () => {
    mocks.listValSales.mockResolvedValueOnce([{ id: 9, patientName: "Paciente", photoKey: "privada", photoUrl: "/manus-storage/photo.png", patientType: null }]);
    const caller = odontomabRouter.createCaller(ctx());
    expect(await caller.list({ month: "2026-10" })).toEqual([{ id: 9, patientName: "Paciente", photoUrl: "/manus-storage/photo.png", patientType: null }]);
    expect(mocks.listValSales).toHaveBeenCalledWith("2026-10");
  });
  it("envia e vincula a foto somente ao paciente selecionado", async () => {
    const caller = odontomabRouter.createCaller(ctx());
    await expect(caller.uploadPatientPhoto({ id: 9, mimeType: "image/png", base64: png })).resolves.toMatchObject({ success: true });
    expect(mocks.getValSale).toHaveBeenCalledWith(9);
    expect(mocks.storagePut).toHaveBeenCalledWith("odontomab-patients/9/photo.png", expect.any(Buffer), "image/png");
    expect(mocks.saveValPatientPhoto).toHaveBeenCalledWith(9, "patient-photo.png", "/manus-storage/patient-photo.png");
  });
  it("rejeita fotos inválidas e impede upload sem gerência", async () => {
    const admin = odontomabRouter.createCaller(ctx());
    await expect(admin.uploadPatientPhoto({ id: 9, mimeType: "image/png", base64: Buffer.from("invalid").toString("base64") })).rejects.toThrow("válida");
    const ordinary = odontomabRouter.createCaller(ctx("user"));
    await expect(ordinary.uploadPatientPhoto({ id: 9, mimeType: "image/png", base64: png })).rejects.toThrow("Somente a gerência");
    expect(mocks.storagePut).not.toHaveBeenCalled();
    expect(mocks.saveValPatientPhoto).not.toHaveBeenCalled();
  });
  it("rejeita foto para paciente inexistente antes de gravar arquivo", async () => {
    mocks.getValSale.mockRejectedValueOnce(new Error("Paciente não encontrado"));
    const caller = odontomabRouter.createCaller(ctx());
    await expect(caller.uploadPatientPhoto({ id: 999, mimeType: "image/png", base64: png })).rejects.toThrow("Paciente não encontrado");
    expect(mocks.storagePut).not.toHaveBeenCalled();
  });
});
