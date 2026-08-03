import React, { useState } from 'react';
import {
  CheckCircle2,
  Send,
  Building,
  User,
  Mail,
  Sparkles,
  AlertCircle,
  Save,
  Loader2,
} from 'lucide-react';
import { DraftStatusBadge } from './DraftStatusBadge';
import type { EmailDraft } from '../../../types/api';

interface DraftInspectorProps {
  draft: EmailDraft | null;
  /** Approves the draft. Any unsaved edits are persisted first by this component. */
  onApprove: (leadId: number) => void | Promise<void>;
  /** Persists subject/body edits without approving (PATCH /leads/draft/{lead_id}). */
  onSave: (leadId: number, subject: string, body: string) => Promise<void>;
  isApproving?: boolean;
  isSaving?: boolean;
}

export const DraftInspector: React.FC<DraftInspectorProps> = ({
  draft,
  onApprove,
  onSave,
  isApproving,
  isSaving,
}) => {
  // Edits are keyed by lead id rather than synced through an effect, so
  // selecting a different draft naturally shows that draft's server values
  // without a cascading re-render.
  const [edits, setEdits] = useState<{ leadId: number; subject: string; body: string } | null>(
    null
  );

  const activeEdits = draft && edits?.leadId === draft.lead_id ? edits : null;
  const subject = activeEdits ? activeEdits.subject : draft?.subject || '';
  const body = activeEdits ? activeEdits.body : draft?.body || '';

  const setSubject = (value: string) => {
    if (draft) setEdits({ leadId: draft.lead_id, subject: value, body });
  };
  const setBody = (value: string) => {
    if (draft) setEdits({ leadId: draft.lead_id, subject, body: value });
  };

  if (!draft) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-[#111113] p-12 text-center text-zinc-500 h-[650px] flex flex-col items-center justify-center space-y-3 font-mono">
        <Mail className="h-8 w-8 text-zinc-600" />
        <p className="text-xs">Select an email draft from the queue to review and approve.</p>
      </div>
    );
  }

  const isApproved = draft.status === 'approved';
  const isDirty = subject !== (draft.subject || '') || body !== (draft.body || '');
  const isBusy = !!isSaving || !!isApproving;

  const handleSave = async () => {
    if (!isDirty) return;
    try {
      await onSave(draft.lead_id, subject, body);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      alert(`Error saving draft: ${msg}`);
    }
  };

  /**
   * Approval only takes a lead_id, so unsaved edits would be silently discarded.
   * Persist first, then approve — one round-trip sequence, no separate gate.
   */
  const handleApprove = async () => {
    try {
      if (isDirty) {
        await onSave(draft.lead_id, subject, body);
      }
      await onApprove(draft.lead_id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Approve failed';
      alert(`Error approving draft: ${msg}`);
    }
  };

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111113] p-6 space-y-5 h-[650px] flex flex-col justify-between ai-glow-sm">
      {/* Header Info */}
      <div className="space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 font-bold text-sm">
              {draft.company_name.charAt(0)}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                {draft.company_name}
                <DraftStatusBadge status={draft.status} />
              </h2>
              <p className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5">
                <User className="h-3.5 w-3.5 text-zinc-500" />
                Target Company: {draft.company_name}
              </p>
            </div>
          </div>

          <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
            Lead #{draft.lead_id}
          </span>
        </div>

        {/* Lead Context Banner */}
        <div className="flex items-center justify-between rounded-lg border border-purple-500/20 bg-purple-950/20 p-3 text-xs text-purple-300">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span>AI Copy generated via Groq Llama 3.3 Engine</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
            <Building className="h-3 w-3" /> Ready for Gmail API
          </span>
        </div>

        {/* Email Subject Line */}
        <div className="space-y-1.5">
          <label className="flex items-center justify-between text-[10px] uppercase font-semibold tracking-wider text-zinc-500">
            <span>Subject Line</span>
            {!isApproved && (
              <span
                className={`font-mono normal-case tracking-normal ${
                  isDirty ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {isDirty ? 'Unsaved changes' : 'Saved'}
              </span>
            )}
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={isApproved}
            className="w-full rounded-lg border border-white/[0.12] bg-[#161619] p-2.5 text-xs text-zinc-100 font-medium focus:border-purple-500/50 focus:outline-none disabled:opacity-75"
          />
        </div>

        {/* Email Body Text */}
        <div className="space-y-1.5 flex-1">
          <label className="block text-[10px] uppercase font-semibold tracking-wider text-zinc-500">
            Email Body Content
          </label>
          <textarea
            rows={10}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={isApproved}
            className="w-full rounded-lg border border-white/[0.12] bg-[#161619] p-3 text-xs text-zinc-200 font-sans leading-relaxed focus:border-purple-500/50 focus:outline-none disabled:opacity-75"
          />
        </div>
      </div>

      {/* Action Footer */}
      <div className="border-t border-white/[0.08] pt-4 flex items-center justify-between gap-3">
        <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-1 min-w-0">
          <AlertCircle className="h-3 w-3 shrink-0 text-purple-400" />
          <span className="truncate">PATCH /leads/draft/{draft.lead_id}</span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!isApproved && (
            <button
              onClick={handleSave}
              disabled={!isDirty || isBusy}
              className="flex items-center gap-2 rounded-lg border border-white/[0.12] bg-[#18181c] px-4 py-2.5 text-xs font-semibold text-zinc-200 transition hover:bg-white/[0.05] disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              <span>{isSaving ? 'Saving...' : 'Save Edits'}</span>
            </button>
          )}

          <button
            onClick={handleApprove}
            disabled={isApproved || isBusy}
            className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-xs font-semibold transition ${
              isApproved
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                : 'bg-purple-600 text-white hover:bg-purple-500 ai-glow-sm'
            }`}
          >
            {isApproved ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Approved & Queued for Send</span>
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>
                  {isApproving
                    ? 'Approving...'
                    : isDirty
                    ? 'Save & Approve Draft'
                    : 'Approve Draft'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
