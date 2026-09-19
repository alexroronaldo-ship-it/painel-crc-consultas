import { describe, expect, it } from "vitest";
import { calculateCampaignTotals, calculateCampaignWeeks } from "../client/src/lib/campaign-metrics";

const campaigns = [
  { id: 1, name: "Implantes", weeklyGoal: "37500.00" },
  { id: 2, name: "Ortodontia", weeklyGoal: "20000.00" },
  { id: 3, name: "Clareamento", weeklyGoal: "15000.00" },
];

const records = [
  { campaignId: 1, closingDate: "2026-09-03", value: "8100.00" },
  { campaignId: 1, closingDate: "2026-09-10", value: "12000.00" },
  { campaignId: 2, closingDate: "2026-09-18", value: "5000.00" },
  { campaignId: null, closingDate: "2026-09-25", value: "9000.00" },
];

describe("campaign metrics", () => {
  it("creates one summary for every registered campaign, including zero sales", () => {
    expect(calculateCampaignTotals(campaigns, records)).toEqual([
      { id: 1, name: "Implantes", weeklyGoal: 37500, total: 20100, count: 2 },
      { id: 2, name: "Ortodontia", weeklyGoal: 20000, total: 5000, count: 1 },
      { id: 3, name: "Clareamento", weeklyGoal: 15000, total: 0, count: 0 },
    ]);
  });

  it("uses only the selected campaign in the weekly graph", () => {
    const weeks = calculateCampaignWeeks(1, records, "2026-09");
    expect(weeks.map(week => week.total)).toEqual([8100, 12000, 0, 0]);
    expect(weeks.reduce((sum, week) => sum + week.total, 0)).toBe(20100);
  });
});
