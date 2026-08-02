import React from 'react';
import { StatCard } from '../../../components/common/StatCard';
import { ApiErrorBanner } from '../../../components/common/ApiErrorBanner';
import { Megaphone, Users, Mail, TrendingUp } from 'lucide-react';
import { useValidatedActiveCampaignId } from '../../../hooks/useValidatedActiveCampaignId';
import { useCampaignDashboard } from '../hooks/useCampaignDashboard';
import { useCampaigns } from '../../campaigns/hooks/useCampaigns';

interface MetricGridProps {
  /** Scopes this component to a specific campaign (Campaign Workspace). Falls back to the global active campaign. */
  campaignId?: number | null;
}

export const MetricGrid: React.FC<MetricGridProps> = ({ campaignId }) => {
  const activeCampaignId = useValidatedActiveCampaignId(campaignId);
  const { data: dashboard, isLoading: isDashLoading, isError: isDashError, error: dashError } =
    useCampaignDashboard(activeCampaignId);
  const { data: campaigns, isLoading: isCmpLoading, isError: isCmpError, error: cmpError } =
    useCampaigns();

  const icons = [
    <Megaphone key="1" className="h-4 w-4 text-purple-400" />,
    <Users key="2" className="h-4 w-4 text-purple-400" />,
    <Mail key="3" className="h-4 w-4 text-purple-400" />,
    <TrendingUp key="4" className="h-4 w-4 text-emerald-400" />,
  ];

  const totalCampaigns = campaigns?.length || 0;
  const activeCount = campaigns?.filter((c) => c.status === 'active').length || 0;

  const metrics = [
    {
      id: 'active_campaigns',
      label: 'Active Campaigns',
      value: activeCampaignId && dashboard ? (dashboard.status === 'active' ? '1 Active' : '0 Active') : `${activeCount} / ${totalCampaigns}`,
      changePercent: 0,
      trend: 'neutral' as const,
      subtext: activeCampaignId && dashboard ? `Campaign #${dashboard.campaign_id} selected` : `${totalCampaigns} total campaigns`,
    },
    {
      id: 'total_leads',
      label: 'Total Leads Ingested',
      value: dashboard ? dashboard.total_leads : (isDashLoading || isCmpLoading ? '...' : 0),
      changePercent: 0,
      trend: 'up' as const,
      subtext: dashboard ? `${dashboard.qualified_leads} qualified` : 'Select campaign to view',
    },
    {
      id: 'emails_sent',
      label: 'Emails Sent',
      value: dashboard ? dashboard.emails_sent : (isDashLoading || isCmpLoading ? '...' : 0),
      changePercent: 0,
      trend: 'up' as const,
      subtext: dashboard ? `${dashboard.waiting_approval} pending approval` : 'Via Gmail API',
    },
    {
      id: 'reply_rate',
      label: 'Avg Reply Rate',
      value: dashboard ? `${dashboard.reply_rate}%` : '0%',
      changePercent: 0,
      trend: 'up' as const,
      subtext: dashboard ? `${dashboard.replies} replies detected` : 'Detected via Gmail Scanner',
    },
  ];

  const errorMessage =
    (cmpError instanceof Error && cmpError.message) ||
    (dashError instanceof Error && dashError.message) ||
    undefined;

  return (
    <div className="space-y-3">
      {(isCmpError || isDashError) && (
        <ApiErrorBanner message={errorMessage} />
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, idx) => (
          <StatCard
            key={metric.id}
            label={metric.label}
            value={metric.value}
            changePercent={metric.changePercent}
            trend={metric.trend}
            subtext={metric.subtext}
            icon={icons[idx % icons.length]}
          />
        ))}
      </div>
    </div>
  );
};
