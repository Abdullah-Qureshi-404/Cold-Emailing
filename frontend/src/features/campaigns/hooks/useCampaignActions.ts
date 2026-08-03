import { useMutation, useQueryClient } from '@tanstack/react-query';
import { campaignsApi } from '../../../services/api/campaigns';
import { QUERY_KEYS } from '../../../services/api/keys';

export function useCampaignActions() {
  const queryClient = useQueryClient();

  const startCampaignMutation = useMutation({
    mutationFn: (id: number) => campaignsApi.startCampaign(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.campaigns });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.campaignDashboard(id) });
    },
  });

  const pauseCampaignMutation = useMutation({
    mutationFn: (id: number) => campaignsApi.pauseCampaign(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.campaigns });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.campaignDashboard(id) });
    },
  });

  const stopCampaignMutation = useMutation({
    mutationFn: (id: number) => campaignsApi.stopCampaign(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.campaigns });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.campaignDashboard(id) });
    },
  });

  return {
    startCampaign: startCampaignMutation.mutateAsync,
    isStarting: startCampaignMutation.isPending,
    pauseCampaign: pauseCampaignMutation.mutateAsync,
    isPausing: pauseCampaignMutation.isPending,
    stopCampaign: stopCampaignMutation.mutateAsync,
    isStopping: stopCampaignMutation.isPending,
  };
}
