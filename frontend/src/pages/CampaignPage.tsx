import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Search,
  Upload,
  Mail,
  Microscope,
  BadgeCheck,
  PenLine,
  Send,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Users,
  Zap,
  X,
} from 'lucide-react'
import { campaignsApi } from '../services/api/campaigns'
import { leadsApi } from '../services/api/leads'
import { emailsApi } from '../services/api/emails'
import { tasksApi } from '../services/api/tasks'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LabelList } from 'recharts'
import { toast } from '../store/useToastStore'
import { SkeletonRows, SkeletonCards } from '../components/Skeleton'
import type { EmailDraft, LeadListItem, DraftQualityCheck } from '../types/api'

type ActiveTaskItem = { id: string; label: string; step: string; startedAt: number }

const taskStorageKey = (campaignId: number) => `active-tasks-${campaignId}`
// If a task hasn't resolved after this long, something is almost certainly
// wrong (worker restarted, task lost) — offer to stop tracking it instead of
// leaving the UI stuck showing "running" forever.
const STALE_TASK_MS = 10 * 60 * 1000

export const CampaignPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const campaignId = Number(id)
  const queryClient = useQueryClient()

  // Restore in-flight tasks from localStorage so leaving and returning to
  // this campaign doesn't lose track of background jobs still running.
  const [activeTasks, setActiveTasks] = useState<ActiveTaskItem[]>(() => {
    const raw = localStorage.getItem(taskStorageKey(campaignId))
    return raw ? (JSON.parse(raw) as ActiveTaskItem[]) : []
  })
  const persist = (tasks: ActiveTaskItem[]) => {
    setActiveTasks(tasks)
    if (tasks.length) localStorage.setItem(taskStorageKey(campaignId), JSON.stringify(tasks))
    else localStorage.removeItem(taskStorageKey(campaignId))
  }
  const addTask = (task: Omit<ActiveTaskItem, 'startedAt'>) =>
    persist([...activeTasks, { ...task, startedAt: Date.now() }])
  const removeTask = (taskId: string) =>
    setActiveTasks((prev) => {
      const next = prev.filter((t) => t.id !== taskId)
      if (next.length) localStorage.setItem(taskStorageKey(campaignId), JSON.stringify(next))
      else localStorage.removeItem(taskStorageKey(campaignId))
      return next
    })

  const [query, setQuery] = useState('freelance web developer')
  const [location, setLocation] = useState('New York')
  const [followUpOpen, setFollowUpOpen] = useState(false)
  const [expandedStage, setExpandedStage] = useState<string | null>(null)
  const [selectedDraftIds, setSelectedDraftIds] = useState<number[]>([])
  const [bulkBusy, setBulkBusy] = useState(false)
  const [taskProgress, setTaskProgress] = useState<Record<string, { current: number; total: number; eta_seconds: number | null }>>({})

  const [queryPresets, setQueryPresets] = useState([
    'freelance web developer',
    'solo founder SaaS',
    'small business website',
    'indie hacker',
  ])

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard', campaignId] })
    queryClient.invalidateQueries({ queryKey: ['leads-summary', campaignId] })
    queryClient.invalidateQueries({ queryKey: ['email-drafts', campaignId] })
    queryClient.invalidateQueries({ queryKey: ['leads-list', campaignId] })
    queryClient.invalidateQueries({ queryKey: ['pipeline-progress', campaignId] })
  }

  // Poll every running task every 2s. While any run, also refresh the lead
  // counts so numbers creep up live instead of jumping only at the end.
  useEffect(() => {
    if (activeTasks.length === 0) return
    const interval = setInterval(async () => {
      refreshAll()
      for (const task of activeTasks) {
        try {
          const status = await tasksApi.getTaskStatus(task.id)
          if (status.progress) {
            setTaskProgress((prev) => ({ ...prev, [task.id]: status.progress! }))
          }
          if (status.ready) {
            removeTask(task.id)
            setTaskProgress((prev) => {
              const next = { ...prev }
              delete next[task.id]
              return next
            })
            refreshAll()
            const result = status.result as { status?: string; message?: string; total_saved?: number } | null
            const failed = !status.successful || result?.status === 'error'
            if (failed) {
              toast.error(`${task.label} failed: ${result?.message || status.error || 'Unknown error'}`)
            } else {
              const saved = result?.total_saved
              toast.success(`${task.label} finished.${typeof saved === 'number' ? ` ${saved} lead(s) saved.` : ''}`)
            }
          }
        } catch {
          // Transient network hiccup — leave it tracked, try again next tick.
        }
      }
    }, 2000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTasks])

  const { data: campaigns } = useQuery({ queryKey: ['campaigns'], queryFn: campaignsApi.getCampaigns })
  const campaign = campaigns?.find((c) => c.id === campaignId)

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard', campaignId],
    queryFn: () => campaignsApi.getCampaignDashboard(campaignId),
    enabled: !!campaignId,
  })

  const { data: summary } = useQuery({
    queryKey: ['leads-summary', campaignId],
    queryFn: () => campaignsApi.getCampaignLeadsSummary(campaignId),
    enabled: !!campaignId,
  })

  const { data: progress } = useQuery({
    queryKey: ['pipeline-progress', campaignId],
    queryFn: () => campaignsApi.getPipelineProgress(campaignId),
    enabled: !!campaignId,
  })

  const { data: drafts, isLoading: draftsLoading } = useQuery({
    queryKey: ['email-drafts', campaignId],
    queryFn: () => emailsApi.getEmailDrafts(campaignId),
    enabled: !!campaignId,
  })

  const anyTaskRunning = activeTasks.length > 0

  const { data: followUpResult, isLoading: followUpLoading } = useQuery({
    queryKey: ['leads-list', campaignId, 'needs_follow_up'],
    queryFn: () => leadsApi.getLeads(campaignId, { stage: 'needs_follow_up', pageSize: 100 }),
    enabled: !!campaignId && followUpOpen,
    refetchInterval: anyTaskRunning ? 3000 : false,
  })

  const runDispatch = async (
    step: string,
    label: string,
    fn: () => Promise<{ task_id: string | null; status: string; total_saved: number | null }>
  ) => {
    try {
      const res = await fn()
      if (res.status === 'skipped') {
        toast.info(`${label}: already done today (${res.total_saved ?? 0} leads).`)
        refreshAll()
      } else if (res.task_id) {
        addTask({ id: res.task_id, label, step })
        toast.info(`${label} started — track progress above.`)
      }
    } catch (err) {
      toast.error(`${label} failed: ${(err as Error).message}`)
    }
  }

  const findLeadsEverywhere = () => {
    runDispatch('hackernews', 'Search Hacker News', () => leadsApi.scrapeHackernews(campaignId, query))
    runDispatch('import', 'Import pre-collected leads (GitHub/Dev.to/ProductHunt)', () => leadsApi.importFreeOutbound(campaignId))
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] p-10 text-white flex flex-col items-center justify-center">
        <Link to="/campaigns" className="flex items-center gap-2 text-sm text-violet-400 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to campaigns
        </Link>
        <p className="mt-4 text-sm text-zinc-400">Loading campaign...</p>
      </div>
    )
  }

  const busy = (step: string) => activeTasks.some((t) => t.step === step)
  const minutesAgo = (ts: number) => Math.max(0, Math.round((Date.now() - ts) / 60000))

  const totalLeads = progress?.leads_found || 1

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-[#0a0a0f] text-white"
    >
      <div className="mx-auto max-w-5xl py-4 sm:py-6">
        {/* Breadcrumb: All Campaigns > Campaign Name */}
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-zinc-400">
          <Link to="/campaigns" className="hover:text-violet-300 transition-colors flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5 text-violet-400" /> All Campaigns
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />
          <span className="text-zinc-100 font-bold">{campaign.name}</span>
        </div>

        {/* Campaign Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{campaign.name}</h1>
            <p className="mt-1 text-sm text-zinc-400">
              {campaign.niche} · {campaign.target_location} ·{' '}
              <span className="font-semibold text-violet-300">{dashboard?.total_leads ?? 0} leads total</span>
            </p>
          </div>
          <span className={`self-start sm:self-auto rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
            campaign.status === 'active' 
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.3)]' 
              : 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/20'
          }`}>
            {campaign.status}
          </span>
        </div>

        {/* Progress Stepper at top */}
        <OnboardingTracker progress={progress} draftsCount={drafts?.length ?? 0} sentCount={dashboard?.emails_sent ?? 0} />

        {/* Horizontal Funnel Chart using Recharts */}
        {(progress || dashboard || summary) && (
          <div className="mb-6 rounded-2xl border border-white/[0.08] bg-[#12121a]/80 p-5 backdrop-blur-xl shadow-xl">
            <div className="flex items-center justify-between mb-4 border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-100">Campaign Outreach Funnel</h3>
                <p className="text-xs text-zinc-400">Horizontal conversion drop-off by stage</p>
              </div>
              <span className="text-xs font-semibold text-violet-300 bg-violet-600/20 px-3 py-1 rounded-full border border-violet-500/30">
                Horizontal Funnel
              </span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={[
                    { name: 'Found', value: (dashboard as any)?.total_prospects ?? dashboard?.total_leads ?? (summary as any)?.total_prospects ?? (summary as any)?.found ?? progress?.leads_found ?? 0 },
                    { name: 'Emails', value: (summary as any)?.emails_discovered ?? (dashboard as any)?.emails_discovered ?? (dashboard as any)?.emails_found ?? (summary as any)?.emails_found ?? progress?.emails_found ?? (summary as any)?.email_found ?? 0 },
                    { name: 'Researched', value: (summary as any)?.research_done ?? (dashboard as any)?.research_done ?? dashboard?.research_complete ?? progress?.research_done ?? (summary as any)?.research_complete ?? 0 },
                    { name: 'Qualified', value: (summary as any)?.qualified ?? (dashboard as any)?.qualified ?? dashboard?.qualified_leads ?? progress?.qualified_done ?? 0 },
                    { name: 'Drafted', value: (summary as any)?.drafts ?? (dashboard as any)?.drafts ?? dashboard?.emails_generated ?? progress?.emails_written ?? (summary as any)?.email_generated ?? (summary as any)?.waiting_approval ?? 0 },
                    { name: 'Sent', value: dashboard?.emails_sent ?? (summary as any)?.sent ?? 0 },
                  ]}
                  margin={{ top: 10, right: 40, left: 30, bottom: 10 }}
                >
                  <XAxis type="number" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="#a1a1aa" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} width={80} />
                  <Tooltip contentStyle={{ background: '#12121a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, fontSize: 12, color: '#fff' }} />
                  <Bar dataKey="value" fill="#7c3aed" radius={[0, 8, 8, 0]} barSize={20} minPointSize={4}>
                    <LabelList dataKey="value" position="right" fill="#c084fc" fontSize={11} fontWeight={700} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Live Active Tasks */}
        {activeTasks.map((t) => {
          const p = taskProgress[t.id]
          const pct = p && p.total > 0 ? Math.round((p.current / p.total) * 100) : null
          return (
            <div key={t.id} className="mt-4 rounded-2xl border border-violet-500/30 bg-violet-500/10 px-5 py-4 text-sm text-violet-200 shadow-lg purple-glow-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2.5">
                  <Loader2 className="h-4 w-4 animate-spin text-violet-300" />
                  <span>
                    <span className="font-semibold text-white">{t.label}</span> running ({minutesAgo(t.startedAt)}m)
                    {pct != null ? ` — ${p!.current}/${p!.total} (${pct}%)` : ' — live updates below'}
                    {p?.eta_seconds != null && p.eta_seconds > 0 ? `, ETA ~${Math.ceil(p.eta_seconds / 60)}m` : ''}
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    onClick={async () => {
                      try {
                        await tasksApi.cancelTask(t.id)
                      } catch {
                        // best-effort
                      }
                      removeTask(t.id)
                      toast.info(`${t.label}: cancellation requested.`)
                    }}
                    aria-label={`Stop ${t.label}`}
                    className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/20 transition"
                  >
                    Stop
                  </button>
                  {Date.now() - t.startedAt > STALE_TASK_MS && (
                    <button
                      onClick={() => removeTask(t.id)}
                      aria-label={`Stop tracking ${t.label}`}
                      className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-2.5 py-1 text-[11px] font-semibold text-violet-200 hover:bg-violet-500/20 transition"
                    >
                      Stop tracking
                    </button>
                  )}
                </div>
              </div>
              {pct != null && (
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-violet-400 transition-all duration-300" style={{ width: `${pct}%` }} />
                </div>
              )}
            </div>
          )
        })}

        {/* Step 1: Get Leads Section */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12121a]/80 backdrop-blur-xl shadow-xl">
          {/* Gradient Header */}
          <div className="border-b border-white/[0.08] bg-gradient-to-r from-violet-900/40 via-purple-900/20 to-transparent p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-300 border border-violet-500/30 shadow-md">
                <Search className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-100">
                  <span className="mr-1 text-violet-400">1.</span> Get Leads
                </h2>
                <p className="text-xs text-zinc-400">Bring high-intent prospective leads into this campaign from Hacker News and pre-collected sources.</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Keyword tags as pill badges with remove button */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-zinc-400 mr-1">Keyword presets:</span>
              {queryPresets.map((p) => (
                <span
                  key={p}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-all ${
                    query === p
                      ? 'border-violet-500/60 bg-violet-600/25 text-violet-200 shadow-md purple-glow-sm'
                      : 'border-white/[0.08] bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]'
                  }`}
                >
                  <button onClick={() => setQuery(p)} className="cursor-pointer">
                    {p}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setQueryPresets(queryPresets.filter((item) => item !== p))
                    }}
                    title={`Remove keyword tag ${p}`}
                    className="rounded-full p-0.5 hover:bg-white/20 text-zinc-400 hover:text-white transition"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. freelance web developer" className="input flex-1 min-w-[200px]" title="Search term used by Hacker News and Google Maps below." />
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. New York" className="input w-44" title="Only used by Google Maps (local-business search)." />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <ActionButton
                icon={Zap}
                label="Find Leads (All Sources)"
                busy={busy('hackernews') || busy('scrape') || busy('import')}
                disabled={anyTaskRunning}
                onClick={findLeadsEverywhere}
              />
              <span className="text-xs font-medium text-zinc-500">or run individual source:</span>
              <ActionButton
                icon={Zap}
                label="Hacker News"
                variant="secondary"
                busy={busy('hackernews')}
                disabled={anyTaskRunning}
                title="Free. Searches Hacker News posts where people are literally asking for a developer/freelancer — highest-intent source."
                onClick={() => runDispatch('hackernews', 'Search Hacker News', () => leadsApi.scrapeHackernews(campaignId, query))}
              />
              <ActionButton
                icon={Search}
                label="Google Maps ⚠"
                variant="secondary"
                busy={busy('scrape')}
                disabled={anyTaskRunning}
                title="Known limitation in this environment: this needs Docker access the server container doesn't have, so it currently fails with a 'docker not found' error. Use Hacker News or Import CSV instead until this is fixed."
                onClick={() => runDispatch('scrape', 'Scrape Google Maps leads', () => leadsApi.scrapeLeads(campaignId, query, location))}
              />
              <ActionButton
                icon={Upload}
                label="Import Pre-Collected Leads"
                variant="secondary"
                busy={busy('import')}
                disabled={anyTaskRunning}
                title="A separate tool (free_outbound_agent, in this same project) periodically scrapes GitHub, Dev.to, and ProductHunt for solo devs/founders and saves them to a CSV file. This button imports whatever that file currently has — it does not scrape live when clicked. Usually your best-fit, most reliable source."
                onClick={() => runDispatch('import', 'Import pre-collected leads (GitHub/Dev.to/ProductHunt)', () => leadsApi.importFreeOutbound(campaignId))}
              />
            </div>

            <button
              onClick={() => setFollowUpOpen((v) => !v)}
              className="mt-4 flex items-center gap-2 text-xs font-semibold text-amber-300 hover:text-amber-200 transition"
            >
              <Users className="h-4 w-4" />
              {followUpOpen ? 'Hide' : 'Show'} leads needing manual follow-up (no email found, or disqualified)
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${followUpOpen ? 'rotate-180' : ''}`} />
            </button>
            {followUpOpen && (
              <div className="mt-3">
                <LeadTable leads={followUpResult?.items ?? []} loading={followUpLoading} emptyText="Nothing here yet." />
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Process Leads Section with 4 Pipeline Stage Cards Grid */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12121a]/80 backdrop-blur-xl shadow-xl">
          <div className="border-b border-white/[0.08] bg-gradient-to-r from-purple-900/40 via-violet-900/20 to-transparent p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-300 border border-violet-500/30 shadow-md">
                  <Microscope className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-100">
                    <span className="mr-1 text-violet-400">2.</span> Process Leads
                  </h2>
                  <p className="text-xs text-zinc-400">Run discovery, AI research, qualification, and automated email drafting in order.</p>
                </div>
              </div>
              <button
                disabled={anyTaskRunning}
                onClick={async () => {
                  try {
                    const res = await campaignsApi.resumePipeline(campaignId)
                    toast.info(res.message)
                    refreshAll()
                  } catch (e) {
                    toast.error((e as Error).message)
                  }
                }}
                className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#1a1a26] px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:border-violet-500/30 hover:bg-violet-600/10 transition disabled:opacity-40"
              >
                <Zap className="h-3.5 w-3.5 text-violet-400" /> Resume Pipeline
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* 4 Pipeline stage cards in a grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <PipelineStageCard
                icon={Mail}
                title="Find Emails"
                count={progress?.emails_found ?? 0}
                totalLeads={totalLeads}
                busy={busy('emails')}
                disabled={anyTaskRunning}
                active={expandedStage === 'email_found'}
                onRun={() => runDispatch('emails', 'Find emails', () => leadsApi.findEmails(campaignId))}
                onView={() => setExpandedStage(expandedStage === 'email_found' ? null : 'email_found')}
              />
              <PipelineStageCard
                icon={Microscope}
                title="Research"
                count={progress?.research_done ?? 0}
                totalLeads={totalLeads}
                busy={busy('research')}
                disabled={anyTaskRunning}
                active={expandedStage === 'researched'}
                onRun={() => runDispatch('research', 'Research leads', () => leadsApi.researchLeads(campaignId))}
                onView={() => setExpandedStage(expandedStage === 'researched' ? null : 'researched')}
              />
              <PipelineStageCard
                icon={BadgeCheck}
                title="Qualify"
                count={progress?.qualified_done ?? 0}
                totalLeads={totalLeads}
                busy={busy('qualify')}
                disabled={anyTaskRunning}
                active={expandedStage === 'qualified'}
                onRun={() => runDispatch('qualify', 'Qualify leads', () => leadsApi.qualifyLeads(campaignId))}
                onView={() => setExpandedStage(expandedStage === 'qualified' ? null : 'qualified')}
              />
              <PipelineStageCard
                icon={PenLine}
                title="Write Emails"
                count={progress?.emails_written ?? 0}
                totalLeads={totalLeads}
                busy={busy('write')}
                disabled={anyTaskRunning}
                active={expandedStage === 'drafted'}
                onRun={() => runDispatch('write', 'Write emails', () => leadsApi.writeEmails(campaignId))}
                onView={() => setExpandedStage(expandedStage === 'drafted' ? null : 'drafted')}
              />
            </div>

            {summary && summary.disqualified > 0 && (
              <p className="text-xs text-zinc-400">{summary.disqualified} lead(s) disqualified during qualification.</p>
            )}
            {expandedStage && (
              <div className="mt-4">
                <StageLeadsPanel campaignId={campaignId} stage={expandedStage} pollWhileActive={anyTaskRunning} />
              </div>
            )}
          </div>
        </div>

        {/* Step 3: Review & Send Section */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12121a]/80 backdrop-blur-xl shadow-xl">
          <div className="border-b border-white/[0.08] bg-gradient-to-r from-fuchsia-900/30 via-violet-900/20 to-transparent p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600/20 text-violet-300 border border-violet-500/30 shadow-md">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-100">
                  <span className="mr-1 text-violet-400">3.</span> Review & Send
                </h2>
                <p className="text-xs text-zinc-400">Check AI-written draft emails, run quality checks, approve, and send.</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <ActionButton
                icon={Send}
                label="Send All Approved Emails"
                busy={busy('send')}
                disabled={anyTaskRunning}
                onClick={() => runDispatch('send', 'Send approved emails', () => emailsApi.sendEmails(campaignId))}
              />
              {drafts && drafts.length > 0 && (
                <>
                  <button
                    onClick={() =>
                      setSelectedDraftIds(selectedDraftIds.length === drafts.length ? [] : drafts.map((d) => d.lead_id))
                    }
                    className="rounded-xl border border-white/[0.08] bg-[#1a1a26] px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:border-white/20 transition"
                  >
                    {selectedDraftIds.length === drafts.length ? 'Deselect all' : 'Select all'}
                  </button>
                  {selectedDraftIds.length > 0 && (
                    <>
                      <span className="text-xs font-medium text-zinc-400">{selectedDraftIds.length} selected</span>
                      <button
                        disabled={bulkBusy}
                        onClick={async () => {
                          setBulkBusy(true)
                          try {
                            const res = await emailsApi.bulkApprove(selectedDraftIds)
                            toast.success(`${res.approved} draft(s) approved.`)
                            setSelectedDraftIds([])
                            refreshAll()
                          } catch (e) {
                            toast.error((e as Error).message)
                          } finally {
                            setBulkBusy(false)
                          }
                        }}
                        className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-2.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/25 transition disabled:opacity-50"
                      >
                        Approve selected
                      </button>
                      <button
                        disabled={bulkBusy}
                        onClick={async () => {
                          setBulkBusy(true)
                          try {
                            const res = await emailsApi.bulkReject(selectedDraftIds)
                            toast.success(`${res.rejected} draft(s) rejected.`)
                            setSelectedDraftIds([])
                            refreshAll()
                          } catch (e) {
                            toast.error((e as Error).message)
                          } finally {
                            setBulkBusy(false)
                          }
                        }}
                        className="rounded-xl border border-rose-500/30 bg-rose-500/15 px-4 py-2.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/25 transition disabled:opacity-50"
                      >
                        Reject selected
                      </button>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Email list */}
            <div className="grid gap-3">
              {draftsLoading && <SkeletonCards count={3} />}
              {drafts && drafts.length === 0 && (
                <p className="rounded-xl border border-dashed border-white/[0.08] p-6 text-center text-xs text-zinc-400">
                  No email drafts yet. Run "Write Emails" above first.
                </p>
              )}
              {drafts?.map((d) => (
                <DraftCard
                  key={d.lead_id}
                  draft={d}
                  onChanged={refreshAll}
                  selected={selectedDraftIds.includes(d.lead_id)}
                  onToggleSelect={() =>
                    setSelectedDraftIds((prev) =>
                      prev.includes(d.lead_id) ? prev.filter((id) => id !== d.lead_id) : [...prev, d.lead_id]
                    )
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* Stepper Component with Checkmarks and Active Purple Highlight */
const OnboardingTracker: React.FC<{
  progress?: { leads_found: number; qualified_done: number; emails_written: number }
  draftsCount: number
  sentCount: number
}> = ({ progress, sentCount }) => {
  const steps = [
    { label: 'Create campaign', done: true },
    { label: 'Find leads', done: (progress?.leads_found ?? 0) > 0 },
    { label: 'Generate emails', done: (progress?.emails_written ?? 0) > 0 },
    { label: 'Send emails', done: sentCount > 0 },
  ]

  const activeIndex = steps.findIndex((s) => !s.done)
  const currentStepIndex = activeIndex === -1 ? steps.length - 1 : activeIndex

  return (
    <div className="mb-6 flex items-center gap-2 overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#12121a]/80 px-5 py-4 backdrop-blur-xl shadow-lg">
      {steps.map((s, i) => {
        const isCurrent = i === currentStepIndex
        return (
          <React.Fragment key={s.label}>
            <div className="flex shrink-0 items-center gap-2.5">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  s.done
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                    : isCurrent
                    ? 'bg-violet-600 text-white border border-violet-400 purple-glow-sm shadow-md'
                    : 'bg-white/5 text-zinc-500 border border-white/10'
                }`}
              >
                {s.done ? '✓' : i + 1}
              </span>
              <span className={`text-xs font-bold ${s.done ? 'text-zinc-200' : isCurrent ? 'text-violet-300 font-extrabold' : 'text-zinc-500'}`}>
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && <div className={`mx-2 h-0.5 w-10 shrink-0 ${s.done ? 'bg-emerald-500/40' : 'bg-white/[0.08]'}`} />}
          </React.Fragment>
        )
      })}
    </div>
  )
}

const ActionButton: React.FC<{
  icon: React.ElementType
  label: string
  busy?: boolean
  disabled?: boolean
  variant?: 'primary' | 'secondary'
  title?: string
  onClick: () => void
}> = ({ icon: Icon, label, busy, disabled, variant = 'primary', title, onClick }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
      variant === 'primary'
        ? 'bg-[#7c3aed] text-white hover:bg-[#a855f7] purple-glow-sm shadow-md'
        : 'border border-white/[0.08] bg-[#1a1a26] text-zinc-200 hover:border-violet-500/30 hover:bg-violet-600/10'
    }`}
  >
    {busy ? <Loader2 className="h-4 w-4 animate-spin text-violet-300" /> : <Icon className="h-4 w-4" />}
    {busy ? 'Working...' : label}
  </button>
)

/* Grid Pipeline Stage Card with Progress Bar and Distinct Buttons */
const PipelineStageCard: React.FC<{
  icon: React.ElementType
  title: string
  count: number
  totalLeads: number
  busy?: boolean
  disabled: boolean
  active?: boolean
  onRun: () => void
  onView: () => void
}> = ({ icon: Icon, title, count, totalLeads, busy, disabled, active, onRun, onView }) => {
  const pct = Math.min(100, Math.round((count / totalLeads) * 100))

  return (
    <div
      className={`rounded-2xl border p-4 transition-all ${
        active ? 'border-violet-500/60 bg-violet-600/20 shadow-lg shadow-violet-500/15' : 'border-white/[0.08] bg-[#0a0a0f]/80'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600/20 text-violet-300 border border-violet-500/30">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <span className="text-xs font-bold text-violet-300 font-mono">{pct}%</span>
      </div>
      <button onClick={onView} className="block text-left" title="Click to view leads in this stage">
        <div className="text-2xl font-bold text-zinc-100 hover:text-violet-300 transition-colors">{count}</div>
        <div className="text-xs font-semibold text-zinc-400 mt-0.5">{title}</div>
      </button>

      {/* Completion Progress Bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-violet-500 transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={onRun}
          disabled={disabled}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#7c3aed] py-2 text-xs font-semibold text-white shadow-md hover:bg-[#a855f7] disabled:opacity-40 transition purple-glow-sm"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          {busy ? 'Running' : 'Run Stage'}
        </button>
        <button
          onClick={onView}
          className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
            active ? 'border-violet-500/60 bg-violet-600/30 text-violet-200' : 'border-white/[0.08] bg-[#1a1a26] text-zinc-300 hover:bg-white/[0.08]'
          }`}
        >
          View
        </button>
      </div>
    </div>
  )
}

const LeadTable: React.FC<{ leads: LeadListItem[]; loading: boolean; emptyText: string }> = ({ leads, loading, emptyText }) => {
  if (loading) return <SkeletonRows rows={4} />
  if (leads.length === 0) return <p className="rounded-xl border border-white/[0.08] bg-[#0a0a0f]/60 p-4 text-xs text-zinc-400">{emptyText}</p>

  return (
    <div className="max-h-96 overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#0a0a0f]/60">
      <div className="grid gap-2 p-3 sm:hidden">
        {leads.map((l) => (
          <LeadCard key={l.id} lead={l} />
        ))}
      </div>
      <table className="hidden w-full text-left text-xs sm:table">
        <thead className="sticky top-0 bg-[#12121a] text-zinc-400 font-semibold border-b border-white/[0.08]">
          <tr>
            <th scope="col" className="px-4 py-3">Company / Post</th>
            <th scope="col" className="px-4 py-3">Website / Source link</th>
            <th scope="col" className="px-4 py-3">Source</th>
            <th scope="col" className="px-4 py-3">Stage</th>
            <th scope="col" className="px-4 py-3">Score</th>
            <th scope="col" className="px-4 py-3">Reasoning</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {leads.map((l) => {
            const link = l.website || l.source_url
            const linkHref = link ? (link.startsWith('http') ? link : `https://${link}`) : null
            return (
              <tr key={l.id} className="align-top hover:bg-white/[0.02] transition">
                <td className="max-w-[200px] px-4 py-3 font-semibold text-zinc-100">{l.company_name}</td>
                <td className="max-w-[150px] px-4 py-3 text-zinc-400">
                  {linkHref ? (
                    <a href={linkHref} target="_blank" rel="noreferrer" title={link ?? undefined} className="block truncate text-violet-400 hover:underline">
                      {l.website ? l.website.replace(/^https?:\/\//, '') : 'View original post ↗'}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-400">{l.source || '—'}</td>
                <td className="px-4 py-3 text-zinc-400">{l.status}</td>
                <td className="px-4 py-3">
                  {l.lead_score != null ? (
                    <span
                      title={l.score_reasons?.join('\n')}
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                        l.lead_score >= 70 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : l.lead_score >= 40 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {l.lead_score}/100
                    </span>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="max-w-[280px] px-4 py-3 text-zinc-400">
                  {l.qualification_reason ? (
                    <p className={l.status === 'disqualified' ? 'text-rose-300' : 'text-emerald-300'}>{l.qualification_reason}</p>
                  ) : l.company_summary ? (
                    <p>{l.company_summary}</p>
                  ) : (
                    <span className="text-zinc-600">not researched yet</span>
                  )}
                  {l.website_issues?.length ? (
                    <p className="mt-1 text-rose-300/90 font-medium">Website issues: {l.website_issues.join(', ')}</p>
                  ) : null}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const LeadCard: React.FC<{ lead: LeadListItem }> = ({ lead: l }) => {
  const link = l.website || l.source_url
  const linkHref = link ? (link.startsWith('http') ? link : `https://${link}`) : null
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#12121a]/80 p-3.5 text-xs">
      <div className="flex items-start justify-between gap-2">
        <span className="font-semibold text-zinc-100">{l.company_name}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          {l.lead_score != null && (
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${l.lead_score >= 70 ? 'bg-emerald-500/15 text-emerald-400' : l.lead_score >= 40 ? 'bg-amber-500/15 text-amber-400' : 'bg-rose-500/15 text-rose-400'}`}>
              {l.lead_score}/100
            </span>
          )}
          <span className="rounded-md bg-white/[0.08] px-1.5 py-0.5 text-[10px] text-zinc-400">{l.status}</span>
        </div>
      </div>
      <div className="mt-1 text-zinc-400">{l.source || '—'}</div>
      {linkHref && (
        <a href={linkHref} target="_blank" rel="noreferrer" className="mt-1 block truncate text-violet-400 hover:underline font-medium">
          {l.website ? l.website.replace(/^https?:\/\//, '') : 'View original post ↗'}
        </a>
      )}
      {l.qualification_reason && (
        <p className={`mt-1.5 ${l.status === 'disqualified' ? 'text-rose-300' : 'text-emerald-300'}`}>{l.qualification_reason}</p>
      )}
    </div>
  )
}

const STAGE_SOURCE_OPTIONS = ['', 'hackernews', 'google_maps', 'free_outbound'] as const

const StageLeadsPanel: React.FC<{ campaignId: number; stage: string; pollWhileActive: boolean }> = ({
  campaignId,
  stage,
  pollWhileActive,
}) => {
  const [search, setSearch] = useState('')
  const [source, setSource] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 25

  useEffect(() => {
    setPage(1)
  }, [search, source, stage])

  const { data, isLoading } = useQuery({
    queryKey: ['leads-list', campaignId, stage, search, source, page],
    queryFn: () => leadsApi.getLeads(campaignId, { stage, search: search || undefined, source: source || undefined, page, pageSize }),
    refetchInterval: pollWhileActive ? 3000 : false,
  })

  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company..."
          aria-label="Search leads by company name"
          className="input flex-1 min-w-[180px]"
        />
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          aria-label="Filter by source"
          className="input w-40"
        >
          {STAGE_SOURCE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === '' ? 'All sources' : s}
            </option>
          ))}
        </select>
      </div>
      <LeadTable leads={data?.items ?? []} loading={isLoading} emptyText="No leads match." />
      {total > pageSize && (
        <div className="mt-3 flex items-center justify-between text-xs text-zinc-400 font-medium">
          <span>
            Page {page} of {totalPages} · {total} total
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
              className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#1a1a26] px-2.5 py-1 hover:bg-white/[0.08] disabled:opacity-30 transition"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              aria-label="Next page"
              className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#1a1a26] px-2.5 py-1 hover:bg-white/[0.08] disabled:opacity-30 transition"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* Email Draft Card with Initials Avatar, Status Colors, and Smooth Expand Chevron */
const DraftCard: React.FC<{
  draft: EmailDraft
  onChanged: () => void
  selected: boolean
  onToggleSelect: () => void
}> = ({ draft, onChanged, selected, onToggleSelect }) => {
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState(draft.subject ?? '')
  const [body, setBody] = useState(draft.body ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [quality, setQuality] = useState<DraftQualityCheck | null>(null)
  const [checkingQuality, setCheckingQuality] = useState<false | 'basic' | 'ai'>(false)

  const dirty = subject !== (draft.subject ?? '') || body !== (draft.body ?? '')

  const runQualityCheck = async (aiReview: boolean) => {
    setCheckingQuality(aiReview ? 'ai' : 'basic')
    try {
      setQuality(await emailsApi.checkDraftQuality(draft.lead_id, aiReview))
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setCheckingQuality(false)
    }
  }

  const saveAndApprove = async () => {
    setSaving(true)
    setErr(null)
    try {
      if (dirty) await emailsApi.updateEmailDraft(draft.lead_id, { subject, body })
      await emailsApi.approveEmailDraft(draft.lead_id)
      onChanged()
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  // Colored status badge: pending=amber, sent=green, approved=blue
  const statusStyle =
    draft.status === 'sent'
      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
      : draft.status === 'approved'
      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'

  const leadInitials = draft.company_name
    ? draft.company_name.slice(0, 2).toUpperCase()
    : 'LD'

  return (
    <div className={`rounded-2xl border transition-all duration-200 ${selected ? 'border-violet-500/60 bg-[#161324]' : 'border-white/[0.08] bg-[#0a0a0f]/80 hover:border-white/20'}`}>
      <div className="flex items-center gap-3.5 px-4 py-3.5">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select draft for ${draft.company_name}`}
          className="h-4 w-4 shrink-0 accent-violet-600 rounded cursor-pointer"
        />
        
        {/* Avatar Initials Circle */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 font-bold text-xs text-white shadow-md">
          {leadInitials}
        </div>

        <div onClick={() => setOpen((v) => !v)} className="flex flex-1 cursor-pointer items-center justify-between">
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-zinc-100">{draft.company_name}</div>
            <div className="truncate text-xs text-zinc-400 font-medium">{draft.subject || '(no subject line)'}</div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusStyle}`}>{draft.status}</span>
            <ChevronDown 
              className="h-4 w-4 text-zinc-400 transition-transform duration-200" 
              style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} 
              aria-hidden 
            />
          </div>
        </div>
      </div>
      {open && (
        <div className="grid gap-3 px-4 pb-4 border-t border-white/[0.06] pt-3.5">
          {(draft.company_summary || draft.pain_points?.length || draft.website_issues?.length || draft.icp_fit_score != null) && (
            <div className="mb-1 rounded-xl border border-white/[0.08] bg-[#12121a] p-3.5 text-xs">
              <p className="mb-1.5 font-semibold text-zinc-200">Why this email says what it says (from research):</p>
              {draft.website && (
                <a href={draft.website.startsWith('http') ? draft.website : `https://${draft.website}`} target="_blank" rel="noreferrer" className="text-violet-400 hover:underline font-medium">
                  {draft.website} ↗
                </a>
              )}
              {draft.company_summary && <p className="mt-1 text-zinc-400">{draft.company_summary}</p>}
              {draft.website_issues && draft.website_issues.length > 0 && (
                <p className="mt-1 text-zinc-400">
                  <span className="text-rose-300 font-medium">Website issues found: </span>
                  {draft.website_issues.join(', ')}
                </p>
              )}
              {draft.pain_points && draft.pain_points.length > 0 && (
                <p className="mt-1 text-zinc-400">
                  <span className="text-amber-300 font-medium">Possible pain points: </span>
                  {draft.pain_points.join(', ')}
                </p>
              )}
              {draft.icp_fit_score != null && (
                <p className="mt-1 text-zinc-400 font-medium">ICP fit score: {draft.icp_fit_score}/100</p>
              )}
            </div>
          )}
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="input" placeholder="Subject" />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="input resize-y font-sans leading-relaxed"
            placeholder="Email body"
          />
          {err && <p className="text-xs font-semibold text-rose-400">{err}</p>}

          {quality && (
            <div className="rounded-xl border border-white/[0.08] bg-[#12121a] p-3.5 text-xs">
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-md px-2 py-0.5 font-bold ${quality.quality_score >= 70 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                  Quality {quality.quality_score}%
                </span>
                <span className={`rounded-md px-2 py-0.5 font-bold ${quality.spam_risk === 'low' ? 'bg-emerald-500/15 text-emerald-400' : quality.spam_risk === 'medium' ? 'bg-amber-500/15 text-amber-400' : 'bg-rose-500/15 text-rose-400'}`}>
                  Spam risk: {quality.spam_risk}
                </span>
                <span className="rounded-md bg-white/[0.08] px-2 py-0.5 text-zinc-200 font-medium">Personalization {quality.personalization_score}%</span>
                <span className="rounded-md bg-white/[0.08] px-2 py-0.5 text-zinc-200 font-medium">CTA: {quality.cta_strength}</span>
              </div>
              {quality.issues.length > 0 && (
                <ul className="mt-2 list-disc pl-4 text-zinc-400 space-y-0.5">
                  {quality.issues.map((issue) => <li key={issue}>{issue}</li>)}
                </ul>
              )}
              {quality.ai_review && (
                <div className="mt-3 border-t border-white/[0.08] pt-2.5">
                  <p className="mb-1.5 font-semibold text-violet-300">AI Review</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-md bg-white/[0.08] px-2 py-0.5 text-zinc-200 font-medium">Quality {quality.ai_review.quality_score}%</span>
                    <span className="rounded-md bg-white/[0.08] px-2 py-0.5 text-zinc-200 font-medium">Spam: {quality.ai_review.spam_risk}</span>
                    <span className="rounded-md bg-white/[0.08] px-2 py-0.5 text-zinc-200 font-medium">CTA: {quality.ai_review.cta_strength}</span>
                  </div>
                  {quality.ai_review.issues?.length > 0 && (
                    <ul className="mt-2 list-disc pl-4 text-zinc-400 space-y-0.5">
                      {quality.ai_review.issues.map((issue) => <li key={issue}>{issue}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              disabled={!!checkingQuality}
              onClick={() => runQualityCheck(false)}
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#1a1a26] px-3.5 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-white/[0.08] disabled:opacity-50"
            >
              {checkingQuality === 'basic' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Check Quality
            </button>
            <button
              disabled={!!checkingQuality}
              onClick={() => runQualityCheck(true)}
              title="Runs a deeper Groq-backed review — costs one LLM call, unlike the free check above."
              className="flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-600/15 px-3.5 py-2 text-xs font-semibold text-violet-300 transition hover:bg-violet-600/25 disabled:opacity-50"
            >
              {checkingQuality === 'ai' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              AI Review
            </button>
            <button
              disabled={saving}
              onClick={saveAndApprove}
              className="flex items-center gap-2 rounded-xl bg-[#7c3aed] px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-[#a855f7] disabled:opacity-50 purple-glow-sm ml-auto"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {saving ? 'Saving...' : dirty ? 'Save & Approve' : 'Approve'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
