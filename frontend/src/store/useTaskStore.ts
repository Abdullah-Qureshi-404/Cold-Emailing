import { create } from 'zustand';

export type TaskStatus = 'queued' | 'running' | 'success' | 'failed';

export interface TrackedTask {
  /** Celery task_id returned by the dispatch endpoint. */
  id: string;
  /** Human description, e.g. "Scraping leads". */
  label: string;
  campaignId: number;
  status: TaskStatus;
  startedAt: number;
  finishedAt?: number;
  error?: string | null;
}

const MAX_TASKS = 50;

interface TaskState {
  /** Newest first, capped at MAX_TASKS. */
  tasks: TrackedTask[];
  registerTask: (task: {
    id: string;
    label: string;
    campaignId: number;
    status?: TaskStatus;
  }) => void;
  updateTaskStatus: (id: string, status: TaskStatus, error?: string | null) => void;
  clearFinishedTasks: () => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],

  registerTask: ({ id, label, campaignId, status = 'queued' }) =>
    set((state) => {
      // Re-dispatching the same task id should refresh it rather than duplicate.
      const withoutDuplicate = state.tasks.filter((t) => t.id !== id);
      const next: TrackedTask = {
        id,
        label,
        campaignId,
        status,
        startedAt: Date.now(),
        error: null,
      };
      return { tasks: [next, ...withoutDuplicate].slice(0, MAX_TASKS) };
    }),

  updateTaskStatus: (id, status, error = null) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status,
              error,
              finishedAt:
                status === 'success' || status === 'failed' ? Date.now() : t.finishedAt,
            }
          : t
      ),
    })),

  clearFinishedTasks: () =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.status === 'queued' || t.status === 'running'),
    })),
}));

export const isTaskInFlight = (task: TrackedTask): boolean =>
  task.status === 'queued' || task.status === 'running';
