import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dashboard = vi.hoisted(() => vi.fn().mockResolvedValue({ month: "2026-10", marketing: { records: [], tasks: [], appointments: [] }, ortho: { records: [], goals: [], weekly: [] }, odontomab: { crcs: [], records: [], tasks: [], appointments: [] } }));
vi.mock("./managerDb", () => ({ getManagerDashboard: dashboard }));
import { appRouter } from "./routers";

function context(role: "admin" | "user" = "admin"): TrpcContext {
  return { user: { id: 7, openId: "manager-test", name: "Gerência", email: null, loginMethod: "manus", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
}

describe("Painel da gerente", () => {
  it("exige a senha mesmo para a gerente autenticada", async () => {
    const caller = appRouter.createCaller(context());
    await expect(caller.manager.dashboard({ month: "2026-10", password: "errada" })).rejects.toThrow("Senha da gerente incorreta");
    expect(dashboard).not.toHaveBeenCalled();
  });

  it("libera somente o mês solicitado com a senha correta", async () => {
    const caller = appRouter.createCaller(context());
    await expect(caller.manager.dashboard({ month: "2026-10", password: "0000" })).resolves.toMatchObject({ month: "2026-10" });
    expect(dashboard).toHaveBeenCalledWith("2026-10");
  });

  it("bloqueia usuários que não são administradores", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.manager.dashboard({ month: "2026-10", password: "0000" })).rejects.toThrow();
    expect(dashboard).toHaveBeenCalledTimes(1);
  });
});
