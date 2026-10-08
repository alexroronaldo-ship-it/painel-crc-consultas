import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb }));
import { removeOdontomabCrc, requireOdontomabCrc, restoreOdontomabCrc } from "./odontomabCrcDb";
import { odontomabCrcs } from "../drizzle/schema";

describe("Retirada não destrutiva de CRC da Odontomab", () => {
  let fixture: { id: string; name: string; isActive: boolean; photoKey: string; photoUrl: string; removedAt?: Date | null; removedBy?: number | null };
  let database: { select: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> };
  let set: ReturnType<typeof vi.fn>;
  let limit: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fixture = { id: "VAL", name: "Vivi", isActive: true, photoKey: "portrait.png", photoUrl: "/manus-storage/portrait.png" };
    limit = vi.fn().mockImplementation(async () => [{ ...fixture }]);
    set = vi.fn().mockImplementation((patch: object) => ({ where: vi.fn().mockImplementation(async () => { Object.assign(fixture, patch); }) }));
    database = { select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit }) }) }), update: vi.fn().mockReturnValue({ set }), delete: vi.fn() };
    mocks.getDb.mockResolvedValue(database);
  });
  it("retira e reativa o mesmo ID sem apagar quaisquer linhas ou imagens", async () => {
    const preserved = { id: fixture.id, name: fixture.name, photoKey: fixture.photoKey, photoUrl: fixture.photoUrl };
    await removeOdontomabCrc("VAL", 1);
    expect(fixture).toMatchObject({ ...preserved, isActive: false, removedBy: 1 });
    expect(fixture.removedAt).toBeInstanceOf(Date);
    expect(set).toHaveBeenCalledWith({ isActive: false, removedBy: 1, removedAt: expect.any(Date) });
    expect(database.update).toHaveBeenCalledWith(odontomabCrcs);
    await expect(requireOdontomabCrc("VAL")).rejects.toThrow("retirada");
    await expect(requireOdontomabCrc("VAL", true)).resolves.toMatchObject(preserved);
    await restoreOdontomabCrc("VAL");
    expect(fixture).toMatchObject({ ...preserved, isActive: true, removedBy: null, removedAt: null });
    await expect(requireOdontomabCrc("VAL")).resolves.toMatchObject(preserved);
    expect(database.delete).not.toHaveBeenCalled();
    expect(database.update.mock.calls.every(([table]) => table === odontomabCrcs)).toBe(true);
  });
  it("valida existência antes de atualizar um perfil", async () => {
    limit.mockResolvedValueOnce([]);
    await expect(removeOdontomabCrc("UNKNOWN", 1)).rejects.toThrow("não cadastrada");
    expect(database.update).not.toHaveBeenCalled();
  });
});
