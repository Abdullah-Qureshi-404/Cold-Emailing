import { useQuery } from '@tanstack/react-query';
import { tasksApi } from '../services/api/tasks';
import { QUERY_KEYS } from '../services/api/keys';
import type { TaskStatusResponse } from '../types/api';

export const TASK_POLL_INTERVAL_MS = 2000;

/**
 * Polls GET /tasks/{task_id}/status every ~2s until `ready === true`, then stops.
 *
 * Dispatch endpoints return as soon as the Celery task is *queued*, so the work
 * is not done when the HTTP response lands. Consumers use this to know when the
 * task actually finished and only then refetch the affected data.
 */
export function useTaskPolling(taskId: string | null, enabled: boolean = true) {
  return useQuery<TaskStatusResponse>({
    queryKey: QUERY_KEYS.taskStatus(taskId),
    queryFn: () => tasksApi.getTaskStatus(taskId as string),
    enabled: !!taskId && enabled,
    // Stop polling as soon as the backend reports the task is ready.
    refetchInterval: (query) => (query.state.data?.ready ? false : TASK_POLL_INTERVAL_MS),
    refetchIntervalInBackground: true,
    staleTime: 0,
    gcTime: 0,
    retry: 2,
  });
}

/** Maps a Celery state string to the task store's coarse status. */
export function celeryStateToStatus(
  data: TaskStatusResponse | undefined
): 'queued' | 'running' | 'success' | 'failed' {
  if (!data) return 'queued';
  if (data.ready) return data.successful ? 'success' : 'failed';
  if (data.state === 'PENDING') return 'queued';
  return 'running';
}
