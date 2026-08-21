import React from 'react';
import { Layers, CheckCircle2, ArrowRight } from 'lucide-react';
import { useValidatedActiveCampaignId } from '../../../hooks/useValidatedActiveCampaignId';
import { useLeadSummary } from '../../leads/hooks/useLeadSummary';
import { useCampaignDashboard } from '../hooks/useCampaignDashboard';
import { useQuery } from '@tanstack/react-query';
import { campaignsApi } from '../../../services/api/campaigns';

interface CampaignExecutionTimelineProps {
  /** Scopes this component to a specific campaign (Campaign Workspace). Falls back to the global active campaign. */
  campaignId?: number | null;
}

export const CampaignExecutionTimeline: React.FC<CampaignExecutionTimelineProps> = ({ campaignId }) => {
  const activeCampaignId = useValidatedActiveCampaignId(campaignId);
  const { data: summary, isLoading, isError } = useLeadSummary(activeCampaignId);
  const { data: dashboard } = useCampaignDashboard(activeCampaignId);
  const { data: progress } = useQuery({
    queryKey: ['pipeline-progress', activeCampaignId],
    queryFn: () => campaignsApi.getPipelineProgress(activeCampaignId!),
    enabled: !!activeCampaignId && activeCampaignId > 0,
  });

  const pipelineStages = [
    { key: 'found', label: '1. Scraped / Imported', count: progress?.leads_found ?? dashboard?.total_leads ?? 0, color: 'text-zinc-300' },
    { key: 'email_found', label: '2. Emails Discovered', count: progress?.emails_found ?? ((dashboard?.total_leads ?? 0) - (summary?.email_not_found ?? 0)), color: 'text-zinc-200' },
    { key: 'research_complete', label: '3. AI Research Done', count: progress?.research_done ?? dashboard?.research_complete ?? 0, color: 'text-purple-400' },
    { key: 'qualified', label: '4. Qualified ICP Fit', count: progress?.qualified_done ?? dashboard?.qualified_leads ?? 0, color: 'text-purple-300' },
    { key: 'waiting_approval', label: '5. Drafts Ready', count: progress?.emails_written ?? dashboard?.emails_generated ?? 0, color: 'text-amber-400' },
    { key: 'sent', label: '6. Emails Sent (Gmail API)', count: dashboard?.emails_sent ?? summary?.sent ?? 0, color: 'text-blue-400' },
    { key: 'replied', label: '7. Positive Replies', count: dashboard?.replies ?? summary?.replied ?? 0, color: 'text-emerald-400' },
  ];

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111113] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-zinc-100">16-Stage Pipeline Progression</h3>
        </div>
        <span className="text-[11px] font-medium text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
          PostgreSQL Ground Truth
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
