import React, { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, Activity, CheckCircle2, XCircle, Loader2, Clock, Trash2 } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useTaskStore, isTaskInFlight, type TrackedTask } from '../../store/useTaskStore';
import { useTaskPolling, celeryStateToStatus } from '../../hooks/useTaskPolling';
import { QUERY_KEYS } from '../../services/api/keys';
import { formatRelativeTime } from '../../lib/utils';

/**
 * Polls a single in-flight task. When it completes it flips the store status and
 * invalidates every query whose data the task could have changed — this is what
 * actually refreshes the UI after a dispatched background job finishes.
 *
 * Renders nothing; it exists purely for its effects.
 */
const TaskWatcher: React.FC<{ task: TrackedTask }> = ({ task }) => {
  const queryClient = useQueryClient();
  const updateTaskStatus = useTaskStore((state) => state.updateTaskStatus);
  const { data, isError, error } = useTaskPolling(task.id);
  // Completion invalidates a batch of queries — do it exactly once per task.
  const hasInvalidatedRef = useRef(false);

  useEffect(() => {
    if (isError) {
      updateTaskStatus(
        task.id,
        'failed',
        error instanceof Error ? error.message : 'Unable to read task status'
      );
      return;
    }
    if (!data) return;

    const nextStatus = celeryStateToStatus(data);
    if (nextStatus !== task.status) {
      updateTaskStatus(task.id, nextStatus, data.error);
    }

    if (data.ready && !hasInvalidatedRef.current) {
      hasInvalidatedRef.current = true;
      const id = task.campaignId;
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.campaignLeadsSummary(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.campaignDashboard(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.researchStatus(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emailDrafts(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.analytics(id) });
    }
  }, [data, isError, error, task.id, task.status, task.campaignId, updateTaskStatus, queryClient]);

  return null;
};

const statusMeta: Record<
  TrackedTask['status'],
  { label: string; className: string; icon: React.ElementType; spin?: boolean }
> = {
  queued: {
    label: 'Queued',
    className: 'bg-zinc-800/60 text-zinc-300 border-zinc-700/50',
    icon: Clock,
  },
  running: {
    label: 'Running',
    className: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    icon: Loader2,
    spin: true,
  },
  success: {
    label: 'Completed',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    icon: CheckCircle2,
  },
  failed: {
    label: 'Failed',
    className: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    icon: XCircle,
  },
};

export const TaskStatusBadge: React.FC<{ status: TrackedTask['status'] }> = ({ status }) => {
  const meta = statusMeta[status];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${meta.className}`}
    >
      <Icon className={`h-3 w-3 ${meta.spin ? 'animate-spin' : ''}`} />
      {meta.label}
    </span>
  );
};

export const TaskRow: React.FC<{ task: TrackedTask; showCampaign?: boolean }> = ({
  task,
  showCampaign = true,
}) => (
  <div className="rounded-lg border border-white/[0.06] bg-[#161619] p-3 space-y-2">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-xs font-semibold text-zinc-200 truncate">{task.label}</div>
        <div className="text-[10px] font-mono text-zinc-500 truncate">
          {showCampaign && <>Campaign #{task.campaignId} · </>}
          {task.id}
        </div>
      </div>
      <TaskStatusBadge status={task.status} />
    </div>
    <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
      <span>Started {formatRelativeTime(task.startedAt)}</span>
      {task.finishedAt && <span>Finished {formatRelativeTime(task.finishedAt)}</span>}
    </div>
    {task.error && (
      <div className="rounded border border-rose-500/20 bg-rose-950/20 px-2 py-1 text-[10px] text-rose-300 font-mono break-words">
        {task.error}
      </div>
    )}
  </div>
);

/**
 * Always-mounted global panel. The watchers run regardless of whether the panel
 * is visible, so tasks keep progressing (and data keeps refreshing) while the
 * user works elsewhere. The drawer itself is the persistent "is it done yet?"
 * surface that replaces the old self-dismissing toasts.
 */
export const TaskActivityDrawer: React.FC = () => {
  const { isTaskDrawerOpen, setTaskDrawerOpen } = useUIStore();
  const tasks = useTaskStore((state) => state.tasks);
  const clearFinishedTasks = useTaskStore((state) => state.clearFinishedTasks);

  const inFlight = tasks.filter(isTaskInFlight);

  return (
    <>
      {/* Pollers — mounted even when the drawer is closed. */}
      {inFlight.map((task) => (
        <TaskWatcher key={task.id} task={task} />
      ))}

      {isTaskDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setTaskDrawerOpen(false)}
          />

          <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
            <div className="flex w-screen max-w-md flex-col border-l border-white/[0.08] bg-[#141417] shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/[0.08] p-5">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-purple-400" />
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-100">Background Task Activity</h2>
                    <p className="text-[11px] text-zinc-400">
                      {inFlight.length} running · {tasks.length} total
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setTaskDrawerOpen(false)}
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Task List */}
              <div className="flex-1 space-y-3 overflow-y-auto p-5">
                {tasks.length === 0 && (
                  <div className="rounded-lg border border-dashed border-white/10 p-8 text-center text-xs text-zinc-500 font-mono">
                    No background tasks dispatched yet this session. Run a pipeline action from a
                    Campaign Workspace and its progress will appear here.
                  </div>
                )}
                {tasks.map((task) => (
                  <TaskRow key={task.id} task={task} />
                ))}
              </div>

              {/* Footer */}
              {tasks.length > 0 && (
                <div className="border-t border-white/[0.08] p-4">
                  <button
                    onClick={clearFinishedTasks}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.12] bg-[#18181c] py-2 text-xs font-semibold text-zinc-300 transition hover:bg-white/[0.05]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear Completed Tasks
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
