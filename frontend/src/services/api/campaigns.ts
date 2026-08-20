import { apiClient } from './client';
import type {
  Campaign,
  CampaignCreatePayload,
  CampaignDashboardMetrics,
  LeadSummaryBreakdown,
  PipelineProgress,
  CampaignPlan,
  CampaignProcessingStatus,
} from '../../types/api';

export const campaignsApi = {
  getCampaigns: async (): Promise<Campaign[]> => {
    const response = await apiClient.get<Campaign[]>('/campaigns/');
    return response.data;
  },

  createCampaign: async (payload: CampaignCreatePayload): Promise<Campaign> => {
    const response = await apiClient.post<Campaign>('/campaigns/', payload);
    return response.data;
  },

  startCampaign: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.patch<{ message: string }>(`/campaigns/${id}/start`);
    return response.data;
  },

  pauseCampaign: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.patch<{ message: string }>(`/campaigns/${id}/pause`);
    return response.data;
  },

  stopCampaign: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.patch<{ message: string }>(`/campaigns/${id}/stop`);
    return response.data;
  },

  getCampaignDashboard: async (campaignId: number): Promise<CampaignDashboardMetrics> => {
    const response = await apiClient.get<CampaignDashboardMetrics>(`/campaigns/${campaignId}/dashboard`);
    return response.data;
  },

  getCampaignLeadsSummary: async (campaignId: number): Promise<LeadSummaryBreakdown> => {
    const response = await apiClient.get<LeadSummaryBreakdown>(`/campaigns/${campaignId}/leads-summary`);
    return response.data;
  },

  getPipelineProgress: async (campaignId: number): Promise<PipelineProgress> => {
    const response = await apiClient.get<PipelineProgress>(`/campaigns/${campaignId}/pipeline-progress`);
    return response.data;
  },

  planCampaign: async (prompt: string): Promise<CampaignPlan> => {
    const response = await apiClient.post<CampaignPlan>('/campaigns/plan', { prompt });
    return response.data;
  },

  getProcessingStatus: async (campaignId: number): Promise<CampaignProcessingStatus> => {
    const response = await apiClient.get<CampaignProcessingStatus>(`/campaigns/${campaignId}/processing-status`);
    return response.data;
  },

  resumePipeline: async (campaignId: number): Promise<{ message: string; dispatched: string[] }> => {
    const response = await apiClient.post(`/campaigns/${campaignId}/resume-pipeline`);
    return response.data;
  },
};

