import React, { useState } from 'react';
import { Search, Building, Clock } from 'lucide-react';
import { DraftStatusBadge } from './DraftStatusBadge';
import type { EmailDraft } from '../../../types/api';
import { cn } from '../../../lib/utils';

interface DraftListProps {
  drafts: EmailDraft[];
  selectedLeadId: number | null;
  onSelectDraft: (draft: EmailDraft) => void;
}

export const DraftList: React.FC<DraftListProps> = ({
  drafts,
  selectedLeadId,
  onSelectDraft,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');
  const [search, setSearch] = useState('');

  const filteredDrafts = drafts.filter((d) => {
    const matchesFilter = filter === 'all' || d.status === filter;
    const matchesSearch =
      d.company_name.toLowerCase().includes(search.toLowerCase()) ||
      (d.subject && d.subject.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111113] p-4 space-y-3 flex flex-col h-[650px]">
      {/* Header & Filter Tabs */}
      <div className="space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">
            Email Drafts Queue ({filteredDrafts.length})
          </h3>
          <span className="text-[10px] font-medium text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
            AI Generated
          </span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by company or subject..."
            className="w-full rounded-lg border border-white/[0.08] bg-[#161619] py-1.5 pl-8 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-purple-500/50 focus:outline-none"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1">
          {(['all', 'pending', 'approved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-lg px-2.5 py-1 text-[11px] font-medium capitalize transition',
                filter === f
                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30 font-semibold'
                  : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
              )}
            >
              {f === 'pending' ? 'Pending' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Draft Items Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredDrafts.map((draft) => {
          const isSelected = selectedLeadId === draft.lead_id;
          return (
            <button
              key={draft.lead_id}
              onClick={() => onSelectDraft(draft)}
              className={cn(
                'w-full rounded-lg border p-3 text-left transition relative group',
                isSelected
                  ? 'border-purple-500/50 bg-purple-950/20 ai-glow-sm'
                  : 'border-white/[0.06] bg-[#161619] hover:border-white/20'
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 truncate">
                  <Building className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                  <span className="font-semibold text-xs text-zinc-200 truncate">
                    {draft.company_name}
                  </span>
                </div>
                <DraftStatusBadge status={draft.status} />
              </div>

              <div className="text-[11px] text-zinc-400 truncate mb-2">
                Subject: {draft.subject || '(No Subject)'}
              </div>

              <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Lead #{draft.lead_id}
                </span>
                <span className="uppercase text-purple-400">{draft.status}</span>
              </div>
            </button>
          );
        })}

        {filteredDrafts.length === 0 && (
          <div className="p-8 text-center text-xs text-zinc-500 font-mono">
            No email drafts matching filter "{filter}".
          </div>
        )}
      </div>
    </div>
  );
};
