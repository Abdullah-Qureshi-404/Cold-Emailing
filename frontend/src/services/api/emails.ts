import { apiClient } from './client';
import type {
  ApproveDraftResponse,
  DraftUpdateResponse,
  DraftQualityCheck,
  EmailDraft,
  TaskResponse,
} from '../../types/api';

export const emailsApi = {
  getEmailDrafts: async (campaignId: number): Promise<EmailDraft[]> => {
    const response = await apiClient.get<EmailDraft[]>(`/leads/${campaignId}/email-drafts`);
    return response.data;
  },

  /** Persists edits to a draft WITHOUT approving it. Approval is a separate call. */
  updateEmailDraft: async (
    leadId: number,
    payload: { subject: string; body: string }
  ): Promise<DraftUpdateResponse> => {
    const response = await apiClient.patch<DraftUpdateResponse>(
      `/leads/draft/${leadId}`,
      payload
    );
    return response.data;
  },

  approveEmailDraft: async (leadId: number): Promise<ApproveDraftResponse> => {
    const response = await apiClient.patch<ApproveDraftResponse>(`/leads/approve-email/${leadId}`);
    return response.data;
  },

  bulkApprove: async (leadIds: number[]): Promise<{ message: string; approved: number }> => {
    const response = await apiClient.patch(`/leads/bulk-approve`, { lead_ids: leadIds });
    return response.data;
  },

  bulkReject: async (leadIds: number[]): Promise<{ message: string; rejected: number }> => {
    const response = await apiClient.patch(`/leads/bulk-reject`, { lead_ids: leadIds });
    return response.data;
  },

  checkDraftQuality: async (leadId: number, aiReview: boolean = false): Promise<DraftQualityCheck> => {
    const response = await apiClient.post<DraftQualityCheck>(
      `/leads/draft/${leadId}/check-quality`,
      {},
      { params: aiReview ? { ai_review: true } : {} }
    );
    return response.data;
  },

  sendEmails: async (campaignId: number): Promise<TaskResponse> => {
    const response = await apiClient.post<TaskResponse>(`/leads/send-emails/${campaignId}`);
    return response.data;
  },

  checkReplies: async (campaignId: number): Promise<TaskResponse> => {
    const response = await apiClient.post<TaskResponse>(`/leads/check-replies/${campaignId}`);
    return response.data;
  },

  sendFollowups: async (campaignId: number): Promise<TaskResponse> => {
    const response = await apiClient.post<TaskResponse>(`/leads/send-followups/${campaignId}`);
    return response.data;
  },

  markCold: async (campaignId: number): Promise<TaskResponse> => {
    const response = await apiClient.post<TaskResponse>(`/leads/mark-cold/${campaignId}`);
    return response.data;
  },
};
