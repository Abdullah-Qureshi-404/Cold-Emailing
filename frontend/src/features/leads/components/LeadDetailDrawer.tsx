import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Building2, User, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react'
import { StatusBadge } from '../../../components/common/StatusBadge'
import type { LeadListItem } from '../../../types/api'

interface LeadDetailDrawerProps {
  lead: LeadListItem | null
  onClose: () => void
}

export const LeadDetailDrawer: React.FC<LeadDetailDrawerProps> = ({ lead, onClose }) => {
  if (!lead) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-xs"
        />

        <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="flex w-screen max-w-lg flex-col border-l border-white/[0.08] bg-[#12121a] text-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-100">{lead.company_name}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StatusBadge status={lead.status} />
                    <span className="text-[11px] text-zinc-400">Lead #{lead.id}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Contact Information Card */}
              <div className="rounded-xl border border-white/[0.08] bg-[#161619] p-4 space-y-3">
                <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-purple-400" />
                  Prospect Information
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[11px] text-zinc-500 block">Contact Name</span>
                    <span className="font-semibold text-zinc-200">{lead.contact_name || 'Not Available'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-500 block">Email Address</span>
                    {lead.email ? (
                      <span className="font-mono text-purple-300 font-medium">{lead.email}</span>
                    ) : (
                      <span className="text-zinc-500 font-mono">No email found</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-500 block">Website</span>
                    {lead.website ? (
                      <a
                        href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-cyan-400 hover:underline flex items-center gap-1 truncate"
                      >
                        <span className="truncate">{lead.website}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    ) : (
                      <span className="text-zinc-500">—</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[11px] text-zinc-500 block">Acquisition Source</span>
                    <span className="font-medium text-zinc-300 capitalize">{lead.source || 'Scraped'}</span>
                  </div>
                </div>
              </div>

              {/* AI Research Intelligence Card */}
              <div className="rounded-xl border border-white/[0.08] bg-[#161619] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                    AI Research Summary
                  </h3>
                  {lead.icp_fit_score !== null && (
                    <span className="text-[10px] font-mono font-semibold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                      ICP Fit: {lead.icp_fit_score}/100
                    </span>
                  )}
                </div>

                {lead.company_summary ? (
                  <p className="text-xs text-zinc-300 leading-relaxed bg-[#111113] p-3 rounded-lg border border-white/[0.04]">
                    {lead.company_summary}
                  </p>
                ) : (
                  <p className="text-xs text-zinc-500 italic py-2">
                    No deep AI research completed yet for this prospect.
                  </p>
                )}

                {/* Detected Issues / Pain Points */}
                {lead.website_issues && lead.website_issues.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-medium text-zinc-400">Identified Opportunities & Issues:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {lead.website_issues.map((issue, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] rounded-md bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-purple-300"
                        >
                          {issue}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ICP Qualification Reason Card */}
              <div className="rounded-xl border border-white/[0.08] bg-[#161619] p-4 space-y-3">
                <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  Qualification Reasoning
                </h3>

                {lead.qualification_reason ? (
                  <div className="rounded-lg bg-[#111113] p-3 border border-white/[0.04] text-xs text-zinc-300 leading-relaxed">
                    {lead.qualification_reason}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 italic py-2">
                    {lead.status === 'qualified'
                      ? 'Qualified as target ICP based on industry criteria.'
                      : 'Pending qualification evaluation.'}
                  </p>
                )}

                {lead.score_reasons && lead.score_reasons.length > 0 && (
                  <ul className="list-disc list-inside text-xs text-zinc-400 space-y-1 pt-1">
                    {lead.score_reasons.map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/[0.08] p-4 flex items-center justify-between text-xs text-zinc-400">
              <span>Status: <strong className="text-zinc-200 capitalize">{lead.status}</strong></span>
              <button
                onClick={onClose}
                className="rounded-lg bg-[#18181c] border border-white/[0.08] px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/[0.05] transition"
              >
                Close Drawer
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  )
}
