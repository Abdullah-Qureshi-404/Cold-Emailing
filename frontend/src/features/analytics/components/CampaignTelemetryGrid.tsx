import React from 'react';
import { StatCard } from '../../../components/common/StatCard';
import { ApiErrorBanner } from '../../../components/common/ApiErrorBanner';
import { Users, Mail, MessageSquare, CheckCircle, Clock, Send, Flame, Sparkles } from 'lucide-react';
import { useValidatedActiveCampaignId } from '../../../hooks/useValidatedActiveCampaignId';
import { useCampaignDashboard } from '../../dashboard/hooks/useCampaignDashboard';

interface CampaignTelemetryGridProps {
  /** Scopes this component to a specific campaign (Campaign Workspace). Falls back to the global active campaign. */
  campaignId?: number | null;
}

export const CampaignTelemetryGrid: React.FC<CampaignTelemetryGridProps> = ({ campaignId }) => {
  const activeCampaignId = useValidatedActiveCampaignId(campaignId);
  const { data: dashboard, isLoading, isError, error } = useCampaignDashboard(activeCampaignId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
            Campaign Performance Telemetry
          </h3>
          <p className="text-[11px] text-zinc-400">
            Real-time aggregate conversion metrics and outreach throughput
          </p>
        </div>
        <span className="text-[10px] font-medium text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
          {activeCampaignId ? `Campaign #${activeCampaignId} Telemetry` : 'Select Campaign'}
        </span>
      </div>

      {isLoading && (
        <div className="py-4 text-center text-xs text-zinc-500 font-mono">
          Loading campaign telemetry...
        </div>
      )}

      {isError && (
        <ApiErrorBanner
          message={error instanceof Error ? error.message : 'Failed to load campaign telemetry.'}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Prospects"
          value={dashboard ? dashboard.total_leads.toLocaleString() : '0'}
          subtext="Scraped & Imported"
          icon={<Users className="h-4 w-4 text-purple-400" />}
        />
        <StatCard
          label="AI Qualified Leads"
          value={dashboard ? dashboard.qualified_leads.toLocaleString() : '0'}
          subtext={`${dashboard?.disqualified_leads || 0} disqualified`}
          icon={<CheckCircle className="h-4 w-4 text-emerald-400" />}
        />
        <StatCard
          label="Emails Sent (Gmail API)"
          value={dashboard ? dashboard.emails_sent.toLocaleString() : '0'}
          subtext={`${dashboard?.waiting_approval || 0} pending approval`}
          icon={<Mail className="h-4 w-4 text-blue-400" />}
        />
        <StatCard
          label="Positive Replies"
          value={dashboard ? `${dashboard.replies} (${dashboard.reply_rate}%)` : '0 (0%)'}
          subtext="Scanned via Gmail threads"
          icon={<MessageSquare className="h-4 w-4 text-purple-300" />}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="AI Generated Drafts"
          value={dashboard ? dashboard.emails_generated.toLocaleString() : '0'}
          subtext="Groq Llama 3.3 Engine"
          icon={<Sparkles className="h-4 w-4 text-cyan-400" />}
        />
        <StatCard
          label="Pending Human Review"
          value={dashboard ? dashboard.waiting_approval.toLocaleString() : '0'}
          subtext="Email Studio Queue"
          icon={<Clock className="h-4 w-4 text-amber-400" />}
        />
        <StatCard
          label="Follow-ups Dispatched"
          value={dashboard ? dashboard.followups_sent.toLocaleString() : '0'}
          subtext="Sequence step 1 & 2"
          icon={<Send className="h-4 w-4 text-purple-400" />}
        />
        <StatCard
          label="Cold / Unresponsive"
          value={dashboard ? dashboard.cold_leads.toLocaleString() : '0'}
          subtext="Post-sequence completed"
          icon={<Flame className="h-4 w-4 text-rose-400" />}
        />
      </div>
    </div>
  );
};
