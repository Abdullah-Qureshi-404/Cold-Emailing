import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Megaphone } from 'lucide-react';
import { PageHeader } from '../../../components/common/PageHeader';
import { MetricGrid } from '../components/MetricGrid';
import { ActiveCampaignsWidget } from '../components/ActiveCampaignsWidget';
import { AIDraftReviewPreview } from '../components/AIDraftReviewPreview';
import { CampaignExecutionTimeline } from '../components/CampaignExecutionTimeline';
import { CampaignPerformanceSummary } from '../components/CampaignPerformanceSummary';
import { SystemHealthCard } from '../components/SystemHealthCard';
import { CreateCampaignModal } from '../../campaigns/components/CreateCampaignModal';
import { useActiveCampaignSync } from '../../../hooks/useActiveCampaignSync';

/**
 * Read-only overview. Pipeline actions deliberately live only in the Campaign
 * Workspace (/app/campaigns/:id) so there is exactly one place to run them.
 */
export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { campaigns } = useActiveCampaignSync();

  const hasCampaigns = (campaigns?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Command Center"
        description="Cross-campaign overview. Open a campaign to run its pipeline."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/app/campaigns')}
              className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#141417] px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-white/20"
            >
              <Megaphone className="h-3.5 w-3.5" />
              <span>All Campaigns</span>
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-purple-500 ai-glow-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Create Campaign</span>
            </button>
          </div>
        }
      />

      {!hasCampaigns && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-center text-xs text-amber-300 font-mono">
          No campaigns found. Create your first campaign to begin automated outreach.
        </div>
      )}

      {/* KPI Metric Cards */}
      <MetricGrid />

      {/* Main Dashboard Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ActiveCampaignsWidget />
          <AIDraftReviewPreview />
        </div>

        <div className="space-y-6">
          <CampaignExecutionTimeline />
          <CampaignPerformanceSummary />
          <SystemHealthCard />
        </div>
      </div>

      <CreateCampaignModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={() => setIsModalOpen(false)}
      />
    </div>
  );
};
