import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../services/api/client';

export function useBackendHealth() {
  return useQuery({
    queryKey: ['backend-health'],
    queryFn: async () => {
      const response = await apiClient.get<{ message: string }>('/');
      return response.data;
    },
    refetchInterval: 30000,
    retry: 1,
    staleTime: 10000,
  });
}
