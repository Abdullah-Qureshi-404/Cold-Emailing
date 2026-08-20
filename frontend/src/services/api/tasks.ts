import { apiClient } from './client';
import type { TaskStatusResponse } from '../../types/api';

export const tasksApi = {
  getTaskStatus: async (taskId: string): Promise<TaskStatusResponse> => {
    const response = await apiClient.get<TaskStatusResponse>(`/tasks/${taskId}/status`);
    return response.data;
  },

  cancelTask: async (taskId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete<{ message: string }>(`/tasks/${taskId}`);
    return response.data;
  },

  getTaskActivity: async (): Promise<Array<{ id: string; label: string; campaign_id: number; status: 'queued' | 'running' | 'success' | 'failed'; current: number; total: number; stage: string }>> => {
    const response = await apiClient.get<Array<{ id: string; label: string; campaign_id: number; status: 'queued' | 'running' | 'success' | 'failed'; current: number; total: number; stage: string }>>('/tasks/activity');
    return response.data;
  },
};
