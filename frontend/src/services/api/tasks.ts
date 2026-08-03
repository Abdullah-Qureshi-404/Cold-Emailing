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
};
