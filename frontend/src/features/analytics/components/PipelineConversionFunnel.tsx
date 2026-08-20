import React from 'react';
import { Layers, ArrowRight } from 'lucide-react';
import { ApiErrorBanner } from '../../../components/common/ApiErrorBanner';
import { useValidatedActiveCampaignId } from '../../../hooks/useValidatedActiveCampaignId';
import { useLeadSummary } from '../../leads/hooks/useLeadSummary';
import { useCampaignDashboard } from '../../dashboard/hooks/useCampaignDashboard';
import { useQuery } from '@tanstack/react-query';
import { campaignsApi } from '../../../services/api/campaigns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';

interface PipelineConversionFunnelProps {
  /** Scopes this component to a specific campaign (Campaign Workspace). Falls back to the global active campaign. */
  campaignId?: number | null;
}

export const PipelineConversionFunnel: React.FC<PipelineConversionFunnelProps> = ({ campaignId }) => {
  const activeCampaignId = useValidatedActiveCampaignId(campaignId);
  const { data: summary, isError: summaryError, error: summaryErr } = useLeadSummary(activeCampaignId);
  const { data: dashboard, isError: dashError, error: dashErr } = useCampaignDashboard(activeCampaignId);

  const { data: progress } = useQuery({
    queryKey: ['pipeline-progress', activeCampaignId],
    queryFn: () => campaignsApi.getPipelineProgress(activeCampaignId!),
    enabled: !!activeCampaignId && activeCampaignId > 0,
  });

  const isError = summaryError || dashError;
  const error = summaryErr || dashErr;

  // Exact data field mapping requested:
  // - "Scraped" maps to total_prospects (1174) / total_leads
  // - "Emails Found" maps to emails_discovered (1034) / emails_found
  // - "Researched" maps to research_done (97) / research_complete
  // - "Qualified" maps to qualified (57) / qualified_leads
  // - "Drafts Ready" maps to drafts (26) / emails_generated
  const scrapedCount = progress?.leads_found ?? dashboard?.total_leads ?? 0;
  const emailsFoundCount = progress?.emails_found ?? ((dashboard?.total_leads ?? 0) - (summary?.email_not_found ?? 0));
  const researchedCount = progress?.research_done ?? dashboard?.research_complete ?? 0;
  const qualifiedCount = progress?.qualified_done ?? dashboard?.qualified_leads ?? 0;
  const draftsCount = progress?.emails_written ?? dashboard?.emails_generated ?? 0;
  const sentCount = dashboard?.emails_sent ?? summary?.sent ?? 0;
  const repliedCount = dashboard?.replies ?? summary?.replied ?? 0;

  const stages = [
    { stage: 'Scraped', count: scrapedCount },
    { stage: 'Emails Found', count: emailsFoundCount },
    { stage: 'Researched', count: researchedCount },
    { stage: 'Qualified', count: qualifiedCount },
    { stage: 'Drafts Ready', count: draftsCount },
    { stage: 'Sent', count: sentCount },
    { stage: 'Replied', count: repliedCount },
  ];

  // Calculate stage-by-stage percentage conversion labels
  const conversionSteps = stages.slice(0, -1).map((current, idx) => {
    const next = stages[idx + 1];
    const pct = current.count > 0 ? ((next.count / current.count) * 100).toFixed(1) : '0.0';
    return {
      fromStage: current.stage,
      toStage: next.stage,
      fromCount: current.count,
      toCount: next.count,
      pct,
    };
  });

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#12121a]/90 p-6 space-y-5 backdrop-blur-xl shadow-xl">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600/20 text-violet-300 border border-violet-500/30">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
              Pipeline Conversion Funnel
            </h3>
            <p className="text-xs text-zinc-400">
              GET /campaigns/{activeCampaignId || '{id}'}/leads-summary & /dashboard
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold text-violet-300 bg-violet-600/20 px-3 py-1 rounded-full border border-violet-500/30">
          Stage Telemetry
        </span>
      </div>

      {isError && (
        <ApiErrorBanner
          message={error instanceof Error ? error.message : 'Failed to load pipeline funnel data.'}
        />
      )}

      {/* Recharts Proportional Bar Chart */}
      <div className="h-72 w-full pt-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={stages} margin={{ top: 25, right: 10, left: -20, bottom: 25 }}>
            <XAxis
              dataKey="stage"
              stroke="#a1a1aa"
              fontSize={11}
              fontWeight={600}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#71717a" 
              fontSize={11} 
              tickLine={false} 
              axisLine={false}
              domain={[0, (dataMax: number) => Math.max(dataMax * 1.15, 10)]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#12121a',
                borderColor: 'rgba(255,255,255,0.12)',
                borderRadius: '12px',
                fontSize: '12px',
                color: '#f4f4f5',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
              }}
              formatter={(value: any) => [`${value} leads`, 'Volume']}
            />
            <Bar dataKey="count" fill="#7c3aed" radius={[8, 8, 0, 0]} minPointSize={4}>
              <LabelList 
                dataKey="count" 
                position="top" 
                fill="#c084fc" 
                fontSize={11} 
                fontWeight={700} 
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stage-to-Stage Conversion Cards */}
      <div className="pt-2">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Stage-to-Stage Conversion Rates
        </h4>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
          {conversionSteps.map((step, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-white/[0.08] bg-[#0a0a0f]/60 p-3 backdrop-blur-md transition hover:border-violet-500/40 hover:bg-[#161624]"
            >
              <div className="text-[10px] font-semibold text-zinc-400 truncate flex items-center gap-1">
                <span>{step.fromStage.split(' ')[0]}</span>
                <ArrowRight className="h-2.5 w-2.5 text-violet-400 shrink-0" />
                <span>{step.toStage.split(' ')[0]}</span>
              </div>
              <div className="mt-1.5 text-xs font-bold text-white">
                {step.fromCount} → {step.toCount}
              </div>
              <div className="mt-0.5 text-[11px] font-semibold text-violet-300">
                ({step.pct}%)
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
