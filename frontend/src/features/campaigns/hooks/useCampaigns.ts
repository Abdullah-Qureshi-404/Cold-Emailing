import { useQuery } from '@tanstack/react-query';
import { campaignsApi } from '../../../services/api/campaigns';
import { QUERY_KEYS } from '../../../services/api/keys';
import type { Campaign } from '../../../types/api';

export function useCampaigns() {
  return useQuery<Campaign[]>({
    queryKey: QUERY_KEYS.campaigns,
    queryFn: campaignsApi.getCampaigns,
  });
}
