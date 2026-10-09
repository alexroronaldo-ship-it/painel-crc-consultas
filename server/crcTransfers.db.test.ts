import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
import { MySqlDialect } from "drizzle-orm/mysql-core";
const mocks = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("./db", () => ({ getDb: mocks.getDb }));
import {
  assertOrtoCrcActive,
  listOrtoCrcs,
  previewCrcTransfer,
  restoreOrtoCrc,
  transferAndRetireCrc,
  transferSnapshot,
} from "./crcTransferDb";
import { withActiveCrcWrite } from "./crcWriteGuard";
import { calculateCommission } from "../client/src/lib/commission";
import { calculateActiveMetrics } from "../client/src/lib/ortho-active";
import {
  calculateOdontomabMetrics,
  salesForOdontomabCrc,
} from "../shared/odontomab";

type Row = Record<string, any>;
let data: Record<string, Row[]>;
let calls: Array<{ action: string; table: string; patch?: Row }>;
let failAudit = false;
const dialect = new MySqlDialect();
function matches(row: Row, clause: any) {
  if (!clause) return true;
  const { sql, params } = dialect.sqlToQuery(clause);
  const conditions =
    sql.match(/`[a-zA-Z_]+`\.`[a-zA-Z]+` (?:= \?|in \([^)]*\))/g) ?? [];
  let offset = 0;
  return conditions.every(condition => {
    const column = condition.match(/\.`([^`]+)`/)![1];
    const count = (condition.match(/\?/g) ?? []).length;
    const args = params.slice(offset, offset + count);
    offset += count;
    return args.includes(row[column]);
  });
}
function dbMock() {
  const database: any = {
    select: () => ({
      from: (table: any) => {
        const name = getTableName(table);
        let clause: any;
        const run = () =>
          (data[name] ?? [])
            .filter(row => matches(row, clause))
            .map(row => ({ ...row }));
        const query: any = {
          where: (condition: any) => {
            clause = condition;
            return query;
          },
          orderBy: () => query,
          for: () => query,
          then: (resolve: any, reject: any) =>
            Promise.resolve().then(run).then(resolve, reject),
        };
        return query;
      },
    }),
    update: (table: any) => ({
      set: (patch: Row) => ({
        where: async (clause: any) => {
          const name = getTableName(table);
          calls.push({ action: "update", table: name, patch });
          for (const row of data[name])
            if (matches(row, clause)) Object.assign(row, patch);
        },
      }),
    }),
    insert: (table: any) => ({
      values: (patch: Row) => {
        const name = getTableName(table);
        let duplicateSet: Row | undefined;
        const query: any = {
          onDuplicateKeyUpdate: ({ set }: { set: Row }) => {
            duplicateSet = set;
            return query;
          },
          then: (resolve: any, reject: any) =>
            Promise.resolve()
              .then(() => {
                if (name === "crc_transfers" && failAudit)
                  throw new Error("Falha de auditoria simulada");
                calls.push({ action: "insert", table: name, patch });
                if (name === "orto_crc_states") {
                  const existing = data[name].find(
                    row =>
                      row.scope === patch.scope && row.crcId === patch.crcId
                  );
                  if (existing) {
                    Object.assign(existing, duplicateSet);
                    return;
                  }
                }
                data[name].push({ ...patch });
              })
              .then(resolve, reject),
        };
        return query;
      },
    }),
    transaction: async (work: any) => {
      const backup = structuredClone(data);
      try {
        return await work(database);
      } catch (error) {
        data = backup;
        throw error;
      }
    },
  };
  return database;
}
beforeEach(() => {
  vi.clearAllMocks();
  failAudit = false;
  calls = [];
  const base = {
    patientName: "Paciente",
    phone: "11999990000",
    closingDate: "2026-09-01",
    totalTimeSeconds: 95,
    internalStatus: "closed",
    campaignId: 9,
    createdBy: 3,
    photoKey: "photo.png",
    photoUrl: "/photo.png",
  };
  data = {
    odontomab_crcs: [
      { id: "VAL", name: "Vivi", isActive: true, photoUrl: "/vivi.png" },
      {
        id: "ODO_ALICE",
        name: "Alice",
        isActive: true,
        photoUrl: "/alice.png",
      },
    ],
    val_sales: [
      {
        ...base,
        id: 1,
        crcId: "VAL",
        value: "8100.01",
        patientType: "active",
        insurancePlan: "Particular",
        saleDate: "2026-09-01",
      },
      {
        ...base,
        id: 2,
        crcId: "VAL",
        value: "0.09",
        patientType: "new",
        insurancePlan: "Amil",
        saleDate: "2026-10-02",
      },
      { ...base, id: 3, crcId: "ODO_ALICE", value: "900.00" },
    ],
    closures: [
      { ...base, id: 4, crcName: "WISLLAYNI", value: "200.01" },
      { ...base, id: 5, crcName: "JAYZA", value: "300.00" },
    ],
    ortho_active_patients: [
      { ...base, id: 6, crcName: "WISLLAYNI", value: "400.00" },
      { ...base, id: 7, crcName: "JAYZA", value: "500.00" },
    ],
    orto_crc_states: [],
    crc_transfers: [],
    crc_weekly_activities: [{ crcName: "WISLLAYNI", taskCount: 100 }],
    ortho_active_goals: [{ crcName: "WISLLAYNI", monthlyGoal: "75000.00" }],
  };
  mocks.getDb.mockResolvedValue(dbMock());
});
describe("Transferência transacional de CRC", () => {
  it("resumo lê todos os meses e soma centavos exatos sem escrever", async () => {
    expect(
      await previewCrcTransfer("odontomab", "VAL", "ODO_ALICE")
    ).toMatchObject({
      recordCount: 2,
      totalValue: "8100.10",
      sourceName: "Vivi",
      targetName: "Alice",
    });
    expect(calls).toHaveLength(0);
  });
  it.each([
    ["odontomab", "VAL", "ODO_ALICE", "val_sales", "crcId"],
    ["funnel", "WISLLAYNI", "JAYZA", "closures", "crcName"],
    ["ortho_active", "WISLLAYNI", "JAYZA", "ortho_active_patients", "crcName"],
  ] as const)(
    "move apenas vínculos de %s e registra autoria sem alterar outros dados",
    async (scope, source, target, table, field) => {
      const before = structuredClone(data);
      const summary = await previewCrcTransfer(scope, source, target);
      const result = await transferAndRetireCrc(
        scope,
        source,
        target,
        summary.revision,
        7
      );
      expect(result).toMatchObject({
        success: true,
        recordCount: summary.recordCount,
        totalValue: summary.totalValue,
      });
      expect(data[table]).toEqual(
        before[table].map(row =>
          row[field] === source ? { ...row, [field]: target } : row
        )
      );
      for (const other of [
        "val_sales",
        "closures",
        "ortho_active_patients",
        "crc_weekly_activities",
        "ortho_active_goals",
      ].filter(name => name !== table))
        expect(data[other]).toEqual(before[other]);
      expect(data.crc_transfers[0]).toMatchObject({
        scope,
        sourceId: source,
        targetId: target,
        performedBy: 7,
        totalValue: summary.totalValue,
        recordIds: JSON.stringify(
          before[table].filter(row => row[field] === source).map(row => row.id)
        ),
      });
      expect(calls.some(call => call.action === "delete")).toBe(false);
      if (scope === "odontomab")
        expect(data.odontomab_crcs[0]).toMatchObject({
          id: "VAL",
          isActive: false,
          photoUrl: "/vivi.png",
          name: "Vivi",
        });
      else {
        await expect(assertOrtoCrcActive(scope, source)).rejects.toThrow(
          "retirada"
        );
        await expect(
          assertOrtoCrcActive(
            scope === "funnel" ? "ortho_active" : "funnel",
            source
          )
        ).resolves.toBeUndefined();
      }
    }
  );
  it("não deixa pacientes movidos se a auditoria falhar", async () => {
    const summary = await previewCrcTransfer("odontomab", "VAL", "ODO_ALICE");
    const before = structuredClone(data);
    failAudit = true;
    await expect(
      transferAndRetireCrc("odontomab", "VAL", "ODO_ALICE", summary.revision, 7)
    ).rejects.toThrow("auditoria");
    expect(data).toEqual(before);
  });
  it("recalcula comissão individual, preservando o total da equipe em cada módulo", async () => {
    const odoBefore = calculateOdontomabMetrics(data.val_sales as any).total
      .revenue;
    const summary = await previewCrcTransfer("odontomab", "VAL", "ODO_ALICE");
    await transferAndRetireCrc(
      "odontomab",
      "VAL",
      "ODO_ALICE",
      summary.revision,
      7
    );
    expect(
      calculateOdontomabMetrics(
        salesForOdontomabCrc(data.val_sales as any, "VAL")
      ).total.commission
    ).toBe(0);
    expect(
      calculateOdontomabMetrics(
        salesForOdontomabCrc(data.val_sales as any, "ODO_ALICE")
      ).total.commission
    ).toBeCloseTo(odoBefore * 0.002);
    expect(calculateOdontomabMetrics(data.val_sales as any).total.revenue).toBe(
      odoBefore
    );
    const activeBefore = calculateActiveMetrics(
      data.ortho_active_patients as any
    ).revenue;
    const active = await previewCrcTransfer(
      "ortho_active",
      "WISLLAYNI",
      "JAYZA"
    );
    await transferAndRetireCrc(
      "ortho_active",
      "WISLLAYNI",
      "JAYZA",
      active.revision,
      7
    );
    expect(
      calculateActiveMetrics(
        data.ortho_active_patients.filter(row => row.crcName === "JAYZA") as any
      ).commission
    ).toBeCloseTo(activeBefore * 0.002);
    const funnelBefore = data.closures.reduce(
      (sum, row) => sum + Number(row.value),
      0
    );
    const funnel = await previewCrcTransfer("funnel", "WISLLAYNI", "JAYZA");
    await transferAndRetireCrc(
      "funnel",
      "WISLLAYNI",
      "JAYZA",
      funnel.revision,
      7
    );
    expect(
      calculateCommission(
        data.closures
          .filter(row => row.crcName === "JAYZA")
          .reduce((sum, row) => sum + Number(row.value), 0)
      )
    ).toBe(calculateCommission(funnelBefore));
    expect(data.closures.reduce((sum, row) => sum + Number(row.value), 0)).toBe(
      funnelBefore
    );
  });
  it("recusa resumo desatualizado sem transferir ou retirar", async () => {
    const summary = await previewCrcTransfer("odontomab", "VAL", "ODO_ALICE");
    data.val_sales[0].patientName = "Paciente corrigido";
    const before = structuredClone(data);
    await expect(
      transferAndRetireCrc("odontomab", "VAL", "ODO_ALICE", summary.revision, 7)
    ).rejects.toThrow("Atualize o resumo");
    expect(data).toEqual(before);
  });
  it("recusa CRC inexistente, mesmo destino, destino retirado e IDs de outra clínica", async () => {
    await expect(previewCrcTransfer("odontomab", "VAL", "VAL")).rejects.toThrow(
      "diferente"
    );
    await expect(
      previewCrcTransfer("odontomab", "VAL", "WISLLAYNI")
    ).rejects.toThrow("não cadastrada");
    await expect(previewCrcTransfer("funnel", "VAL", "JAYZA")).rejects.toThrow(
      "desta página"
    );
    data.odontomab_crcs[1].isActive = false;
    await expect(
      previewCrcTransfer("odontomab", "VAL", "ODO_ALICE")
    ).rejects.toThrow("retirada");
    expect(calls).toHaveLength(0);
  });
  it("reativar não reverte vínculos e não muda a outra página", async () => {
    const summary = await previewCrcTransfer("funnel", "WISLLAYNI", "JAYZA");
    await transferAndRetireCrc(
      "funnel",
      "WISLLAYNI",
      "JAYZA",
      summary.revision,
      7
    );
    await restoreOrtoCrc("funnel", "WISLLAYNI");
    expect((await listOrtoCrcs("funnel"))[0].isActive).toBe(true);
    expect(data.closures[0].crcName).toBe("JAYZA");
    expect(data.ortho_active_patients[0].crcName).toBe("WISLLAYNI");
  });
  it("CRC retirada não recebe novas gravações", async () => {
    const work = vi.fn();
    data.odontomab_crcs[0].isActive = false;
    await expect(withActiveCrcWrite("odontomab", "VAL", work)).rejects.toThrow(
      "retirada"
    );
    expect(work).not.toHaveBeenCalled();
  });
  it("checksum muda por ID, paciente, valor ou destino", () => {
    const rows = [{ id: 1, value: "1.01", patientName: "Ana" }];
    const result = transferSnapshot(rows, { targetId: "A" });
    expect(result.totalValue).toBe("1.01");
    expect(
      transferSnapshot([{ ...rows[0], id: 2 }], { targetId: "A" }).revision
    ).not.toBe(result.revision);
    expect(transferSnapshot(rows, { targetId: "B" }).revision).not.toBe(
      result.revision
    );
  });
});
