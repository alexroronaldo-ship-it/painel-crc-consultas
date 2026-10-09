import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
const mocks = vi.hoisted(() => ({
  listOrtoCrcs: vi.fn(),
  previewCrcTransfer: vi.fn(),
  restoreOrtoCrc: vi.fn(),
  transferAndRetireCrc: vi.fn(),
}));
vi.mock("./crcTransferDb", () => mocks);
import { crcTransfersRouter } from "./routers/crcTransfers";
const revision = "a".repeat(64);
const input = {
  scope: "odontomab" as const,
  sourceId: "VAL",
  targetId: "ODO_OUTRA",
  password: "0000",
  revision,
  confirmed: true as const,
};
function context(role: "admin" | "user" | null = "admin"): TrpcContext {
  return {
    user: role
      ? {
          id: 7,
          openId: "manager",
          name: "Gerência",
          email: null,
          loginMethod: "manus",
          role,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        }
      : null,
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.previewCrcTransfer.mockResolvedValue({
    sourceName: "Vivi",
    targetName: "Outra CRC",
    recordCount: 3,
    totalValue: "8100.01",
    revision,
  });
  mocks.transferAndRetireCrc.mockResolvedValue({
    success: true,
    recordCount: 3,
    totalValue: "8100.01",
  });
});
describe("API de transferência e retirada", () => {
  it.each(["odontomab", "funnel", "ortho_active"] as const)(
    "encaminha origem, destino e revisão somente para %s",
    async scope => {
      const caller = crcTransfersRouter.createCaller(context());
      await caller.preview({ scope, sourceId: "WISLLAYNI", targetId: "JAYZA" });
      expect(mocks.previewCrcTransfer).toHaveBeenCalledWith(
        scope,
        "WISLLAYNI",
        "JAYZA"
      );
      await caller.transfer({
        ...input,
        scope,
        sourceId: "WISLLAYNI",
        targetId: "JAYZA",
      });
      expect(mocks.transferAndRetireCrc).toHaveBeenCalledWith(
        scope,
        "WISLLAYNI",
        "JAYZA",
        revision,
        7
      );
    }
  );
  it.each(["user", null] as const)(
    "recusa resumo, transferência e restauração por %s",
    async role => {
      const caller = crcTransfersRouter.createCaller(context(role));
      await expect(caller.preview(input)).rejects.toThrow();
      await expect(caller.transfer(input)).rejects.toThrow();
      await expect(
        caller.restoreOrto({ scope: "funnel", crcId: "JAYZA" })
      ).rejects.toThrow();
      expect(mocks.transferAndRetireCrc).not.toHaveBeenCalled();
      expect(mocks.previewCrcTransfer).not.toHaveBeenCalled();
    }
  );
  it("não transfere sem senha correta, consentimento e resumo válido", async () => {
    const caller = crcTransfersRouter.createCaller(context());
    await expect(
      caller.transfer({ ...input, password: "errada" })
    ).rejects.toThrow("Senha provisória incorreta");
    await expect(
      caller.transfer({ ...input, confirmed: false } as never)
    ).rejects.toThrow();
    await expect(caller.transfer({ ...input, revision: "" })).rejects.toThrow();
    expect(mocks.transferAndRetireCrc).not.toHaveBeenCalled();
  });
  it("recusa destino igual à origem", async () => {
    await expect(
      crcTransfersRouter
        .createCaller(context())
        .transfer({ ...input, targetId: "VAL" })
    ).rejects.toThrow("outra CRC");
    expect(mocks.transferAndRetireCrc).not.toHaveBeenCalled();
  });
  it("reativa somente o perfil na página escolhida", async () => {
    const caller = crcTransfersRouter.createCaller(context());
    await caller.restoreOrto({ scope: "ortho_active", crcId: "JAYZA" });
    expect(mocks.restoreOrtoCrc).toHaveBeenCalledWith("ortho_active", "JAYZA");
    expect(mocks.transferAndRetireCrc).not.toHaveBeenCalled();
  });
});
