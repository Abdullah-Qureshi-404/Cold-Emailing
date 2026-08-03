import React, { useState } from 'react';
import {
  Search,
  Upload,
  MailSearch,
  Sparkles,
  UserCheck,
  Edit3,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { useValidatedActiveCampaignId } from '../../../hooks/useValidatedActiveCampaignId';
import { useLeadActions } from '../hooks/useLeadActions';
import type { TaskResponse } from '../../../types/api';

interface LeadActionCenterProps {
  onOpenScrapeModal: () => void;
  onTriggerTask: (actionName: string, endpoint: string, response?: TaskResponse) => void;
  /** Scopes this panel to a specific campaign. Falls back to the global active campaign. */
  campaignId?: number | null;
}

export const LeadActionCenter: React.FC<LeadActionCenterProps> = ({
  onOpenScrapeModal,
  onTriggerTask,
  campaignId,
}) => {
  const activeCampaignId = useValidatedActiveCampaignId(campaignId);
  const {
    importFreeOutbound,
    findEmails,
    researchLeads,
    qualifyLeads,
    writeEmails,
    resetDailyCache,
    isResettingCache,
  } = useLeadActions(activeCampaignId);

  const [loadingTask, setLoadingTask] = useState<string | null>(null);

  const handleTaskExecute = async (
    actionId: string,
    name: string,
    endpoint: string,
    taskFn: () => Promise<TaskResponse>
  ) => {
    if (!activeCampaignId) {
      alert('Please select an active campaign context first.');
      return;
    }
    try {
      setLoadingTask(actionId);
      const response = await taskFn();
      onTriggerTask(name, endpoint, response);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Task failed';
      alert(`Error executing ${name}: ${msg}`);
    } finally {
      setLoadingTask(null);
    }
  };

  const handleResetCache = async () => {
    if (!activeCampaignId) {
      alert('Please select an active campaign context first.');
      return;
    }
    if (
      !confirm(
        "Reset this campaign's daily scrape/import dedupe cache? The next scrape or import run will re-fetch leads that were already collected today."
      )
    ) {
      return;
    }
    try {
      const result = await resetDailyCache();
      onTriggerTask(
        `Daily cache reset (${result.deleted} entries cleared)`,
        `DELETE /leads/reset-daily-cache/${activeCampaignId}`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Reset failed';
      alert(`Error resetting daily cache: ${msg}`);
    }
  };

  const actions = [
    {
      id: 'scrape_leads',
      name: 'Scrape Google Maps Leads',
      endpoint: 'POST /leads/scrape/{campaign_id}',
      icon: Search,
      badge: 'Google Maps Scraper',
      color: 'bg-purple-600 hover:bg-purple-500 text-white ai-glow-sm',
      onClick: onOpenScrapeModal,
    },
    {
      id: 'import_csv',
      name: 'Import Free Outbound CSV',
      endpoint: 'POST /leads/import-free-outbound/{campaign_id}',
      icon: Upload,
      badge: 'CSV Import',
      color: 'bg-[#18181c] border border-white/[0.08] hover:border-purple-500/40 text-zinc-200',
      onClick: () =>
        handleTaskExecute(
          'import_csv',
          'Import Free Outbound CSV',
          'POST /leads/import-free-outbound/{campaign_id}',
          () => importFreeOutbound()
        ),
    },
    {
      id: 'find_emails',
      name: 'Discover & Verify Emails',
      endpoint: 'POST /leads/find-emails/{campaign_id}',
      icon: MailSearch,
      badge: 'Hunter / Verifier',
      color: 'bg-[#18181c] border border-white/[0.08] hover:border-purple-500/40 text-zinc-200',
      onClick: () =>
        handleTaskExecute(
          'find_emails',
          'Discover & Verify Emails',
          'POST /leads/find-emails/{campaign_id}',
          findEmails
        ),
    },
    {
      id: 'ai_research',
      name: 'Run Groq AI Web Research',
      endpoint: 'POST /leads/research/{campaign_id}',
      icon: Sparkles,
      badge: 'Groq Llama 3.3',
      color:
        'bg-[#18181c] border border-purple-500/30 hover:border-purple-500/60 text-purple-300 cyan-glow',
      onClick: () =>
        handleTaskExecute(
          'ai_research',
          'Run Groq AI Web Research',
          'POST /leads/research/{campaign_id}',
          researchLeads
        ),
    },
    {
      id: 'ai_qualify',
      name: 'Run AI ICP Qualification',
      endpoint: 'POST /leads/qualify/{campaign_id}',
      icon: UserCheck,
      badge: 'Qualification Agent',
      color: 'bg-[#18181c] border border-white/[0.08] hover:border-purple-500/40 text-zinc-200',
      onClick: () =>
        handleTaskExecute(
          'ai_qualify',
          'Run AI ICP Qualification',
          'POST /leads/qualify/{campaign_id}',
          qualifyLeads
        ),
    },
    {
      id: 'write_emails',
      name: 'Generate AI Email Drafts',
      endpoint: 'POST /leads/write-emails/{campaign_id}',
      icon: Edit3,
      badge: 'Email Writer Agent',
      color:
        'bg-[#18181c] border border-purple-500/30 hover:border-purple-500/60 text-purple-300 ai-glow-sm',
      onClick: () =>
        handleTaskExecute(
          'write_emails',
          'Generate AI Email Drafts',
          'POST /leads/write-emails/{campaign_id}',
          writeEmails
        ),
    },
  ];

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111113] p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">
            Lead Acquisition & Processing Pipeline
          </h3>
          <p className="text-[11px] text-zinc-400">
            Dispatch background Celery tasks to advance leads across pipeline stages.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleResetCache}
            disabled={isResettingCache}
            title="Clear today's scrape/import dedupe cache so the next run re-fetches leads"
            className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-[#18181c] px-2.5 py-1.5 text-[11px] font-semibold text-amber-300 transition hover:border-amber-500/60"
          >
            {isResettingCache ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5" />
            )}
            <span>Reset Daily Cache</span>
          </button>
          <span className="hidden rounded border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 font-mono text-[10px] text-purple-400 lg:inline-block">
            Celery Workers Active
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {actions.map((act) => {
          const Icon = act.icon;
          const isLoading = loadingTask === act.id;
          return (
            <button
              key={act.id}
              onClick={act.onClick}
              disabled={isLoading}
              className={`flex items-center justify-between rounded-lg p-3.5 text-left transition group ${act.color}`}
            >
              <div className="flex items-center gap-3">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-purple-400" />
                ) : (
                  <Icon className="h-4 w-4 shrink-0" />
                )}
                <div>
                  <div className="text-xs font-semibold">{act.name}</div>
                  <div className="text-[10px] font-mono opacity-70">{act.endpoint}</div>
                </div>
              </div>
              <span className="hidden rounded border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[9px] text-zinc-300 xl:inline-block">
                {act.badge}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
