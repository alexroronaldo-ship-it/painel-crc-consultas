import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const { createCampaign, createClosure, createValSale, deleteClosure, deleteValSale, listCampaigns, listClosures, listValSales, updateClosureTime } = vi.hoisted(() => ({
  createCampaign: vi.fn(),
  createClosure: vi.fn(),
  createValSale: vi.fn(),
  deleteClosure: vi.fn(),
  deleteValSale: vi.fn(),
  listCampaigns: vi.fn().mockResolvedValue([]),
  listClosures: vi.fn().mockResolvedValue([]),
  listValSales: vi.fn().mockResolvedValue([]),
  updateClosureTime: vi.fn(),
}));

vi.mock("./db", () => ({
  createCampaign,
  createClosure,
  createValSale,
  listClosures,
  listCampaigns,
  listValSales,
  deleteClosure,
  deleteValSale,
  updateClosureTime,
}));

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

  it("creates and lists campaigns with a weekly goal", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.campaigns.list()).resolves.toEqual([]);
    expect(listCampaigns).toHaveBeenCalledTimes(1);

    await expect(caller.campaigns.create({
      name: "Implante de setembro",
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      weeklyGoal: "37500,00",
    })).resolves.toEqual({ success: true });
    expect(createCampaign).toHaveBeenCalledWith(expect.objectContaining({
      name: "Implante de setembro",
      weeklyGoal: "37500.00",
      createdBy: 1,
    }));
  });

  it("rejects a campaign ending before it starts", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.campaigns.create({
      name: "Campanha inválida",
      startDate: "2026-09-30",
      endDate: "2026-09-01",
      weeklyGoal: "37500",
    })).rejects.toThrow("A data final deve ser igual ou posterior à data inicial");
    expect(createCampaign).not.toHaveBeenCalled();
  });

  it("links a closure to the selected campaign", async () => {
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
      internalClosingDate: "2026-09-18",
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
      internalClosingDate: "2026-09-18",
    } as Parameters<typeof caller.closures.create>[0])).rejects.toThrow();
    expect(createClosure).not.toHaveBeenCalled();
  });

  it("creates and lists Val sales in the independent data source", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.valSales.list({ month: "2026-09" })).resolves.toEqual([]);
    expect(listValSales).toHaveBeenCalledWith("2026-09");

    await expect(caller.valSales.create({ saleDate: "2026-09-19", value: "2500,50", notes: "Venda própria" })).resolves.toEqual({ success: true });
    expect(createValSale).toHaveBeenCalledWith(expect.objectContaining({ saleDate: "2026-09-19", value: "2500.50", notes: "Venda própria" }));
  });

  it("protects deletion of a Val sale with the provisional password", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.valSales.deleteOne({ id: 9, password: "1234" })).rejects.toThrow("Senha provisória incorreta");
    expect(deleteValSale).not.toHaveBeenCalled();
    await expect(caller.valSales.deleteOne({ id: 9, password: "0000" })).resolves.toEqual({ success: true });
    expect(deleteValSale).toHaveBeenCalledWith(9);
  });
});
