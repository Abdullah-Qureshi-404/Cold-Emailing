import React from 'react';
import { StatCard } from '../../../components/common/StatCard';
import { ApiErrorBanner } from '../../../components/common/ApiErrorBanner';
import { Megaphone, Users, MailCheck, MessageSquare } from 'lucide-react';
import { useCampaigns } from '../hooks/useCampaigns';
import { useValidatedActiveCampaignId } from '../../../hooks/useValidatedActiveCampaignId';
import { useCampaignDashboard } from '../../dashboard/hooks/useCampaignDashboard';

interface CampaignMetricsBarProps {
  /** Scopes this component to a specific campaign (Campaign Workspace). Falls back to the global active campaign. */
  campaignId?: number | null;
}

export const CampaignMetricsBar: React.FC<CampaignMetricsBarProps> = ({ campaignId }) => {
  const { data: campaigns, isError: isCmpError, error: cmpError } = useCampaigns();
  const activeCampaignId = useValidatedActiveCampaignId(campaignId);
  const { data: dashboard, isError: isDashError, error: dashError } =
    useCampaignDashboard(activeCampaignId);

  const totalCampaigns = campaigns?.length || 0;
  const activeCount = campaigns?.filter((c) => c.status === 'active').length || 0;
  const pausedCount = campaigns?.filter((c) => c.status === 'paused').length || 0;

  const errorMessage =
    (cmpError instanceof Error && cmpError.message) ||
    (dashError instanceof Error && dashError.message) ||
    undefined;

  return (
    <div className="space-y-3">
      {(isCmpError || isDashError) && <ApiErrorBanner message={errorMessage} />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total Campaigns"
        value={totalCampaigns}
        subtext={`${activeCount} active, ${pausedCount} paused`}
        icon={<Megaphone className="h-4 w-4 text-purple-400" />}
      />
      <StatCard
        label="Leads Targeted"
        value={dashboard ? dashboard.total_leads : 0}
        subtext={dashboard ? `${dashboard.emails_sent} emails sent` : 'Select campaign to view'}
        icon={<Users className="h-4 w-4 text-purple-400" />}
      />
      <StatCard
        label="AI Qualified Leads"
        value={dashboard ? dashboard.qualified_leads : 0}
        subtext={dashboard ? `${dashboard.disqualified_leads} disqualified` : 'Via LLM qualification'}
        icon={<MailCheck className="h-4 w-4 text-purple-400" />}
      />
      <StatCard
        label="Avg Positive Reply"
        value={dashboard ? `${dashboard.reply_rate}%` : '0%'}
        trend="up"
        subtext={dashboard ? `${dashboard.replies} replies detected` : 'Detected via Gmail Scanner'}
        icon={<MessageSquare className="h-4 w-4 text-emerald-400" />}
      />
      </div>
    </div>
  );
};
