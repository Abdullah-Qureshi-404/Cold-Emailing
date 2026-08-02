import React from 'react';
import { StatCard } from '../../../components/common/StatCard';
import { ApiErrorBanner } from '../../../components/common/ApiErrorBanner';
import { Users, Sparkles, ShieldCheck, AlertCircle } from 'lucide-react';
import { useValidatedActiveCampaignId } from '../../../hooks/useValidatedActiveCampaignId';
import { useResearchStatus } from '../hooks/useResearchStatus';

interface LeadMetricsBarProps {
  /** Scopes this component to a specific campaign (Campaign Workspace). Falls back to the global active campaign. */
  campaignId?: number | null;
}

export const LeadMetricsBar: React.FC<LeadMetricsBarProps> = ({ campaignId }) => {
  const activeCampaignId = useValidatedActiveCampaignId(campaignId);
  const { data: research, isError, error } = useResearchStatus(activeCampaignId);

  return (
    <div className="space-y-3">
      {isError && (
        <ApiErrorBanner
          message={error instanceof Error ? error.message : 'Failed to load research metrics.'}
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Prospects"
          value={research ? research.total_leads.toLocaleString() : '0'}
          subtext="Scraped & Imported in Campaign"
          icon={<Users className="h-4 w-4 text-purple-400" />}
        />
        <StatCard
          label="Researched Leads"
          value={research ? research.researched.toLocaleString() : '0'}
          subtext="Web Scraped & Groq Analyzed"
          icon={<Sparkles className="h-4 w-4 text-cyan-400" />}
        />
        <StatCard
          label="Avg AI Confidence"
          value={research ? `${research.average_confidence}` : '0.0'}
          subtext="Groq research quality score"
          icon={<ShieldCheck className="h-4 w-4 text-purple-400" />}
        />
        <StatCard
          label="Insufficient Data"
          value={research ? research.insufficient : 0}
          subtext="Flagged for manual review"
          icon={<AlertCircle className="h-4 w-4 text-amber-400" />}
        />
      </div>
    </div>
  );
};
