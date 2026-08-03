import { useQuery } from '@tanstack/react-query';
import { leadsApi } from '../../../services/api/leads';
import { QUERY_KEYS } from '../../../services/api/keys';
import type { ResearchStatusMetrics } from '../../../types/api';

export function useResearchStatus(campaignId: number | null) {
  return useQuery<ResearchStatusMetrics>({
    queryKey: QUERY_KEYS.researchStatus(campaignId),
    queryFn: () => leadsApi.getResearchStatus(campaignId!),
    enabled: !!campaignId && campaignId > 0,
  });
}
