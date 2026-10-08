import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const { createCampaign, createClosure, createValSale, deleteClosure, deleteEmptyCampaign, deleteValSale, listCampaigns, listCampaignUsage, listClosures, listCrcProfiles, listCrcWeeklyActivities, listCrcWeeklyAppointments, listValSales, mergeCampaigns, saveCrcPhoto, saveCrcWeeklyActivity, saveCrcWeeklyAppointment, storagePut, updateCampaign, updateClosureTime } = vi.hoisted(() => ({
  createCampaign: vi.fn(),
  createClosure: vi.fn(),
  createValSale: vi.fn(),
  deleteClosure: vi.fn(),
  deleteEmptyCampaign: vi.fn(),
  deleteValSale: vi.fn(),
  listCampaigns: vi.fn().mockResolvedValue([]),
  listCampaignUsage: vi.fn().mockResolvedValue([]),
  listClosures: vi.fn().mockResolvedValue([]),
  listCrcProfiles: vi.fn().mockResolvedValue([]),
  listCrcWeeklyActivities: vi.fn().mockResolvedValue([]),
  listCrcWeeklyAppointments: vi.fn().mockResolvedValue([]),
  listValSales: vi.fn().mockResolvedValue([]),
  saveCrcWeeklyActivity: vi.fn(),
  saveCrcPhoto: vi.fn(),
  saveCrcWeeklyAppointment: vi.fn(),
  mergeCampaigns: vi.fn(),
  storagePut: vi.fn().mockResolvedValue({ key: "crc-profiles/wisllayni/portrait_1234.png", url: "/manus-storage/crc-profiles/wisllayni/portrait_1234.png" }),
  updateClosureTime: vi.fn(),
  updateCampaign: vi.fn(),
}));

vi.mock("./db", () => ({
  createCampaign,
  createClosure,
  createValSale,
  listClosures,
  listCrcProfiles,
  listCampaigns,
  listCampaignUsage,
  listCrcWeeklyActivities,
  listCrcWeeklyAppointments,
  listValSales,
  deleteClosure,
  deleteEmptyCampaign,
  deleteValSale,
  mergeCampaigns,
  saveCrcWeeklyActivity,
  saveCrcPhoto,
  saveCrcWeeklyAppointment,
  updateClosureTime,
  updateCampaign,
}));
vi.mock("./storage", () => ({ storagePut }));

import { appRouter } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "manager-user",
    email: "manager@example.com",
    name: "Gerente CRC",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return { user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("closures protected deletion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists CRC photos independently of the selected month", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.crcProfiles.list()).resolves.toEqual([]);
    expect(listCrcProfiles).toHaveBeenCalledOnce();
  });

  it("uploads a validated photo only for its chosen CRC", async () => {
    const caller = appRouter.createCaller(createContext());
    const png = Buffer.from("89504e470d0a1a0a00000000", "hex").toString("base64");
    await expect(caller.crcProfiles.uploadPhoto({ crcName: "WISLLAYNI", mimeType: "image/png", base64: png })).resolves.toEqual({
      success: true,
      photoUrl: "/manus-storage/crc-profiles/wisllayni/portrait_1234.png",
    });
    expect(storagePut).toHaveBeenCalledWith("crc-profiles/wisllayni/portrait.png", expect.any(Buffer), "image/png");
    expect(saveCrcPhoto).toHaveBeenCalledWith(expect.objectContaining({ crcName: "WISLLAYNI", updatedBy: 1 }));
    expect(saveCrcPhoto).not.toHaveBeenCalledWith(expect.objectContaining({ crcName: "JAYZA" }));

    storagePut.mockResolvedValueOnce({ key: "crc-profiles/jayza/portrait_5678.png", url: "/manus-storage/crc-profiles/jayza/portrait_5678.png" });
    await expect(caller.crcProfiles.uploadPhoto({ crcName: "JAYZA", mimeType: "image/png", base64: png })).resolves.toEqual({
      success: true,
      photoUrl: "/manus-storage/crc-profiles/jayza/portrait_5678.png",
    });
    expect(storagePut).toHaveBeenCalledWith("crc-profiles/jayza/portrait.png", expect.any(Buffer), "image/png");
    expect(saveCrcPhoto).toHaveBeenCalledWith(expect.objectContaining({ crcName: "JAYZA", photoUrl: "/manus-storage/crc-profiles/jayza/portrait_5678.png" }));
  });

  it("rejects invalid image content and unknown photo profiles", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.crcProfiles.uploadPhoto({ crcName: "JAYZA", mimeType: "image/png", base64: Buffer.from("not-a-png").toString("base64") })).rejects.toThrow("válida");
    await expect(caller.crcProfiles.uploadPhoto({ crcName: "OUTRO", mimeType: "image/png", base64: "AAAA" } as Parameters<typeof caller.crcProfiles.uploadPhoto>[0])).rejects.toThrow();
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("accepts Vivi's photo under the historical VAL profile without touching CRC sales", async () => {
    const caller = appRouter.createCaller(createContext());
    const png = Buffer.from("89504e470d0a1a0a00000000", "hex").toString("base64");
    await expect(caller.crcProfiles.uploadPhoto({ crcName: "VAL", mimeType: "image/png", base64: png })).resolves.toMatchObject({ success: true });
    expect(storagePut).toHaveBeenCalledWith("crc-profiles/val/portrait.png", expect.any(Buffer), "image/png");
    expect(saveCrcPhoto).toHaveBeenCalledWith(expect.objectContaining({ crcName: "VAL", updatedBy: 1 }));
  });

  it("only allows admins to upload CRC photos", async () => {
    const context = createContext();
    context.user!.role = "user";
    const caller = appRouter.createCaller(context);
    await expect(caller.crcProfiles.uploadPhoto({ crcName: "JAYZA", mimeType: "image/png", base64: Buffer.from("89504e470d0a1a0a", "hex").toString("base64") })).rejects.toThrow("Somente a gerência");
    expect(storagePut).not.toHaveBeenCalled();
  });

  it("rejects the wrong password without deleting one record", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.closures.deleteOne({ id: 7, password: "1234" })).rejects.toThrow("Senha provisória incorreta");
    expect(deleteClosure).not.toHaveBeenCalled();
  });

  it("deletes one record with the provisional password", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.closures.deleteOne({ id: 7, password: "0000" })).resolves.toEqual({ success: true });
    expect(deleteClosure).toHaveBeenCalledWith(7);
  });

  it("updates the time of only the selected closure", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.closures.updateTime({ id: 7, totalTimeSeconds: 95 })).resolves.toEqual({ success: true });
    expect(updateClosureTime).toHaveBeenCalledWith(7, 95);
  });

  it("rejects invalid time values", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.closures.updateTime({ id: 7, totalTimeSeconds: -1 })).rejects.toThrow();
    expect(updateClosureTime).not.toHaveBeenCalled();
  });

  it("forwards the selected month to the dashboard query", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.closures.list({ month: "2026-09" })).resolves.toEqual([]);
    expect(listClosures).toHaveBeenCalledWith("2026-09");
  });

  it("lists and saves one weekly activity for the selected CRC", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.weeklyActivities.list({ month: "2026-09" })).resolves.toEqual([]);
    expect(listCrcWeeklyActivities).toHaveBeenCalledWith("2026-09");

    await expect(caller.weeklyActivities.save({
      crcName: "WISLLAYNI",
      month: "2026-09",
      week: 5,
      taskCount: 120,
      description: "Retornos, contatos e atualização da agenda",
    })).resolves.toEqual({ success: true });
    expect(saveCrcWeeklyActivity).toHaveBeenCalledWith(expect.objectContaining({
      crcName: "WISLLAYNI",
      month: "2026-09",
      week: 5,
      taskCount: 120,
      createdBy: 1,
    }));
  });

  it("rejects a weekly activity outside S1 to S5", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.weeklyActivities.save({
      crcName: "JAYZA",
      month: "2026-09",
      week: 6,
      taskCount: 100,
      description: "Atividade inválida",
    })).rejects.toThrow();
    expect(saveCrcWeeklyActivity).not.toHaveBeenCalled();
  });

  it("accepts weekly tasks for Val without adding her to closure sales", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.weeklyActivities.save({
      crcName: "VAL",
      month: "2026-09",
      week: 2,
      taskCount: 105,
      description: "Confirmações e contatos da semana",
    })).resolves.toEqual({ success: true });
    expect(saveCrcWeeklyActivity).toHaveBeenCalledWith(expect.objectContaining({ crcName: "VAL", week: 2, taskCount: 105 }));
  });

  it("stores appointments and a different goal for each selected week", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.weeklyAppointments.list({ month: "2026-09" })).resolves.toEqual([]);
    expect(listCrcWeeklyAppointments).toHaveBeenCalledWith("2026-09");

    await expect(caller.weeklyAppointments.save({
      crcName: "JAYZA",
      month: "2026-09",
      week: 3,
      appointmentCount: 42,
      weeklyGoal: 50,
    })).resolves.toEqual({ success: true });
    expect(saveCrcWeeklyAppointment).toHaveBeenCalledWith(expect.objectContaining({
      crcName: "JAYZA",
      week: 3,
      appointmentCount: 42,
      weeklyGoal: 50,
      createdBy: 1,
    }));

    await expect(caller.weeklyAppointments.save({
      crcName: "VAL",
      month: "2026-09",
      week: 4,
      appointmentCount: 35,
      weeklyGoal: 40,
    })).resolves.toEqual({ success: true });
    expect(saveCrcWeeklyAppointment).toHaveBeenCalledWith(expect.objectContaining({ crcName: "VAL", week: 4, appointmentCount: 35, weeklyGoal: 40 }));
  });

  it("creates and lists campaigns with a weekly goal", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.campaigns.list()).resolves.toEqual([]);
    expect(listCampaigns).toHaveBeenCalledTimes(1);

    await expect(caller.campaigns.create({
      name: "Implante de setembro",
      origin: "Instagram",
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      weeklyGoal: "37500,00",
    })).resolves.toEqual({ success: true });
    expect(createCampaign).toHaveBeenCalledWith(expect.objectContaining({
      name: "Implante de setembro",
      origin: "Instagram",
      weeklyGoal: "37500.00",
      createdBy: 1,
    }));
  });

  it("rejects a campaign ending before it starts", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.campaigns.create({
      name: "Campanha inválida",
      origin: "Google",
      startDate: "2026-09-30",
      endDate: "2026-09-01",
      weeklyGoal: "37500",
    })).rejects.toThrow("A data final deve ser igual ou posterior à data inicial");
    expect(createCampaign).not.toHaveBeenCalled();
  });

  it("edits a campaign's name, origin, dates and weekly goal", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.campaigns.update({ id: 8, name: "Campanha corrigida", origin: "Indicação", startDate: "2026-09-01", weeklyGoal: "12000,50" })).resolves.toEqual({ success: true });
    expect(updateCampaign).toHaveBeenCalledWith(8, { name: "Campanha corrigida", origin: "Indicação", startDate: "2026-09-01", endDate: null, weeklyGoal: "12000.50" });
  });

  it("restricts campaign corrections and deletions to managers", async () => {
    const context = createContext();
    context.user!.role = "user";
    const caller = appRouter.createCaller(context);
    await expect(caller.campaigns.update({ id: 8, name: "Alteração", origin: "Indicação", startDate: "2026-09-01", weeklyGoal: "12000" })).rejects.toThrow("Somente a gerência");
    await expect(caller.campaigns.deleteOne({ id: 8, password: "0000" })).rejects.toThrow("Somente a gerência");
    expect(updateCampaign).not.toHaveBeenCalled();
    expect(deleteEmptyCampaign).not.toHaveBeenCalled();
  });

  it("protects deletion and merging of duplicate campaigns with a password", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.campaigns.deleteOne({ id: 8, password: "errada" })).rejects.toThrow("Senha provisória incorreta");
    expect(deleteEmptyCampaign).not.toHaveBeenCalled();
    await expect(caller.campaigns.deleteOne({ id: 8, password: "0000" })).resolves.toEqual({ success: true });
    expect(deleteEmptyCampaign).toHaveBeenCalledWith(8);
    await expect(caller.campaigns.merge({ sourceId: 8, targetId: 9, password: "errada" })).rejects.toThrow("Senha provisória incorreta");
    expect(mergeCampaigns).not.toHaveBeenCalled();
    await expect(caller.campaigns.merge({ sourceId: 8, targetId: 9, password: "0000" })).resolves.toEqual({ success: true });
    expect(mergeCampaigns).toHaveBeenCalledWith(8, 9);
  });

  it("shows the explicit merge requirement when a campaign still has linked sales", async () => {
    deleteEmptyCampaign.mockRejectedValueOnce(new Error("Esta campanha tem fechamentos: mescle-a com outra campanha antes de excluir"));
    const caller = appRouter.createCaller(createContext());
    await expect(caller.campaigns.deleteOne({ id: 8, password: "0000" })).rejects.toThrow("mescle-a com outra campanha");
    expect(mergeCampaigns).not.toHaveBeenCalled();
  });

  it("links a simplified closure to the selected campaign", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.closures.create({
      crcName: "WISLLAYNI",
      patientName: "Paciente Campanha",
      phone: "11999990000",
      closingDate: "2026-09-18",
      closedItem: "Procedimento",
      value: "8100,00",
      totalTimeSeconds: 90,
      internalStatus: "closed",
      campaignId: 4,
    })).resolves.toEqual({ success: true });
    expect(createClosure).toHaveBeenCalledWith(expect.objectContaining({ campaignId: 4, value: "8100.00" }));
  });

  it("rejects Val as a closure CRC to keep her sales separate", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.closures.create({
      crcName: "VAL",
      patientName: "Paciente Teste",
      phone: "11999990000",
      closingDate: "2026-09-18",
      closedItem: "Procedimento",
      value: "1000,00",
      totalTimeSeconds: 90,
      internalStatus: "closed",
    } as Parameters<typeof caller.closures.create>[0])).rejects.toThrow();
    expect(createClosure).not.toHaveBeenCalled();
  });

  it("creates and lists Val sales in the independent data source", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.valSales.list({ month: "2026-09" })).resolves.toEqual([]);
    expect(listValSales).toHaveBeenCalledWith("2026-09");

    await expect(caller.valSales.create({ patientName: "Paciente Teste", patientType: "active", saleDate: "2026-09-19", value: "2500,50", totalTimeSeconds: 90, insurancePlan: "Rede Unna (Odontoprev)", notes: "Venda própria" })).resolves.toEqual({ success: true });
    expect(createValSale).toHaveBeenCalledWith(expect.objectContaining({ saleDate: "2026-09-19", value: "2500.50", totalTimeSeconds: 90, insurancePlan: "Rede Unna (Odontoprev)", notes: "Venda própria" }));
  });

  it("rejects an insurance plan outside the Odontomab list", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.valSales.create({
      saleDate: "2026-09-19",
      value: "1000,00",
      totalTimeSeconds: 90,
      insurancePlan: "Outro convênio",
    } as Parameters<typeof caller.valSales.create>[0])).rejects.toThrow();
    expect(createValSale).not.toHaveBeenCalled();
  });

  it("protects deletion of a Val sale with the provisional password", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.valSales.deleteOne({ id: 9, password: "1234" })).rejects.toThrow("Senha provisória incorreta");
    expect(deleteValSale).not.toHaveBeenCalled();
    await expect(caller.valSales.deleteOne({ id: 9, password: "0000" })).resolves.toEqual({ success: true });
    expect(deleteValSale).toHaveBeenCalledWith(9);
  });
});
