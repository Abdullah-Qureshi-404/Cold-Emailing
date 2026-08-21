import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { EmailActionCenter } from './EmailActionCenter';
import { DraftList } from './DraftList';
import { DraftInspector } from './DraftInspector';
import { OutreachMaintenancePanel } from '../../analytics/components/OutreachMaintenancePanel';
import { DispatchNoticeBanner } from '../../../components/common/DispatchNoticeBanner';
import { useDispatchNotice } from '../../../hooks/useDispatchNotice';
import { useEmailDrafts } from '../hooks/useEmailDrafts';
import { useEmailActions } from '../hooks/useEmailActions';
import type { EmailDraft } from '../../../types/api';

interface EmailWorkspacePanelProps {
  campaignId: number;
}

/**
 * Draft review, approval and dispatch surface for a single campaign.
 * Mounted as the "Emails" tab of the Campaign Workspace.
 */
export const EmailWorkspacePanel: React.FC<EmailWorkspacePanelProps> = ({ campaignId }) => {
  const { data: drafts = [], isLoading, isError } = useEmailDrafts(campaignId);
  const { approveDraft, isApproving, saveDraft, isSavingDraft, generateDrafts, isGenerating } =
    useEmailActions(campaignId);

  const [selectedDraft, setSelectedDraft] = useState<EmailDraft | null>(null);
  const { notice, notify } = useDispatchNotice();

  const handleApprove = async (leadId: number) => {
    await approveDraft(leadId);
    if (selectedDraft && selectedDraft.lead_id === leadId) {
      setSelectedDraft((prev) => (prev ? { ...prev, status: 'approved' } : null));
    }
    notify(`Draft approved for lead #${leadId}`, 'Email marked approved and queued');
  };

  const handleSave = async (leadId: number, subject: string, body: string) => {
    await saveDraft({ leadId, subject, body });
    notify(`Draft edits saved for lead #${leadId}`, 'Subject and body updated');
  };

  const handleGenerateDrafts = async () => {
    try {
      const response = await generateDrafts();
      notify('Generate AI email drafts', 'Synthesizing personalized drafts...', response);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Generation failed';
      alert(`Error writing emails: ${msg}`);
    }
  };

  const activeDraft = selectedDraft
    ? drafts.find((d) => d.lead_id === selectedDraft.lead_id) || selectedDraft
    : drafts[0] || null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-zinc-100">Email Studio</h2>
        <p className="text-xs text-zinc-400">
          Human approval control center for AI-generated outreach before sending via Gmail API.
        </p>
      </div>

      <DispatchNoticeBanner notice={notice} />

      <EmailActionCenter campaignId={campaignId} onTriggerTask={notify} />

      {isLoading && (
        <div className="p-8 text-center text-xs text-zinc-500 font-mono">
          Loading email drafts for Campaign #{campaignId}...
        </div>
      )}

      {isError && (
        <div className="p-8 text-center text-xs text-red-400 font-mono">
          Failed to fetch drafts for Campaign #{campaignId}.
        </div>
      )}

      {!isLoading && !isError && drafts.length === 0 && (
        <div className="space-y-4 rounded-xl border border-purple-500/30 bg-[#141417] p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-600/20 text-purple-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              No email drafts generated yet for Campaign #{campaignId}
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-zinc-400">
              Run the Groq AI email writer agent to generate personalized copy for qualified leads.
            </p>
          </div>
          <button
            onClick={handleGenerateDrafts}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-purple-500 ai-glow-sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating AI drafts...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Generate AI Email Drafts Now</span>
              </>
            )}
          </button>
        </div>
      )}

      {!isLoading && !isError && drafts.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <DraftList
              drafts={drafts}
              selectedLeadId={activeDraft?.lead_id || null}
              onSelectDraft={(d) => setSelectedDraft(d)}
            />
          </div>
          <div className="lg:col-span-2">
            <DraftInspector
              draft={activeDraft}
              onApprove={handleApprove}
              onSave={handleSave}
              isApproving={isApproving}
              isSaving={isSavingDraft}
            />
          </div>
        </div>
      )}

      {/* Sequence maintenance (follow-ups, reply scan, mark cold) */}
      <OutreachMaintenancePanel campaignId={campaignId} onTriggerTask={notify} />
    </div>
  );
};
