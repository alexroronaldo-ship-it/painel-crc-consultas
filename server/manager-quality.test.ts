import { describe, expect, it } from "vitest";
import { averageManagerScores, calculateManagerScore } from "../shared/manager-quality";

describe("pontuação da gerente", () => {
  it("atribui 100 pontos quando vendas, tarefas, respostas, agendamentos e registros batem as metas", () => {
    const score = calculateManagerScore({
      revenue: 75_000,
      salesGoal: 75_000,
      records: Array.from({ length: 5 }, (_, index) => ({ patientName: `Paciente ${index}`, phone: "11999990000", closingDate: "2026-10-01", closedItem: "Implante", value: "1000", totalTimeSeconds: 120, internalStatus: "closed", internalNotes: "Conferido" })),
      tasks: Array.from({ length: 5 }, () => ({ taskCount: 100, description: "Tarefas concluídas" })),
      appointments: [{ appointmentCount: 50, weeklyGoal: 50 }],
    });
    expect(score.categories.sales.points).toBe(50);
    expect(score.categories.tasks.points).toBe(15);
    expect(score.categories.responses.points).toBe(15);
    expect(score.categories.appointments.points).toBe(10);
    expect(score.categories.records.points).toBe(10);
    expect(score.totalPoints).toBe(100);
    expect(score.remainingPoints).toBe(0);
  });

  it("não pontua resposta sem tempo medido nem meta de vendas inexistente", () => {
    const score = calculateManagerScore({ revenue: 75_000, salesGoal: null, records: [], tasks: [], appointments: [] });
    expect(score.categories.sales.points).toBe(0);
    expect(score.categories.responses.points).toBe(0);
    expect(score.categories.appointments.points).toBe(0);
    expect(score.totalPoints).toBe(0);
  });

  it("consolida páginas com peso igual e mantém o teto de 100", () => {
    const perfect = calculateManagerScore({ revenue: 75_000, salesGoal: 75_000, records: [{ patientName: "A", phone: "11999990000", closingDate: "2026-10-01", closedItem: "Implante", value: "1000", totalTimeSeconds: 60, internalStatus: "closed", internalNotes: "Ok" }], tasks: [{ taskCount: 500, description: "Ok" }], appointments: [{ appointmentCount: 1, weeklyGoal: 1 }] });
    const empty = calculateManagerScore({ revenue: 0, salesGoal: 75_000, records: [], tasks: [], appointments: [] });
    expect(averageManagerScores([perfect, empty]).totalPoints).toBe(50);
  });
});
