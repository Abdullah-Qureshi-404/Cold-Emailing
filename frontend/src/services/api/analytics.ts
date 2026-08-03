import { campaignsApi } from './campaigns';
import { leadsApi } from './leads';
import type {
  CampaignDashboardMetrics,
  LeadSummaryBreakdown,
  ResearchStatusMetrics,
} from '../../types/api';

export interface AnalyticsOverview {
  dashboard: CampaignDashboardMetrics;
  leadsSummary: LeadSummaryBreakdown;
  researchStatus: ResearchStatusMetrics;
}

export const analyticsApi = {
  getCampaignAnalytics: async (campaignId: number): Promise<AnalyticsOverview> => {
    const [dashboard, leadsSummary, researchStatus] = await Promise.all([
      campaignsApi.getCampaignDashboard(campaignId),
      campaignsApi.getCampaignLeadsSummary(campaignId),
      leadsApi.getResearchStatus(campaignId),
    ]);

    return {
      dashboard,
      leadsSummary,
      researchStatus,
    };
  },
};
