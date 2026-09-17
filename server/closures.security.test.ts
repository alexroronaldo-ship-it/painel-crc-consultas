import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const { deleteAllClosures, deleteClosure } = vi.hoisted(() => ({
  deleteAllClosures: vi.fn(),
  deleteClosure: vi.fn(),
}));

vi.mock("./db", () => ({
  createClosure: vi.fn(),
  listClosures: vi.fn().mockResolvedValue([]),
  deleteAllClosures,
  deleteClosure,
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
});
