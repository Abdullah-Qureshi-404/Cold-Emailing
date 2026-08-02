import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/common/PageHeader';
import { CampaignMetricsBar } from '../components/CampaignMetricsBar';
import { CampaignTable } from '../components/CampaignTable';
import { CreateCampaignModal } from '../components/CreateCampaignModal';
import { useCampaigns } from '../hooks/useCampaigns';
import { useCampaignActions } from '../hooks/useCampaignActions';
import { BASE_URL } from '../../../services/api/client';
import { Plus } from 'lucide-react';

export const CampaignStudioPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: campaigns = [], isLoading, isError } = useCampaigns();
  const { startCampaign, pauseCampaign } = useCampaignActions();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleToggleStatus = async (id: number, currentStatus: string) => {
    try {
      if (currentStatus === 'active') {
        await pauseCampaign(id);
      } else {
        await startCampaign(id);
      }
    } catch (err) {
      console.error('Error toggling campaign status:', err);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaign Studio"
        description="Create, start, pause and stop campaigns. Open a campaign to run its pipeline."
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-purple-500 ai-glow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>New AI Campaign</span>
          </button>
        }
      />

      {/* Campaign Summary Metrics */}
      <CampaignMetricsBar />

      {/* Loading & Error States */}
      {isLoading && (
        <div className="p-8 text-center text-xs text-zinc-500 font-mono">
          Loading campaigns from backend server...
        </div>
      )}

      {isError && (
        <div className="p-8 text-center text-xs text-red-400 font-mono">
          Failed to fetch campaigns from FastAPI server at {BASE_URL}.
        </div>
      )}

      {/* Campaign Data Table — a row opens that campaign's workspace */}
      {!isLoading && !isError && (
        <CampaignTable
          campaigns={campaigns}
          onSelectCampaign={(cmp) => navigate(`/app/campaigns/${cmp.id}`)}
          onToggleStatus={handleToggleStatus}
        />
      )}

      {/* Create Modal */}
      <CreateCampaignModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
