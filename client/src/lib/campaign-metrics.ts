import { calculateWeeklySales } from "./weekly-sales";

export type CampaignSummaryInput = {
  id: number;
  name: string;
  weeklyGoal: string | number;
};

export type CampaignClosureInput = {
  campaignId: number | null;
  closingDate: string;
  value: string | number;
};

export function calculateCampaignTotals(campaigns: CampaignSummaryInput[], records: CampaignClosureInput[]) {
  return campaigns.map(campaign => {
    const own = records.filter(record => record.campaignId === campaign.id);
    return {
      id: campaign.id,
      name: campaign.name,
      weeklyGoal: Number(campaign.weeklyGoal),
      total: own.reduce((sum, record) => sum + Number(record.value), 0),
      count: own.length,
    };
  });
}

export function calculateCampaignWeeks(campaignId: number, records: CampaignClosureInput[], month: string) {
  return calculateWeeklySales(
    records.filter(record => record.campaignId === campaignId),
    month,
  );
}
