import { useQuery } from '@tanstack/react-query';
import { campaignsApi } from '../../../services/api/campaigns';
import { QUERY_KEYS } from '../../../services/api/keys';
import type { CampaignDashboardMetrics } from '../../../types/api';

export function useCampaignDashboard(campaignId: number | null) {
  return useQuery<CampaignDashboardMetrics>({
    queryKey: QUERY_KEYS.campaignDashboard(campaignId),
    queryFn: () => campaignsApi.getCampaignDashboard(campaignId!),
    enabled: !!campaignId && campaignId > 0,
  });
}
