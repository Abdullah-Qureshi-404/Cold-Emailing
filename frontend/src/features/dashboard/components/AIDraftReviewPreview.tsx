import React, { useState } from 'react';
import { Sparkles, CheckCircle2, Send, Building, Clock } from 'lucide-react';
import { StatusBadge } from '../../../components/common/StatusBadge';
import { useValidatedActiveCampaignId } from '../../../hooks/useValidatedActiveCampaignId';
import { useEmailDrafts } from '../../email-studio/hooks/useEmailDrafts';
import { useEmailActions } from '../../email-studio/hooks/useEmailActions';

interface AIDraftReviewPreviewProps {
  /** Scopes this component to a specific campaign (Campaign Workspace). Falls back to the global active campaign. */
  campaignId?: number | null;
}

export const AIDraftReviewPreview: React.FC<AIDraftReviewPreviewProps> = ({ campaignId }) => {
  const activeCampaignId = useValidatedActiveCampaignId(campaignId);
  const { data: drafts, isLoading, isError } = useEmailDrafts(activeCampaignId);
  const { approveDraft, isApproving } = useEmailActions(activeCampaignId);
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!activeCampaignId) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-[#111113] p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-zinc-100">AI Draft Review Queue</h3>
        </div>
        <p className="text-xs text-zinc-400 font-mono text-center py-6 border border-dashed border-white/10 rounded-lg">
          Select an active campaign above to review generated email drafts.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-[#111113] p-5 text-center text-xs text-zinc-500 font-mono">
        Fetching email drafts from backend...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-[#111113] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-zinc-100">AI Draft Review Queue</h3>
          </div>
          <span className="text-[11px] font-mono text-purple-400">
            GET /leads/{activeCampaignId}/email-drafts
          </span>
        </div>
        <p className="text-xs text-red-400 font-mono text-center py-6 border border-dashed border-red-500/20 rounded-lg">
          Failed to fetch email drafts for Campaign #{activeCampaignId}.
        </p>
      </div>
    );
  }

  if (!drafts || drafts.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-[#111113] p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-zinc-100">AI Draft Review Queue</h3>
          </div>
          <span className="text-[11px] font-mono text-purple-400">
            GET /leads/{activeCampaignId}/email-drafts
          </span>
        </div>
        <p className="text-xs text-zinc-400 font-mono text-center py-6 border border-dashed border-white/10 rounded-lg">
          No email drafts available for Campaign #{activeCampaignId}. Run qualification and email generation tasks to create drafts.
        </p>
      </div>
    );
  }

  const safeIndex = selectedIndex < drafts.length ? selectedIndex : 0;
  const currentDraft = drafts[safeIndex];

  const handleApprove = async () => {
    try {
      await approveDraft(currentDraft.lead_id);
    } catch (err) {
      console.error('Failed to approve draft:', err);
    }
  };

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111113] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-zinc-100">AI Draft Review Queue</h3>
        </div>
        <span className="text-[11px] font-mono text-purple-400">
          GET /leads/{activeCampaignId}/email-drafts
        </span>
      </div>

      {/* Draft Selector Tabs */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3 overflow-x-auto">
        {drafts.map((d, idx) => (
          <button
            key={d.lead_id}
            onClick={() => setSelectedIndex(idx)}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition shrink-0 ${
              safeIndex === idx
                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30 font-medium'
                : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
            }`}
          >
            <Building className="h-3.5 w-3.5 text-zinc-500" />
            <span>{d.company_name}</span>
            <StatusBadge
              status={d.status}
              variant={d.status === 'approved' ? 'success' : 'warning'}
            />
          </button>
        ))}
      </div>

      {/* Prospect Information Banner */}
      <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#161619] p-3 text-xs">
        <div>
          <div className="font-semibold text-zinc-200">{currentDraft.company_name}</div>
          <div className="text-[11px] text-zinc-400">Lead ID: {currentDraft.lead_id}</div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
          <Clock className="h-3.5 w-3.5 text-purple-400" />
          <span>
            Status: <strong className="text-zinc-200 capitalize">{currentDraft.status}</strong>
          </span>
        </div>
      </div>

      {/* Generated Email Content */}
      <div className="rounded-lg border border-white/[0.08] bg-[#141417] p-4 space-y-3 font-sans text-xs">
        <div className="border-b border-white/[0.06] pb-2">
          <span className="text-zinc-500">Subject: </span>
          <span className="font-medium text-zinc-200">{currentDraft.subject || '(No Subject)'}</span>
        </div>
        <div className="whitespace-pre-line text-zinc-300 leading-relaxed font-sans">
          {currentDraft.body || '(No Body Content)'}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[10px] font-mono text-zinc-500">
          PATCH /leads/approve-email/{currentDraft.lead_id}
        </span>
        <button
          onClick={handleApprove}
          disabled={currentDraft.status === 'approved' || isApproving}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
            currentDraft.status === 'approved'
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 cursor-default'
              : 'bg-purple-600 text-white hover:bg-purple-500 ai-glow-sm'
          }`}
        >
          {currentDraft.status === 'approved' ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>Approved & Ready</span>
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              <span>{isApproving ? 'Approving...' : 'Approve Draft'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
