import React from 'react';
import { Sparkles, ShieldCheck, AlertCircle, Cpu } from 'lucide-react';
import { ApiErrorBanner } from '../../../components/common/ApiErrorBanner';
import { useValidatedActiveCampaignId } from '../../../hooks/useValidatedActiveCampaignId';
import { useResearchStatus } from '../../leads/hooks/useResearchStatus';

interface ResearchQualityCardProps {
  /** Scopes this component to a specific campaign (Campaign Workspace). Falls back to the global active campaign. */
  campaignId?: number | null;
}

export const ResearchQualityCard: React.FC<ResearchQualityCardProps> = ({ campaignId }) => {
  const activeCampaignId = useValidatedActiveCampaignId(campaignId);
  const { data: research, isError, error } = useResearchStatus(activeCampaignId);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111113] p-5 space-y-4 premium-card-hover">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-400" />
          <div>
            <h3 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">
              AI Research Audit
            </h3>
            <p className="text-[11px] text-zinc-400">
              Confidence evaluation and enrichment depth
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-cyan-400 font-semibold bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
          Quality Confidence
        </span>
      </div>

      {isError && (
        <ApiErrorBanner
          message={error instanceof Error ? error.message : 'Failed to load research quality metrics.'}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-1 text-xs">
        <div className="rounded-lg border border-white/[0.06] bg-[#161619] p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
            <Cpu className="h-3.5 w-3.5 text-purple-400" />
            <span>Total Campaign Leads</span>
          </div>
          <div className="font-mono text-sm font-semibold text-zinc-100">
            {research?.total_leads || 0}
          </div>
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-[#161619] p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>Researched</span>
          </div>
          <div className="font-mono text-sm font-semibold text-cyan-300">
            {research?.researched || 0} leads
          </div>
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-[#161619] p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Avg AI Confidence</span>
          </div>
          <div className="font-mono text-sm font-semibold text-emerald-400">
            {research?.average_confidence || 0}%
          </div>
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-[#161619] p-3 space-y-1">
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
            <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
            <span>Insufficient Data</span>
          </div>
          <div className="font-mono text-sm font-semibold text-amber-400">
            {research?.insufficient || 0} leads
          </div>
        </div>
      </div>
    </div>
  );
};
