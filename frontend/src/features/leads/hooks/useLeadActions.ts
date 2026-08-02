import { useMutation, useQueryClient } from '@tanstack/react-query';
import { leadsApi } from '../../../services/api/leads';
import { QUERY_KEYS } from '../../../services/api/keys';
import { useTaskStore } from '../../../store/useTaskStore';
import type { TaskResponse } from '../../../types/api';

export function useLeadActions(campaignId: number | null) {
  const queryClient = useQueryClient();
  const registerTask = useTaskStore((state) => state.registerTask);

  const invalidateLeadData = () => {
    if (campaignId) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.campaignLeadsSummary(campaignId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.campaignDashboard(campaignId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.researchStatus(campaignId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emailDrafts(campaignId) });
    }
  };

  /**
   * A dispatch response means the task was *queued*, not finished. Register it
   * so TaskActivityDrawer polls /tasks/{id}/status and invalidates once it is
   * genuinely done. A "skipped" response has no task to poll — the data already
   * exists, so refetch straight away.
   */
  const handleDispatch = (label: string) => (response: TaskResponse) => {
    if (response.status === 'queued' && response.task_id && campaignId) {
      registerTask({ id: response.task_id, label, campaignId });
    } else {
      invalidateLeadData();
    }
  };

  const scrapeLeadsMutation = useMutation({
    mutationFn: ({ query, location }: { query?: string; location?: string }) => {
      if (!campaignId) throw new Error('No active campaign selected');
      return leadsApi.scrapeLeads(campaignId, query, location);
    },
    onSuccess: handleDispatch('Scraping Google Maps leads'),
  });

  const importFreeOutboundMutation = useMutation({
    mutationFn: (filePath?: string) => {
      if (!campaignId) throw new Error('No active campaign selected');
      return leadsApi.importFreeOutbound(campaignId, filePath);
    },
    onSuccess: handleDispatch('Importing free-outbound CSV'),
  });

  const resetDailyCacheMutation = useMutation({
    mutationFn: () => {
      if (!campaignId) throw new Error('No active campaign selected');
      return leadsApi.resetDailyCache(campaignId);
    },
    // Not a Celery task — it deletes rows synchronously, so refetch immediately.
    onSuccess: invalidateLeadData,
  });

  const findEmailsMutation = useMutation({
    mutationFn: () => {
      if (!campaignId) throw new Error('No active campaign selected');
      return leadsApi.findEmails(campaignId);
    },
    onSuccess: handleDispatch('Discovering & verifying emails'),
  });

  const researchLeadsMutation = useMutation({
    mutationFn: () => {
      if (!campaignId) throw new Error('No active campaign selected');
      return leadsApi.researchLeads(campaignId);
    },
    onSuccess: handleDispatch('Running AI web research'),
  });

  const qualifyLeadsMutation = useMutation({
    mutationFn: () => {
      if (!campaignId) throw new Error('No active campaign selected');
      return leadsApi.qualifyLeads(campaignId);
    },
    onSuccess: handleDispatch('Qualifying leads against ICP'),
  });

  const writeEmailsMutation = useMutation({
    mutationFn: () => {
      if (!campaignId) throw new Error('No active campaign selected');
      return leadsApi.writeEmails(campaignId);
    },
    onSuccess: handleDispatch('Generating AI email drafts'),
  });

  return {
    scrapeLeads: scrapeLeadsMutation.mutateAsync,
    isScraping: scrapeLeadsMutation.isPending,
    importFreeOutbound: (filePath?: string) => importFreeOutboundMutation.mutateAsync(filePath),
    isImporting: importFreeOutboundMutation.isPending,
    resetDailyCache: resetDailyCacheMutation.mutateAsync,
    isResettingCache: resetDailyCacheMutation.isPending,
    findEmails: findEmailsMutation.mutateAsync,
    isFindingEmails: findEmailsMutation.isPending,
    researchLeads: researchLeadsMutation.mutateAsync,
    isResearching: researchLeadsMutation.isPending,
    qualifyLeads: qualifyLeadsMutation.mutateAsync,
    isQualifying: qualifyLeadsMutation.isPending,
    writeEmails: writeEmailsMutation.mutateAsync,
    isWritingEmails: writeEmailsMutation.isPending,
  };
}
