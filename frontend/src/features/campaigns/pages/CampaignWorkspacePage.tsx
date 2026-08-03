import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  LayoutDashboard,
  Users,
  Mail,
  Activity,
  Play,
  Pause,
  MapPin,
  Target,
  FileText,
} from 'lucide-react';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { PageHeader } from '../../../components/common/PageHeader';
import { MetricGrid } from '../../dashboard/components/MetricGrid';
import { CampaignTelemetryGrid } from '../../analytics/components/CampaignTelemetryGrid';
import { LeadWorkspacePanel } from '../../leads/components/LeadWorkspacePanel';
import { EmailWorkspacePanel } from '../../email-studio/components/EmailWorkspacePanel';
import { TaskRow } from '../../../components/layout/TaskActivityDrawer';
import { useCampaigns } from '../hooks/useCampaigns';
import { useCampaignActions } from '../hooks/useCampaignActions';
import { useUIStore } from '../../../store/useUIStore';
import { useTaskStore } from '../../../store/useTaskStore';
import { cn } from '../../../lib/utils';

type WorkspaceTab = 'overview' | 'leads' | 'emails' | 'activity';

const TABS: { id: WorkspaceTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'emails', label: 'Emails', icon: Mail },
  { id: 'activity', label: 'Activity', icon: Activity },
];

/**
 * Single-campaign workspace: everything you can do to one campaign lives here,
 * behind tabs, instead of being scattered across separate top-level pages.
 */
export const CampaignWorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const campaignId = Number(id);

  const { data: campaigns, isLoading, isError } = useCampaigns();
  const { startCampaign, pauseCampaign } = useCampaignActions();
  const setActiveCampaignId = useUIStore((state) => state.setActiveCampaignId);
  const tasks = useTaskStore((state) => state.tasks);

  const [tab, setTab] = useState<WorkspaceTab>('overview');

  const campaign = useMemo(
    () => campaigns?.find((c) => c.id === campaignId) ?? null,
    [campaigns, campaignId]
  );

  // This page IS the campaign context. Publishing it to the store keeps every
  // component that still reads the global active campaign (dashboard widgets,
  // analytics) pointed at the campaign the user is actually looking at.
  // useActiveCampaignSync only reconciles stale/missing ids, so it will leave
  // this value alone — no need to restore anything on unmount.
  useEffect(() => {
    if (campaign) setActiveCampaignId(campaign.id);
  }, [campaign, setActiveCampaignId]);

  const campaignTasks = useMemo(
    () => tasks.filter((t) => t.campaignId === campaignId),
    [tasks, campaignId]
  );

  const handleToggleStatus = async () => {
    if (!campaign) return;
    try {
      if (campaign.status === 'active') {
        await pauseCampaign(campaign.id);
      } else {
        await startCampaign(campaign.id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Status change failed';
      alert(`Error updating campaign status: ${msg}`);
    }
  };

  if (!Number.isFinite(campaignId) || campaignId <= 0) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-950/20 p-6 text-center text-xs text-red-400 font-mono">
        Invalid campaign id "{id}".
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-zinc-500 font-mono">
        Loading campaign #{campaignId}...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-950/20 p-6 text-center text-xs text-red-400 font-mono">
        Failed to load campaigns from the backend.
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-4 rounded-xl border border-white/[0.08] bg-[#111113] p-8 text-center">
        <p className="text-sm font-semibold text-zinc-100">Campaign #{campaignId} not found</p>
        <p className="text-xs text-zinc-400">
          It may have been deleted. Pick another campaign from the list.
        </p>
        <button
          onClick={() => navigate('/app/campaigns')}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-purple-500"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Campaigns
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={campaign.name}
        description={`${campaign.niche} · ${campaign.target_location} · ${campaign.daily_limit} emails/day`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge
              status={campaign.status}
              variant={
                campaign.status === 'active'
                  ? 'success'
                  : campaign.status === 'paused'
                  ? 'warning'
                  : 'neutral'
              }
            />
            <button
              onClick={handleToggleStatus}
              className="flex items-center gap-2 rounded-lg border border-white/[0.12] bg-[#18181c] px-3 py-2 text-xs font-semibold text-zinc-200 transition hover:bg-white/[0.05]"
            >
              {campaign.status === 'active' ? (
                <>
                  <Pause className="h-3.5 w-3.5 text-amber-400" /> Pause
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 text-emerald-400" /> Start
                </>
              )}
            </button>
            <button
              onClick={() => navigate('/app/campaigns')}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#141417] px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-white/20"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All Campaigns
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-white/[0.08] pb-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          const badge = t.id === 'activity' ? campaignTasks.length : 0;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-medium transition',
                isActive
                  ? 'border border-purple-500/30 bg-purple-500/15 font-semibold text-purple-300'
                  : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
              {badge > 0 && (
                <span className="rounded-full border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[9px] text-zinc-300">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'overview' && (
        <div className="space-y-6">
          <MetricGrid campaignId={campaign.id} />
          <CampaignTelemetryGrid campaignId={campaign.id} />

          {/* Campaign profile */}
          <div className="grid gap-4 rounded-xl border border-white/[0.08] bg-[#111113] p-5 text-xs sm:grid-cols-2">
            <div>
              <span className="flex items-center gap-1 text-zinc-500">
                <Target className="h-3.5 w-3.5 text-purple-400" /> Niche / Industry
              </span>
              <p className="mt-0.5 font-medium text-zinc-200">{campaign.niche}</p>
            </div>
            <div>
              <span className="flex items-center gap-1 text-zinc-500">
                <MapPin className="h-3.5 w-3.5 text-purple-400" /> Target Location
              </span>
              <p className="mt-0.5 font-medium text-zinc-200">{campaign.target_location}</p>
            </div>
            <div>
              <span className="flex items-center gap-1 text-zinc-500">
                <Target className="h-3.5 w-3.5 text-purple-400" /> Ideal Customer Profile
              </span>
              <p className="mt-0.5 font-medium text-zinc-200">{campaign.target_customer}</p>
            </div>
            <div>
              <span className="flex items-center gap-1 text-zinc-500">
                <FileText className="h-3.5 w-3.5 text-purple-400" /> Offer / Service
              </span>
              <p className="mt-0.5 whitespace-pre-line text-zinc-300">
                {campaign.service_description}
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === 'leads' && <LeadWorkspacePanel campaignId={campaign.id} />}

      {tab === 'emails' && <EmailWorkspacePanel campaignId={campaign.id} />}

      {tab === 'activity' && (
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">Background Task Activity</h2>
            <p className="text-xs text-zinc-400">
              Every Celery task dispatched for this campaign in this session, with live status.
            </p>
          </div>
          {campaignTasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/10 p-8 text-center text-xs text-zinc-500 font-mono">
              No tasks dispatched for this campaign yet. Run an action from the Leads or Emails tab.
            </div>
          ) : (
            <div className="space-y-3">
              {campaignTasks.map((task) => (
                <TaskRow key={task.id} task={task} showCampaign={false} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
