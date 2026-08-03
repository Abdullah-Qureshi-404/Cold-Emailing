import React from 'react';
import { Layers, CheckCircle2, ArrowRight } from 'lucide-react';
import { useValidatedActiveCampaignId } from '../../../hooks/useValidatedActiveCampaignId';
import { useLeadSummary } from '../../leads/hooks/useLeadSummary';

interface CampaignExecutionTimelineProps {
  /** Scopes this component to a specific campaign (Campaign Workspace). Falls back to the global active campaign. */
  campaignId?: number | null;
}

export const CampaignExecutionTimeline: React.FC<CampaignExecutionTimelineProps> = ({ campaignId }) => {
  const activeCampaignId = useValidatedActiveCampaignId(campaignId);
  const { data: summary, isLoading, isError } = useLeadSummary(activeCampaignId);

  const pipelineStages = [
    { key: 'found', label: '1. Scraped / Imported', count: summary?.found ?? 0, color: 'text-zinc-400' },
    { key: 'email_found', label: '2. Emails Discovered', count: summary?.email_found ?? 0, color: 'text-zinc-300' },
    { key: 'research_complete', label: '3. AI Research Done', count: summary?.research_complete ?? 0, color: 'text-purple-400' },
    { key: 'qualified', label: '4. Qualified ICP Fit', count: summary?.qualified ?? 0, color: 'text-purple-300' },
    { key: 'waiting_approval', label: '5. Drafts Pending Approval', count: summary?.waiting_approval ?? 0, color: 'text-amber-400' },
    { key: 'sent', label: '6. Emails Sent (Gmail API)', count: summary?.sent ?? 0, color: 'text-blue-400' },
    { key: 'replied', label: '7. Positive Replies', count: summary?.replied ?? 0, color: 'text-emerald-400' },
  ];

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111113] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-zinc-100">16-Stage Pipeline Progression</h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-400">
          GET /campaigns/{activeCampaignId || '{id}'}/leads-summary
        </span>
      </div>

      <p className="text-xs text-zinc-400">
        Real backend lead state breakdown queried directly from database.
      </p>

      {isLoading && (
        <div className="py-4 text-center text-xs text-zinc-500 font-mono">
          Loading pipeline status...
        </div>
      )}

      {isError && (
        <div className="py-4 text-center text-xs text-red-400 font-mono">
          Failed to load pipeline telemetry
          {activeCampaignId ? ` for Campaign #${activeCampaignId}` : ''}. Check that the backend is running.
        </div>
      )}

      {!activeCampaignId && !isError && (
        <div className="py-4 text-center text-xs text-zinc-500 font-mono">
          Select an active campaign to view pipeline telemetry.
        </div>
      )}

      <div className="space-y-2.5">
        {pipelineStages.map((s, idx) => (
          <div
            key={s.key}
            className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#161619] px-3 py-2 text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-zinc-500">#{idx + 1}</span>
              <span className="font-medium text-zinc-200">{s.label}</span>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className={`font-semibold ${s.color}`}>{s.count} leads</span>
              {idx < pipelineStages.length - 1 && (
                <ArrowRight className="h-3 w-3 text-zinc-600" />
              )}
              {idx === pipelineStages.length - 1 && (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
