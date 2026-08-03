import { useMutation, useQueryClient } from '@tanstack/react-query';
import { emailsApi } from '../../../services/api/emails';
import { leadsApi } from '../../../services/api/leads';
import { QUERY_KEYS } from '../../../services/api/keys';
import { useTaskStore } from '../../../store/useTaskStore';
import type { TaskResponse } from '../../../types/api';

export function useEmailActions(campaignId: number | null) {
  const queryClient = useQueryClient();
  const registerTask = useTaskStore((state) => state.registerTask);

  const invalidateEmailData = () => {
    if (campaignId) {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emailDrafts(campaignId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.campaignDashboard(campaignId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.campaignLeadsSummary(campaignId) });
    }
  };

  /** See useLeadActions.handleDispatch — queued tasks are polled, not assumed done. */
  const handleDispatch = (label: string) => (response: TaskResponse) => {
    if (response.status === 'queued' && response.task_id && campaignId) {
      registerTask({ id: response.task_id, label, campaignId });
    } else {
      invalidateEmailData();
    }
  };

  // Synchronous DB writes — safe to invalidate on response.
  const approveDraftMutation = useMutation({
    mutationFn: (leadId: number) => emailsApi.approveEmailDraft(leadId),
    onSuccess: invalidateEmailData,
  });

  const saveDraftMutation = useMutation({
    mutationFn: ({
      leadId,
      subject,
      body,
    }: {
      leadId: number;
      subject: string;
      body: string;
    }) => emailsApi.updateEmailDraft(leadId, { subject, body }),
    onSuccess: invalidateEmailData,
  });

  const writeEmailsMutation = useMutation({
    mutationFn: () => {
      if (!campaignId) throw new Error('No active campaign selected');
      return leadsApi.writeEmails(campaignId);
    },
    onSuccess: handleDispatch('Generating AI email drafts'),
  });

  const sendEmailsMutation = useMutation({
    mutationFn: () => {
      if (!campaignId) throw new Error('No active campaign selected');
      return emailsApi.sendEmails(campaignId);
    },
    onSuccess: handleDispatch('Sending approved emails'),
  });

  const checkRepliesMutation = useMutation({
    mutationFn: () => {
      if (!campaignId) throw new Error('No active campaign selected');
      return emailsApi.checkReplies(campaignId);
    },
    onSuccess: handleDispatch('Scanning Gmail for replies'),
  });

  const sendFollowupsMutation = useMutation({
    mutationFn: () => {
      if (!campaignId) throw new Error('No active campaign selected');
      return emailsApi.sendFollowups(campaignId);
    },
    onSuccess: handleDispatch('Sending follow-up emails'),
  });

  const markColdMutation = useMutation({
    mutationFn: () => {
      if (!campaignId) throw new Error('No active campaign selected');
      return emailsApi.markCold(campaignId);
    },
    onSuccess: handleDispatch('Marking unresponsive leads cold'),
  });

  return {
    approveDraft: approveDraftMutation.mutateAsync,
    isApproving: approveDraftMutation.isPending,
    saveDraft: saveDraftMutation.mutateAsync,
    isSavingDraft: saveDraftMutation.isPending,
    generateDrafts: writeEmailsMutation.mutateAsync,
    isGenerating: writeEmailsMutation.isPending,
    sendEmails: sendEmailsMutation.mutateAsync,
    isSending: sendEmailsMutation.isPending,
    checkReplies: checkRepliesMutation.mutateAsync,
    isCheckingReplies: checkRepliesMutation.isPending,
    sendFollowups: sendFollowupsMutation.mutateAsync,
    isSendingFollowups: sendFollowupsMutation.isPending,
    markCold: markColdMutation.mutateAsync,
    isMarkingCold: markColdMutation.isPending,
  };
}
