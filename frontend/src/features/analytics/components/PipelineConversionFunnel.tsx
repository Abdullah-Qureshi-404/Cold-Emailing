import React from 'react';
import { Layers } from 'lucide-react';
import { ApiErrorBanner } from '../../../components/common/ApiErrorBanner';
import { useValidatedActiveCampaignId } from '../../../hooks/useValidatedActiveCampaignId';
import { useLeadSummary } from '../../leads/hooks/useLeadSummary';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface PipelineConversionFunnelProps {
  /** Scopes this component to a specific campaign (Campaign Workspace). Falls back to the global active campaign. */
  campaignId?: number | null;
}

export const PipelineConversionFunnel: React.FC<PipelineConversionFunnelProps> = ({ campaignId }) => {
  const activeCampaignId = useValidatedActiveCampaignId(campaignId);
  const { data: summary, isError, error } = useLeadSummary(activeCampaignId);

  const chartData = [
    { stage: 'Scraped', count: summary?.found ?? 0, color: '#94a3b8' },
    { stage: 'Emails Found', count: summary?.email_found ?? 0, color: '#60a5fa' },
    { stage: 'Researched', count: summary?.research_complete ?? 0, color: '#c084fc' },
    { stage: 'Qualified', count: summary?.qualified ?? 0, color: '#a855f7' },
    { stage: 'Drafts Ready', count: summary?.email_generated ?? 0, color: '#38bdf8' },
    { stage: 'Approved', count: summary?.waiting_approval ?? 0, color: '#fbbf24' },
    { stage: 'Sent', count: summary?.sent ?? 0, color: '#3b82f6' },
    { stage: 'Replied', count: summary?.replied ?? 0, color: '#34d399' },
  ];

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111113] p-5 space-y-4 premium-card-hover ai-glow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-purple-400" />
          <div>
            <h3 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">
              16-Stage Pipeline Conversion Funnel
            </h3>
            <p className="text-[11px] text-zinc-400">
              GET /campaigns/{activeCampaignId || '{id}'}/leads-summary
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-purple-400 font-semibold bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
          Conversion Funnel
        </span>
      </div>

      {isError && (
        <ApiErrorBanner
          message={error instanceof Error ? error.message : 'Failed to load pipeline funnel data.'}
        />
      )}

      <div className="h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
            <XAxis
              dataKey="stage"
              stroke="#71717a"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#161619',
                borderColor: 'rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontSize: '11px',
                color: '#f4f4f5',
              }}
              formatter={(value: any) => [`${value} leads`, 'Volume']}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
