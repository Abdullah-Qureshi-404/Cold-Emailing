import { apiClient } from './client';
import type { LeadListItem, ResearchStatusMetrics, TaskResponse } from '../../types/api';

export const leadsApi = {
  getLeads: async (
    campaignId: number,
    opts: { stage?: string; search?: string; source?: string; page?: number; pageSize?: number } = {}
  ): Promise<{ items: LeadListItem[]; total: number }> => {
    const response = await apiClient.get<LeadListItem[]>(`/leads/${campaignId}/list`, {
      params: {
        ...(opts.stage ? { stage: opts.stage } : {}),
        ...(opts.search ? { search: opts.search } : {}),
        ...(opts.source ? { source: opts.source } : {}),
        page: opts.page ?? 1,
        page_size: opts.pageSize ?? 25,
      },
    });
    const total = Number(response.headers['x-total-count'] ?? response.data.length);
    return { items: response.data, total };
  },

  scrapeHackernews: async (campaignId: number, query: string = ''): Promise<TaskResponse> => {
    const response = await apiClient.post<TaskResponse>(
      `/leads/scrape-hackernews/${campaignId}`,
      {},
      { params: query ? { query } : {} }
    );
    return response.data;
  },

  scrapeLeads: async (
    campaignId: number,
    query: string = 'software company',
    location: string = 'New York'
  ): Promise<TaskResponse> => {
    const response = await apiClient.post<TaskResponse>(
      `/leads/scrape/${campaignId}`,
      {},
      {
        params: { query, location },
      }
    );
    return response.data;
  },

  importFreeOutbound: async (
    campaignId: number,
    filePath?: string
  ): Promise<TaskResponse> => {
    const params: Record<string, string> = {};
    if (filePath) {
      params.file_path = filePath;
    }
    const response = await apiClient.post<TaskResponse>(
      `/leads/import-free-outbound/${campaignId}`,
      {},
      { params }
    );
    return response.data;
  },

  resetDailyCache: async (campaignId: number): Promise<{ deleted: number; message: string }> => {
    const response = await apiClient.delete<{ deleted: number; message: string }>(
      `/leads/reset-daily-cache/${campaignId}`
    );
    return response.data;
  },

  findEmails: async (campaignId: number): Promise<TaskResponse> => {
    const response = await apiClient.post<TaskResponse>(`/leads/find-emails/${campaignId}`);
    return response.data;
  },

  researchLeads: async (campaignId: number): Promise<TaskResponse> => {
    const response = await apiClient.post<TaskResponse>(`/leads/research/${campaignId}`);
    return response.data;
  },

  getResearchStatus: async (campaignId: number): Promise<ResearchStatusMetrics> => {
    const response = await apiClient.get<ResearchStatusMetrics>(`/leads/${campaignId}/research-status`);
    return response.data;
  },

  qualifyLeads: async (campaignId: number): Promise<TaskResponse> => {
    const response = await apiClient.post<TaskResponse>(`/leads/qualify/${campaignId}`);
    return response.data;
  },

  writeEmails: async (campaignId: number): Promise<TaskResponse> => {
    const response = await apiClient.post<TaskResponse>(`/leads/write-emails/${campaignId}`);
    return response.data;
  },
};
