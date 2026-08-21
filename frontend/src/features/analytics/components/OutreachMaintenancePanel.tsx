import React, { useState } from 'react';
import { Send, RefreshCw, Flame, Loader2 } from 'lucide-react';
import { useValidatedActiveCampaignId } from '../../../hooks/useValidatedActiveCampaignId';
import { useEmailActions } from '../../email-studio/hooks/useEmailActions';
import type { TaskResponse } from '../../../types/api';

interface OutreachMaintenancePanelProps {
  onTriggerTask: (name: string, endpoint: string, response?: TaskResponse) => void;
  /** Scopes this panel to a specific campaign. Falls back to the global active campaign. */
  campaignId?: number | null;
}

export const OutreachMaintenancePanel: React.FC<OutreachMaintenancePanelProps> = ({
  onTriggerTask,
  campaignId,
}) => {
  const activeCampaignId = useValidatedActiveCampaignId(campaignId);
  const { sendFollowups, checkReplies, markCold } = useEmailActions(activeCampaignId);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleTrigger = async (
    id: string,
    name: string,
    endpoint: string,
    taskFn: () => Promise<TaskResponse>
  ) => {
    if (!activeCampaignId) {
      alert('Please select an active campaign context first.');
      return;
    }
    try {
      setLoadingId(id);
      const response = await taskFn();
      onTriggerTask(name, endpoint, response);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Task failed';
      alert(`Error running ${name}: ${msg}`);
    } finally {
      setLoadingId(null);
    }
  };

  const tasks = [
    {
      id: 'followups',
      name: 'Send Follow-up Emails',
      icon: Send,
      desc: 'Dispatch step 1 or step 2 follow-ups to non-replied leads.',
      color: 'bg-purple-600 hover:bg-purple-500 text-white ai-glow-sm',
      onClick: () =>
        handleTrigger(
          'followups',
          'Send Follow-up Emails',
          'Dispatching sequence follow-ups...',
          sendFollowups
        ),
    },
    {
      id: 'replies',
      name: 'Scan Gmail Replies',
      icon: RefreshCw,
      desc: 'Scan active threads in Gmail for prospect responses.',
      color: 'bg-[#18181c] border border-cyan-500/30 text-cyan-300 hover:border-cyan-500/60 cyan-glow',
      onClick: () =>
        handleTrigger(
          'replies',
          'Scan Gmail Replies',
          'Scanning inbox threads for replies...',
          checkReplies
        ),
    },
    {
      id: 'mark_cold',
      name: 'Mark Unresponsive Cold',
      icon: Flame,
      desc: 'Transition leads with completed sequences and 0 replies to COLD.',
      color: 'bg-[#18181c] border border-rose-500/30 text-rose-300 hover:border-rose-500/60',
      onClick: () =>
        handleTrigger(
          'mark_cold',
          'Mark Unresponsive Cold',
          'Marking unresponsive leads as cold...',
          markCold
        ),
    },
  ];

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111113] p-5 space-y-4">
      <div>
        <h3 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">
          Outreach Maintenance & Sequence Tasks
        </h3>
        <p className="text-[11px] text-zinc-400">
          Dispatch background workers to maintain sequences and detect replies.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {tasks.map((task) => {
          const Icon = task.icon;
          const isLoading = loadingId === task.id;
          return (
            <div
              key={task.id}
              className="rounded-xl border border-white/[0.08] bg-[#161619] p-4 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4 shrink-0 text-purple-400" />
                  <h4 className="text-xs font-semibold text-zinc-100">{task.name}</h4>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">{task.desc}</p>
              </div>

              <div className="pt-2 border-t border-white/[0.06]">
                <button
                  onClick={task.onClick}
                  disabled={isLoading}
                  className={`w-full flex items-center justify-center gap-2 rounded-lg py-2 px-3 text-xs font-semibold transition ${task.color}`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Dispatching Task...</span>
                    </>
                  ) : (
                    <>
                      <Icon className="h-3.5 w-3.5" />
                      <span>Execute Task</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
