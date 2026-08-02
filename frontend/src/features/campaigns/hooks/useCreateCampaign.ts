import { useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignsApi } from '../../../services/api/campaigns';
import { QUERY_KEYS } from '../../../services/api/keys';
import type { CampaignCreatePayload } from '../../../types/api';

export function useCreateCampaign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CampaignCreatePayload) => campaignsApi.createCampaign(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.campaigns });
    },
  });
}
