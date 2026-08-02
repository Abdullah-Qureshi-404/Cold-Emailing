import React, { useState } from 'react';
import { Search, Play, Pause, ChevronRight, Check } from 'lucide-react';
import { StatusBadge } from '../../../components/common/StatusBadge';
import type { Campaign } from '../../../types/api';
import { cn } from '../../../lib/utils';
import { useValidatedActiveCampaignId } from '../../../hooks/useValidatedActiveCampaignId';

interface CampaignTableProps {
  campaigns: Campaign[];
  onSelectCampaign: (campaign: Campaign) => void;
  onToggleStatus: (id: number, currentStatus: string) => void;
}

export const CampaignTable: React.FC<CampaignTableProps> = ({
  campaigns,
  onSelectCampaign,
  onToggleStatus,
}) => {
  const [tab, setTab] = useState<'all' | 'active' | 'paused' | 'stopped'>('all');
  const [search, setSearch] = useState('');
  const activeCampaignId = useValidatedActiveCampaignId();

  const filtered = campaigns.filter((c) => {
    const matchesTab = tab === 'all' || c.status === tab;
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.niche.toLowerCase().includes(search.toLowerCase()) ||
      c.target_location.toLowerCase().includes(search.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111113] p-5 space-y-4">
      {/* Toolbar: Search & Status Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {(['all', 'active', 'paused', 'stopped'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition',
                tab === t
                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30 font-semibold'
                  : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns or niche..."
            className="w-full sm:w-64 rounded-lg border border-white/[0.08] bg-[#161619] py-1.5 pl-8 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:border-purple-500/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              <th className="pb-3 pl-2">Campaign Name</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Niche / Location</th>
              <th className="pb-3">Daily Limit</th>
              <th className="pb-3">Created At</th>
              <th className="pb-3 text-right pr-2">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {filtered.map((cmp) => {
              const isSelected = activeCampaignId === cmp.id;
              return (
                <tr
                  key={cmp.id}
                  onClick={() => onSelectCampaign(cmp)}
                  className={`group cursor-pointer transition ${
                    isSelected ? 'bg-purple-950/20' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <td className="py-3.5 pl-2 font-medium text-zinc-200 group-hover:text-purple-300">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{cmp.name}</span>
                      {isSelected && (
                        <span className="text-[10px] text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded border border-purple-500/30 font-mono flex items-center gap-1">
                          <Check className="h-3 w-3" /> Last opened
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate max-w-xs">
                      {cmp.service_description}
                    </div>
                  </td>
                  <td className="py-3.5">
                    <StatusBadge
                      status={cmp.status}
                      variant={
                        cmp.status === 'active'
                          ? 'success'
                          : cmp.status === 'paused'
                          ? 'warning'
                          : 'neutral'
                      }
                    />
                  </td>
                  <td className="py-3.5 font-medium text-zinc-300">
                    <div>{cmp.niche}</div>
                    <div className="text-[10px] text-zinc-500">{cmp.target_location}</div>
                  </td>
                  <td className="py-3.5 font-mono text-purple-300 font-medium">
                    {cmp.daily_limit} emails/day
                  </td>
                  <td className="py-3.5 font-mono text-zinc-400">
                    {new Date(cmp.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 text-right pr-2">
                    <div
                      className="flex items-center justify-end gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => onToggleStatus(cmp.id, cmp.status)}
                        className="p-1.5 rounded-md border border-white/[0.08] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]"
                      >
                        {cmp.status === 'active' ? (
                          <Pause className="h-3.5 w-3.5 text-amber-400" />
                        ) : (
                          <Play className="h-3.5 w-3.5 text-emerald-400" />
                        )}
                      </button>
                      <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-purple-400 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="p-8 text-center text-xs text-zinc-500 font-mono">
            No campaigns matching tab "{tab}" or search term "{search}".
          </div>
        )}
      </div>
    </div>
  );
};
