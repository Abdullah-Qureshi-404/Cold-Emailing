import React from 'react';
import { Layers, Sparkles, Send } from 'lucide-react';
import { ApiErrorBanner } from '../../../components/common/ApiErrorBanner';
import { useValidatedActiveCampaignId } from '../../../hooks/useValidatedActiveCampaignId';
import { useLeadSummary } from '../hooks/useLeadSummary';
import { LeadStatusBadge } from './LeadStatusBadge';

interface LeadPipelineOverviewProps {
  /** Scopes this component to a specific campaign (Campaign Workspace). Falls back to the global active campaign. */
  campaignId?: number | null;
}

export const LeadPipelineOverview: React.FC<LeadPipelineOverviewProps> = ({ campaignId }) => {
  const activeCampaignId = useValidatedActiveCampaignId(campaignId);
  const { data: summary, isError, error } = useLeadSummary(activeCampaignId);

  const macroStages = [
    {
      name: 'Acquisition & Discovery',
      icon: Layers,
      color: 'border-blue-500/30 bg-blue-950/10 text-blue-300',
      statuses: [
        { key: 'found', label: 'Found / Imported', count: summary?.found ?? 0 },
        { key: 'email_searching', label: 'Email Discovery', count: summary?.email_searching ?? 0 },
        { key: 'email_found', label: 'Email Found', count: summary?.email_found ?? 0 },
        { key: 'email_not_found', label: 'Email Not Found', count: summary?.email_not_found ?? 0 },
      ],
    },
    {
      name: 'AI Research & Qualification',
      icon: Sparkles,
      color: 'border-purple-500/30 bg-purple-950/10 text-purple-300',
      statuses: [
        { key: 'research_pending', label: 'Research Pending', count: summary?.research_pending ?? 0 },
        { key: 'research_complete', label: 'Research Complete', count: summary?.research_complete ?? 0 },
        { key: 'qualified', label: 'Qualified ICP', count: summary?.qualified ?? 0 },
        { key: 'disqualified', label: 'Disqualified', count: summary?.disqualified ?? 0 },
      ],
    },
    {
      name: 'AI Drafting & Approval',
      icon: Sparkles,
      color: 'border-cyan-500/30 bg-cyan-950/10 text-cyan-300',
      statuses: [
        { key: 'email_generated', label: 'Email Generated', count: summary?.email_generated ?? 0 },
        { key: 'waiting_approval', label: 'Waiting Approval', count: summary?.waiting_approval ?? 0 },
        { key: 'queued', label: 'Queued for Send', count: summary?.queued ?? 0 },
      ],
    },
    {
      name: 'Outreach & Conversion',
      icon: Send,
      color: 'border-emerald-500/30 bg-emerald-950/10 text-emerald-300',
      statuses: [
        { key: 'sent', label: 'Sent (Gmail API)', count: summary?.sent ?? 0 },
        { key: 'followup_1', label: 'Follow-up 1', count: summary?.followup_1 ?? 0 },
        { key: 'followup_2', label: 'Follow-up 2', count: summary?.followup_2 ?? 0 },
        { key: 'replied', label: 'Positive Replies', count: summary?.replied ?? 0 },
        { key: 'cold', label: 'Cold / Unresponsive', count: summary?.cold ?? 0 },
      ],
    },
  ];

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111113] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-zinc-100">16-Stage Pipeline Distribution</h3>
        </div>
        <span className="text-[10px] font-medium text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
          Database Distribution
        </span>
      </div>

      {isError && (
        <ApiErrorBanner
          message={error instanceof Error ? error.message : 'Failed to load pipeline summary.'}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-4">
        {macroStages.map((group, gIdx) => {
          const Icon = group.icon;
          const totalInGroup = group.statuses.reduce((acc, curr) => acc + curr.count, 0);
          return (
            <div
              key={gIdx}
              className={`rounded-xl border p-4 space-y-3 ${group.color} transition hover:border-white/20`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0" />
                  <h4 className="text-xs font-semibold">{group.name}</h4>
                </div>
                <span className="font-mono text-xs font-bold">{totalInGroup}</span>
              </div>

              <div className="space-y-2 pt-1">
                {group.statuses.map((st) => (
                  <div
                    key={st.key}
                    className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#161619] px-2.5 py-1.5 text-xs"
                  >
                    <LeadStatusBadge status={st.key} />
                    <span className="font-mono font-semibold text-zinc-200">{st.count}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
