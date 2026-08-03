import React, { useState } from 'react';
import { Send, RefreshCw, Edit3, Loader2 } from 'lucide-react';
import { useValidatedActiveCampaignId } from '../../../hooks/useValidatedActiveCampaignId';
import { useEmailActions } from '../hooks/useEmailActions';
import type { TaskResponse } from '../../../types/api';

interface EmailActionCenterProps {
  onTriggerTask: (taskName: string, endpoint: string, response?: TaskResponse) => void;
  /** Scopes this panel to a specific campaign. Falls back to the global active campaign. */
  campaignId?: number | null;
}

export const EmailActionCenter: React.FC<EmailActionCenterProps> = ({
  onTriggerTask,
  campaignId,
}) => {
  const activeCampaignId = useValidatedActiveCampaignId(campaignId);
  const { generateDrafts, sendEmails, checkReplies } = useEmailActions(activeCampaignId);
  const [loadingTask, setLoadingTask] = useState<string | null>(null);

  const handleAction = async (
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
      setLoadingTask(id);
      const response = await taskFn();
      onTriggerTask(name, endpoint, response);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Task failed';
      alert(`Error running ${name}: ${msg}`);
    } finally {
      setLoadingTask(null);
    }
  };

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111113] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h3 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
          AI Email Approval & Dispatch Control
          <span className="ai-gradient-text font-mono text-[10px] font-bold">FastAPI Pipeline</span>
        </h3>
        <p className="text-[11px] text-zinc-400">
          Generate drafts via Groq LLM and dispatch approved emails through Gmail API.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Generate AI Drafts Button */}
        <button
          onClick={() =>
            handleAction(
              'write',
              'Generate AI Email Drafts',
              `POST /leads/write-emails/${activeCampaignId}`,
              generateDrafts
            )
          }
          disabled={loadingTask === 'write'}
          className="flex items-center gap-2 rounded-lg bg-[#18181c] border border-purple-500/30 px-3.5 py-2 text-xs font-semibold text-purple-300 hover:border-purple-500/60 transition ai-glow-sm"
        >
          {loadingTask === 'write' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Edit3 className="h-3.5 w-3.5 text-purple-400" />
          )}
          <span>Generate AI Drafts</span>
        </button>

        {/* Send Approved Emails Button */}
        <button
          onClick={() =>
            handleAction(
              'send',
              'Send Approved Emails (Gmail API)',
              `POST /leads/send-emails/${activeCampaignId}`,
              sendEmails
            )
          }
          disabled={loadingTask === 'send'}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-500 transition ai-glow-sm"
        >
          {loadingTask === 'send' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          <span>Send Approved Emails</span>
        </button>

        {/* Check Gmail Replies Button */}
        <button
          onClick={() =>
            handleAction(
              'replies',
              'Scan Gmail Replies',
              `POST /leads/check-replies/${activeCampaignId}`,
              checkReplies
            )
          }
          disabled={loadingTask === 'replies'}
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#18181c] px-3 py-2 text-xs font-medium text-zinc-300 hover:border-white/20 transition"
        >
          {loadingTask === 'replies' ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />
          )}
          <span>Scan Replies</span>
        </button>
      </div>
    </div>
  );
};
