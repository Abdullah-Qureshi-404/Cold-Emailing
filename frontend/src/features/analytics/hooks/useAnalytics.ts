import { useQuery } from '@tanstack/react-query';
import { analyticsApi, type AnalyticsOverview } from '../../../services/api/analytics';
import { QUERY_KEYS } from '../../../services/api/keys';

export function useAnalytics(campaignId: number | null) {
  return useQuery<AnalyticsOverview>({
    queryKey: QUERY_KEYS.analytics(campaignId),
    queryFn: () => analyticsApi.getCampaignAnalytics(campaignId!),
    enabled: !!campaignId && campaignId > 0,
  });
}
