import { describe, expect, it } from "vitest";
import { calculateCrcQualityScore } from "../client/src/lib/crc-quality";

describe("crc quality score", () => {
  it("calculates the five weighted categories and keeps detailed points available only to the summary component", () => {
    const result = calculateCrcQualityScore({
      revenue: 75_000,
      closures: [
        { patientName: "Ana", phone: "11999990000", closingDate: "2026-10-01", closedItem: "Implante", value: "1000", totalTimeSeconds: 120, internalStatus: "closed", internalNotes: "Registro completo" },
        { patientName: "Bia", phone: "11999990001", closingDate: "2026-10-08", closedItem: "Prótese", value: "1000", totalTimeSeconds: 180, internalStatus: "closed", internalNotes: "Registro completo" },
      ],
      tasks: [
        { taskCount: 100, description: "S1 concluída" },
        { taskCount: 100, description: "S2 concluída" },
        { taskCount: 100, description: "S3 concluída" },
        { taskCount: 100, description: "S4 concluída" },
        { taskCount: 100, description: "S5 concluída" },
      ],
      appointments: [
        { appointmentCount: 10, weeklyGoal: 10 },
      ],
    });

    expect(result.categories.sales).toEqual({ percent: 100, points: 50 });
    expect(result.categories.tasks).toEqual({ percent: 100, points: 15 });
    expect(result.categories.responses).toEqual({ percent: 50, points: 7.5 });
    expect(result.categories.appointments).toEqual({ percent: 100, points: 10 });
    expect(result.categories.records).toEqual({ percent: 100, points: 10 });
    expect(result.totalPoints).toBe(92.5);
    expect(result.remainingPoints).toBe(7.5);
    expect(result.fastResponses).toBe(1);
  });

  it("does not award response points before any response time is measured", () => {
    const result = calculateCrcQualityScore({ revenue: 0, closures: [], tasks: [], appointments: [] });
    expect(result.categories.responses).toEqual({ percent: 0, points: 0 });
    expect(result.totalPoints).toBe(0);
    expect(result.remainingPoints).toBe(100);
  });
});
