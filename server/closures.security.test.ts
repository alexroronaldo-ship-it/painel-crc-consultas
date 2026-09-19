import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const { createClosure, createValSale, deleteAllClosures, deleteClosure, deleteValSale, listClosures, listValSales } = vi.hoisted(() => ({
  createClosure: vi.fn(),
  createValSale: vi.fn(),
  deleteAllClosures: vi.fn(),
  deleteClosure: vi.fn(),
  deleteValSale: vi.fn(),
  listClosures: vi.fn().mockResolvedValue([]),
  listValSales: vi.fn().mockResolvedValue([]),
}));

vi.mock("./db", () => ({
  createClosure,
  createValSale,
  listClosures,
  listValSales,
  deleteAllClosures,
  deleteClosure,
  deleteValSale,
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

  it("clears all records only with the provisional password", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.closures.clearTestData({ password: "0000" })).resolves.toEqual({ success: true });
    expect(deleteAllClosures).toHaveBeenCalledTimes(1);
  });

  it("forwards the selected month to the dashboard query", async () => {
    const caller = appRouter.createCaller(createContext());
    await expect(caller.closures.list({ month: "2026-09" })).resolves.toEqual([]);
    expect(listClosures).toHaveBeenCalledWith("2026-09");
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
