import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Play, Pause, ChevronRight } from 'lucide-react';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { useCampaigns } from '../../campaigns/hooks/useCampaigns';
import { useCampaignActions } from '../../campaigns/hooks/useCampaignActions';
import { useValidatedActiveCampaignId } from '../../../hooks/useValidatedActiveCampaignId';

export const ActiveCampaignsWidget: React.FC = () => {
  const navigate = useNavigate();
  const { data: campaigns, isLoading, isError } = useCampaigns();
  const { startCampaign, pauseCampaign } = useCampaignActions();
  const activeCampaignId = useValidatedActiveCampaignId();

  const handleToggleStatus = async (e: React.MouseEvent, id: number, currentStatus: string) => {
    e.stopPropagation();
    try {
      if (currentStatus === 'active') {
        await pauseCampaign(id);
      } else {
        await startCampaign(id);
      }
    } catch (err) {
      console.error('Failed to toggle campaign status', err);
    }
  };

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111113] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Active AI Campaigns</h3>
        </div>
        <span className="text-xs text-purple-400">
          {campaigns?.length || 0} Total Campaigns
        </span>
      </div>

      {isLoading && (
        <div className="p-4 text-center text-xs text-zinc-500 font-mono">
          Loading campaigns from FastAPI backend...
        </div>
      )}

      {isError && (
        <div className="p-4 text-center text-xs text-red-400 font-mono">
          Failed to load campaigns from backend.
        </div>
      )}

      {!isLoading && !isError && campaigns?.length === 0 && (
        <div className="p-6 text-center text-xs text-zinc-400 font-mono rounded-lg border border-dashed border-white/10">
          No campaigns found. Create your first campaign to begin outreach.
        </div>
      )}

      <div className="space-y-3">
        {campaigns?.map((cmp) => {
          const isSelected = activeCampaignId === cmp.id;
          return (
            <div
              key={cmp.id}
              onClick={() => navigate(`/app/campaigns/${cmp.id}`)}
              className={`group flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border p-3.5 gap-3 cursor-pointer transition ${
                isSelected
                  ? 'border-purple-500/60 bg-purple-950/20'
                  : 'border-white/[0.06] bg-[#161619] hover:border-purple-500/30'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-200 group-hover:text-purple-300 transition">
                    {cmp.name}
                  </span>
                  <StatusBadge
                    status={cmp.status}
                    variant={cmp.status === 'active' ? 'success' : 'warning'}
                  />
                  {isSelected && (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded border border-purple-500/30">
                      Last opened
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                  <span>
                    Niche: <strong className="text-zinc-300 font-medium">{cmp.niche}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Location: <strong className="text-zinc-300 font-medium">{cmp.target_location}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Limit: <strong className="text-purple-400 font-mono font-medium">{cmp.daily_limit}/day</strong>
                  </span>
                </div>
              </div>

              {/* Action button */}
              <div className="flex items-center gap-4 justify-between sm:justify-end">
                <button
                  onClick={(e) => handleToggleStatus(e, cmp.id, cmp.status)}
                  className="p-1.5 rounded-md border border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] transition"
                  title={cmp.status === 'active' ? 'Pause Campaign' : 'Resume Campaign'}
                >
                  {cmp.status === 'active' ? (
                    <Pause className="h-3.5 w-3.5 text-amber-400" />
                  ) : (
                    <Play className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                </button>
                <ChevronRight className="h-4 w-4 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-purple-400" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
