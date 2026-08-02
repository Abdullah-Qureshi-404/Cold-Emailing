import { useQuery } from '@tanstack/react-query';
import { campaignsApi } from '../../../services/api/campaigns';
import { QUERY_KEYS } from '../../../services/api/keys';
import type { LeadSummaryBreakdown } from '../../../types/api';

export function useLeadSummary(campaignId: number | null) {
  return useQuery<LeadSummaryBreakdown>({
    queryKey: QUERY_KEYS.campaignLeadsSummary(campaignId),
    queryFn: () => campaignsApi.getCampaignLeadsSummary(campaignId!),
    enabled: !!campaignId && campaignId > 0,
  });
}
