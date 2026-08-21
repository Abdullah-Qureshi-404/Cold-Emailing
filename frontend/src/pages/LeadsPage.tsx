import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Users, Search, ChevronLeft, ChevronRight, Mail, Building2, User, Eye } from 'lucide-react'
import { campaignsApi } from '../services/api/campaigns'
import { leadsApi } from '../services/api/leads'
import { StatusBadge } from '../components/common/StatusBadge'
import { SkeletonRows } from '../components/Skeleton'
import { useUIStore } from '../store/useUIStore'
import { LeadDetailDrawer } from '../features/leads/components/LeadDetailDrawer'
import type { LeadListItem } from '../types/api'

const STAGE_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'found', label: 'Found / Scraped' },
  { value: 'email_found', label: 'Email Found' },
  { value: 'researched', label: 'Researched' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'disqualified', label: 'Disqualified' },
  { value: 'drafted', label: 'Drafted' },
  { value: 'sent', label: 'Sent' },
  { value: 'replied', label: 'Replied' },
  { value: 'cold', label: 'Cold' },
]

export const LeadsPage: React.FC = () => {
  const globalActiveCampaignId = useUIStore((state) => state.activeCampaignId)
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(() => globalActiveCampaignId)
  const [selectedLead, setSelectedLead] = useState<LeadListItem | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [stage, setStage] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 25

  // 300ms debounce for search input to prevent firing query per keystroke
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search)
    }, 300)
    return () => clearTimeout(handler)
  }, [search])

  // Fetch all campaigns
  const { data: campaigns, isLoading: campaignsLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: campaignsApi.getCampaigns,
  })

  // Set default selected campaign once loaded if none selected
  useEffect(() => {
    if (campaigns && campaigns.length > 0 && selectedCampaignId === null) {
      setSelectedCampaignId(campaigns[0].id)
    }
  }, [campaigns, selectedCampaignId])

  // Reset pagination on filter change
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, stage, selectedCampaignId])

  const campaignId = selectedCampaignId ?? (campaigns?.[0]?.id || 0)
  const activeCampaign = campaigns?.find((c) => c.id === campaignId)

  // Fetch leads for the selected campaign
  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ['leads-list', campaignId, stage, debouncedSearch, page],
    queryFn: () =>
      leadsApi.getLeads(campaignId, {
        stage: stage || undefined,
        search: debouncedSearch || undefined,
        page,
        pageSize,
      }),
    enabled: !!campaignId,
  })

  const leads = leadsData?.items ?? []
  const total = leadsData?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative min-h-[calc(100vh-6rem)] bg-[#0a0a0f] text-white"
    >
      <div className="relative mx-auto max-w-7xl py-4 sm:py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-600/30 purple-glow-sm">
              <Users className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Lead Database</h1>
              <p className="mt-1 text-sm text-zinc-400">
                Search, filter, and inspect prospective leads across outreach campaigns.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3.5 py-1 text-xs font-semibold text-violet-300">
              {total} Total Leads
            </span>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid gap-3 sm:grid-cols-12 items-center rounded-2xl border border-white/[0.08] bg-[#12121a]/80 p-4 backdrop-blur-xl">
          {/* Campaign Selector */}
          <div className="sm:col-span-4">
            <label className="mb-1 block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Campaign
            </label>
            <select
              value={selectedCampaignId ?? ''}
              onChange={(e) => setSelectedCampaignId(Number(e.target.value))}
              aria-label="Select campaign"
              className="input w-full font-semibold"
            >
              {campaignsLoading && <option value="">Loading campaigns...</option>}
              {campaigns?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.niche})
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="sm:col-span-5">
            <label className="mb-1 block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Search Leads
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search contact, company, email..."
                className="input w-full pl-9"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <label className="mb-1 block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Status Filter
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              aria-label="Filter by status"
              className="input w-full"
            >
              {STAGE_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Leads Table */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#12121a]/90 backdrop-blur-xl shadow-xl overflow-hidden">
          {leadsLoading ? (
            <div className="p-6">
              <SkeletonRows rows={6} />
            </div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center text-zinc-400">
              <Users className="mx-auto mb-3 h-8 w-8 text-violet-400" />
              <p className="text-sm font-semibold text-zinc-200">No leads found</p>
              <p className="mt-1 text-xs text-zinc-500">
                Try clearing your search query or selecting a different status filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.08] bg-[#1a1a26] text-zinc-400 font-semibold">
                  <tr>
                    <th scope="col" className="px-5 py-3.5">
                      <span className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-violet-400" /> Contact Name
                      </span>
                    </th>
                    <th scope="col" className="px-5 py-3.5">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-violet-400" /> Company
                      </span>
                    </th>
                    <th scope="col" className="px-5 py-3.5">
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-violet-400" /> Email
                      </span>
                    </th>
                    <th scope="col" className="px-5 py-3.5">Status</th>
                    <th scope="col" className="px-5 py-3.5">Campaign</th>
                    <th scope="col" className="px-5 py-3.5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {leads.map((l) => (
                    <tr
                      key={l.id}
                      onClick={() => setSelectedLead(l)}
                      className="cursor-pointer hover:bg-white/[0.04] transition group"
                    >
                      <td className="px-5 py-4 font-semibold text-zinc-100 group-hover:text-purple-300 transition-colors">
                        {l.contact_name || l.company_name || 'Contact'}
                      </td>
                      <td className="px-5 py-4 font-medium text-zinc-300">
                        {l.company_name}
                      </td>
                      <td className="px-5 py-4 text-zinc-400 font-mono">
                        {l.email ? (
                          <span className="text-violet-300">{l.email}</span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={l.status} />
                      </td>
                      <td className="px-5 py-4 font-medium text-zinc-400">
                        {activeCampaign?.name || `Campaign #${campaignId}`}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-400 group-hover:text-purple-300">
                          <Eye className="h-3.5 w-3.5" /> View
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {total > pageSize && (
            <div className="flex items-center justify-between border-t border-white/[0.08] bg-[#1a1a26]/60 px-5 py-3.5 text-xs text-zinc-400 font-medium">
              <span>
                Showing page {page} of {totalPages} ({total} total leads)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  aria-label="Previous page"
                  className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#12121a] px-3 py-1.5 hover:bg-white/[0.08] disabled:opacity-30 transition font-semibold"
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                  className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#12121a] px-3 py-1.5 hover:bg-white/[0.08] disabled:opacity-30 transition font-semibold"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightweight Lead Details Side Drawer */}
      <LeadDetailDrawer
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
      />
    </motion.div>
  )
}
