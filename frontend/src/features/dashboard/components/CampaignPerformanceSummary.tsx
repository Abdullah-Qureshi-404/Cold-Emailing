import React from 'react';
import { BarChart2, CheckCircle, Mail, MessageSquare, Flame } from 'lucide-react';
import { ApiErrorBanner } from '../../../components/common/ApiErrorBanner';
import { useValidatedActiveCampaignId } from '../../../hooks/useValidatedActiveCampaignId';
import { useCampaignDashboard } from '../hooks/useCampaignDashboard';

interface CampaignPerformanceSummaryProps {
  /** Scopes this component to a specific campaign (Campaign Workspace). Falls back to the global active campaign. */
  campaignId?: number | null;
}

export const CampaignPerformanceSummary: React.FC<CampaignPerformanceSummaryProps> = ({ campaignId }) => {
  const activeCampaignId = useValidatedActiveCampaignId(campaignId);
  const { data: metrics, isLoading, isError, error } = useCampaignDashboard(activeCampaignId);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111113] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Campaign Telemetry</h3>
        </div>
        <span className="text-[11px] font-medium text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
          Live Data
        </span>
      </div>

      {isLoading && (
        <div className="py-4 text-center text-xs text-zinc-500 font-mono">
          Loading metrics...
        </div>
      )}

      {isError && (
        <ApiErrorBanner
          message={error instanceof Error ? error.message : 'Failed to load campaign telemetry.'}
        />
      )}

      <div className="grid grid-cols-2 gap-2.5 text-xs">
        <div className="rounded-lg border border-white/[0.06] bg-[#161619] p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
            <span>AI Qualified</span>
          </div>
          <div className="font-mono text-sm font-semibold text-emerald-400">
            {metrics?.qualified_leads ?? 0} leads
          </div>
          <div className="text-[10px] text-zinc-500">{metrics?.disqualified_leads ?? 0} rejected</div>
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-[#161619] p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
            <Mail className="h-3.5 w-3.5 text-blue-400" />
            <span>Emails Sent</span>
          </div>
          <div className="font-mono text-sm font-semibold text-blue-400">
            {metrics?.emails_sent ?? 0} sent
          </div>
          <div className="text-[10px] text-zinc-500">{metrics?.waiting_approval ?? 0} pending approval</div>
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-[#161619] p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
            <MessageSquare className="h-3.5 w-3.5 text-purple-400" />
            <span>Replies</span>
          </div>
          <div className="font-mono text-sm font-semibold text-purple-300">
            {metrics?.replies ?? 0} ({metrics?.reply_rate ?? 0}%)
          </div>
          <div className="text-[10px] text-zinc-500">Gmail Scanner</div>
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-[#161619] p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            <span>Cold / Unresponsive</span>
          </div>
          <div className="font-mono text-sm font-semibold text-amber-400">
            {metrics?.cold_leads ?? 0} leads
          </div>
          <div className="text-[10px] text-zinc-500">Post-sequence</div>
        </div>
      </div>
    </div>
  );
};
