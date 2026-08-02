import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
} from 'lucide-react'
import { campaignsApi } from '../services/api/campaigns'
import { leadsApi } from '../services/api/leads'
import { emailsApi } from '../services/api/emails'
import { tasksApi } from '../services/api/tasks'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
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

  const QUERY_PRESETS = ['freelance web developer', 'solo founder SaaS', 'small business website', 'indie hacker']

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

  // Fires all three lead sources at once instead of making the user pick one.
  // Google Maps is excluded here — it's currently broken in this environment
  // (see the button's own tooltip) and would just produce a useless error.
  const findLeadsEverywhere = () => {
    runDispatch('hackernews', 'Search Hacker News', () => leadsApi.scrapeHackernews(campaignId, query))
    runDispatch('import', 'Import pre-collected leads (GitHub/Dev.to/ProductHunt)', () => leadsApi.importFreeOutbound(campaignId))
  }

  if (!campaign) {
    return (
      <div className="min-h-screen bg-[#050505] p-10 text-white">
        <Link to="/campaigns" className="text-sm text-violet-400">&larr; Back to campaigns</Link>
        <p className="mt-4 text-sm text-zinc-500">Loading campaign...</p>
      </div>
    )
  }

  const busy = (step: string) => activeTasks.some((t) => t.step === step)
  const minutesAgo = (ts: number) => Math.max(0, Math.round((Date.now() - ts) / 60000))

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <Link to="/campaigns" className="flex w-fit items-center gap-1.5 text-sm text-zinc-500 hover:text-violet-400">
          <ArrowLeft className="h-3.5 w-3.5" /> All campaigns
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{campaign.name}</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {campaign.niche} · {campaign.target_location} ·{' '}
          <span className="text-zinc-300">{dashboard?.total_leads ?? 0} leads total</span>
        </p>

        <OnboardingTracker progress={progress} draftsCount={drafts?.length ?? 0} sentCount={dashboard?.emails_sent ?? 0} />

        {progress && progress.leads_found > 0 && (
          <div className="mb-6 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <p className="mb-2 text-xs font-medium text-zinc-400">Funnel</p>
            <div className="h-32">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Found', value: progress.leads_found },
                    { name: 'Emails', value: progress.emails_found },
                    { name: 'Researched', value: progress.research_done },
                    { name: 'Qualified', value: progress.qualified_done },
                    { name: 'Drafted', value: progress.emails_written },
                    { name: 'Sent', value: dashboard?.emails_sent ?? 0 },
                  ]}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                >
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#141417', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTasks.map((t) => {
          const p = taskProgress[t.id]
          const pct = p && p.total > 0 ? Math.round((p.current / p.total) * 100) : null
          return (
          <div key={t.id} className="mt-4 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-sm text-violet-200">
            <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                <span className="font-medium">{t.label}</span> running ({minutesAgo(t.startedAt)}m)
                {pct != null ? ` — ${p!.current}/${p!.total} (${pct}%)` : ' — numbers below update live'}
                {p?.eta_seconds != null && p.eta_seconds > 0 ? `, ETA ~${Math.ceil(p.eta_seconds / 60)}m` : ''}
              </span>
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={async () => {
                  try {
                    await tasksApi.cancelTask(t.id)
                  } catch {
                    // best-effort — still stop tracking it locally either way
                  }
                  removeTask(t.id)
                  toast.info(`${t.label}: cancellation requested. Work already in progress for a lead may still finish.`)
                }}
                aria-label={`Stop ${t.label}`}
                className="rounded-md border border-rose-400/30 px-2 py-1 text-[11px] text-rose-300 hover:bg-rose-500/10"
              >
                Stop
              </button>
              {Date.now() - t.startedAt > STALE_TASK_MS && (
                <button
                  onClick={() => removeTask(t.id)}
                  aria-label={`Stop tracking ${t.label}`}
                  className="rounded-md border border-violet-400/30 px-2 py-1 text-[11px] text-violet-200 hover:bg-violet-500/20"
                >
                  Stop tracking
                </button>
              )}
            </div>
            </div>
            {pct != null && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-violet-400 transition-all" style={{ width: `${pct}%` }} />
              </div>
            )}
          </div>
          )
        })}

        {/* Step 1 */}
        <Section step={1} title="Get Leads" subtitle="Bring leads into this campaign. High-intent sources (Hacker News) find people who are literally asking for help." icon={Search}>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {QUERY_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setQuery(p)}
                className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                  query === p ? 'border-violet-500/50 bg-violet-500/15 text-violet-200' : 'border-white/10 text-zinc-400 hover:bg-white/5'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. freelance web developer" className="input" title="Search term used by Hacker News and Google Maps below." />
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. New York" className="input" title="Only used by Google Maps (local-business search)." />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ActionButton
              icon={Zap}
              label="Find Leads (All Sources)"
              busy={busy('hackernews') || busy('scrape') || busy('import')}
              disabled={anyTaskRunning}
              onClick={findLeadsEverywhere}
            />
            <span className="text-[11px] text-zinc-600">or run one at a time:</span>
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
          <p className="mt-2 text-[11px] text-zinc-600">
            The presets above (freelance web developer, solo founder SaaS, etc.) set the search term to match people
            who actually need a freelancer. Once leads come in, email discovery, research, qualification, and email
            writing run automatically — no need to click through each stage. Big/enterprise-looking leads are
            auto-rejected during qualification (see the "Disqualified" filter below for who and why).
          </p>

          <button
            onClick={() => setFollowUpOpen((v) => !v)}
            className="mt-4 flex items-center gap-1.5 text-xs font-medium text-amber-300 hover:text-amber-200"
          >
            <Users className="h-3.5 w-3.5" />
            {followUpOpen ? 'Hide' : 'Show'} leads needing manual follow-up (no email found, or disqualified)
            <ChevronDown className={`h-3.5 w-3.5 transition ${followUpOpen ? 'rotate-180' : ''}`} />
          </button>
          <p className="mt-1 text-[11px] text-zinc-600">
            These didn't get an automated email — visit their post/profile yourself, you may still be able to apply
            or reach out directly.
          </p>
          {followUpOpen && (
            <LeadTable leads={followUpResult?.items ?? []} loading={followUpLoading} emptyText="Nothing here yet." />
          )}
        </Section>

        {/* Step 2 */}
        <Section step={2} title="Process Leads" subtitle="Run these in order. Click a card's count to see exactly who's in it." icon={Microscope}>
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
            className="mb-3 flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-zinc-300 hover:bg-white/10 disabled:opacity-40"
            title="If the pipeline stalled partway through (e.g. after a restart), this re-dispatches whichever stage still has pending leads instead of starting over."
          >
            <Zap className="h-3 w-3" /> Resume Pipeline (if stalled)
          </button>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <PipelineStep icon={Mail} label="Find Emails" count={progress?.emails_found} busy={busy('emails')} disabled={anyTaskRunning} active={expandedStage === 'email_found'}
              onRun={() => runDispatch('emails', 'Find emails', () => leadsApi.findEmails(campaignId))}
              onView={() => setExpandedStage(expandedStage === 'email_found' ? null : 'email_found')} />
            <PipelineStep icon={Microscope} label="Research" count={progress?.research_done} busy={busy('research')} disabled={anyTaskRunning} active={expandedStage === 'researched'}
              onRun={() => runDispatch('research', 'Research leads', () => leadsApi.researchLeads(campaignId))}
              onView={() => setExpandedStage(expandedStage === 'researched' ? null : 'researched')} />
            <PipelineStep icon={BadgeCheck} label="Qualify" count={progress?.qualified_done} busy={busy('qualify')} disabled={anyTaskRunning} active={expandedStage === 'qualified'}
              onRun={() => runDispatch('qualify', 'Qualify leads', () => leadsApi.qualifyLeads(campaignId))}
              onView={() => setExpandedStage(expandedStage === 'qualified' ? null : 'qualified')} />
            <PipelineStep icon={PenLine} label="Write Emails" count={progress?.emails_written} busy={busy('write')} disabled={anyTaskRunning} active={expandedStage === 'drafted'}
              onRun={() => runDispatch('write', 'Write emails', () => leadsApi.writeEmails(campaignId))}
              onView={() => setExpandedStage(expandedStage === 'drafted' ? null : 'drafted')} />
          </div>
          {summary && summary.disqualified > 0 && (
            <p className="mt-2 text-[11px] text-zinc-600">{summary.disqualified} lead(s) disqualified so far — see "needs manual follow-up" above for who and why.</p>
          )}
          {expandedStage && (
            <div className="mt-3">
              <StageLeadsPanel campaignId={campaignId} stage={expandedStage} pollWhileActive={anyTaskRunning} />
            </div>
          )}
        </Section>

        {/* Step 3 */}
        <Section step={3} title="Review & Send" subtitle="Check each AI-written email, edit if needed, approve it, then send." icon={Send}>
          <div className="flex flex-wrap items-center gap-2">
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
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/10"
                >
                  {selectedDraftIds.length === drafts.length ? 'Deselect all' : 'Select all'}
                </button>
                {selectedDraftIds.length > 0 && (
                  <>
                    <span className="text-xs text-zinc-500">{selectedDraftIds.length} selected</span>
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
                      className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
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
                      className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      Reject selected
                    </button>
                  </>
                )}
              </>
            )}
          </div>
          <div className="mt-4 grid gap-2">
            {draftsLoading && <SkeletonCards count={3} />}
            {drafts && drafts.length === 0 && (
              <p className="text-sm text-zinc-500">No email drafts yet. Run "Write Emails" above first.</p>
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
        </Section>
      </div>
    </div>
  )
}

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
  return (
    <div className="mb-6 flex items-center gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
      {steps.map((s, i) => (
        <React.Fragment key={s.label}>
          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
                s.done ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-zinc-500'
              }`}
            >
              {s.done ? '✓' : i + 1}
            </span>
            <span className={`text-xs ${s.done ? 'text-zinc-300' : 'text-zinc-500'}`}>{s.label}</span>
          </div>
          {i < steps.length - 1 && <div className="mx-2 h-px w-6 shrink-0 bg-white/10" />}
        </React.Fragment>
      ))}
    </div>
  )
}

const Section: React.FC<{ step: number; title: string; subtitle: string; icon: React.ElementType; children: React.ReactNode }> = ({
  step,
  title,
  subtitle,
  icon: Icon,
  children,
}) => (
  <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-zinc-100">
          <span className="mr-1.5 text-zinc-600">{step}.</span> {title}
        </h2>
        <p className="text-xs text-zinc-500">{subtitle}</p>
      </div>
    </div>
    {children}
  </div>
)

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
    className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
      variant === 'primary'
        ? 'bg-violet-600 text-white hover:bg-violet-500'
        : 'border border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10'
    }`}
  >
    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
    {busy ? 'Working...' : label}
  </button>
)

const PipelineStep: React.FC<{
  icon: React.ElementType
  label: string
  count?: number
  busy?: boolean
  disabled: boolean
  active?: boolean
  onRun: () => void
  onView: () => void
}> = ({ icon: Icon, label, count, busy, disabled, active, onRun, onView }) => (
  <div className={`rounded-xl border p-3 text-center ${active ? 'border-violet-500/50 bg-violet-500/10' : 'border-white/10 bg-black/20'}`}>
    <Icon className="mx-auto mb-1 h-4 w-4 text-violet-400" />
    <button onClick={onView} className="mx-auto block" title="Click to see who's in this stage">
      <div className="text-xl font-semibold text-zinc-100 hover:text-violet-300">{count ?? 0}</div>
    </button>
    <div className="mb-2 text-[11px] text-zinc-500">{label} done</div>
    <div className="flex gap-1">
      <button
        onClick={onRun}
        disabled={disabled}
        className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/5 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:bg-white/10 disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        {busy ? 'Running' : 'Run'}
      </button>
      <button
        onClick={onView}
        className={`rounded-md border px-2 py-1.5 text-[11px] font-medium transition ${active ? 'border-violet-500/50 bg-violet-500/20 text-violet-200' : 'border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'}`}
      >
        View
      </button>
    </div>
  </div>
)

const LeadTable: React.FC<{ leads: LeadListItem[]; loading: boolean; emptyText: string }> = ({ leads, loading, emptyText }) => {
  if (loading) return <SkeletonRows rows={4} />
  if (leads.length === 0) return <p className="rounded-lg border border-white/10 p-3 text-xs text-zinc-500">{emptyText}</p>

  return (
    <div className="max-h-96 overflow-y-auto rounded-lg border border-white/10">
      {/* Mobile: card list (tables don't work well on small screens) */}
      <div className="grid gap-2 p-2 sm:hidden">
        {leads.map((l) => (
          <LeadCard key={l.id} lead={l} />
        ))}
      </div>
      {/* Desktop: full table */}
      <table className="hidden w-full text-left text-xs sm:table">
        <thead className="sticky top-0 bg-[#0c0c0e] text-zinc-500">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">Company / Post</th>
            <th scope="col" className="px-3 py-2 font-medium">Website / Source link</th>
            <th scope="col" className="px-3 py-2 font-medium">Source</th>
            <th scope="col" className="px-3 py-2 font-medium">Stage</th>
            <th scope="col" className="px-3 py-2 font-medium">Score</th>
            <th scope="col" className="px-3 py-2 font-medium">Reasoning</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => {
            const link = l.website || l.source_url
            const linkHref = link ? (link.startsWith('http') ? link : `https://${link}`) : null
            return (
              <tr key={l.id} className="border-t border-white/5 align-top">
                <td className="max-w-[200px] px-3 py-2 text-zinc-200">{l.company_name}</td>
                <td className="max-w-[150px] px-3 py-2 text-zinc-400">
                  {linkHref ? (
                    <a href={linkHref} target="_blank" rel="noreferrer" title={link ?? undefined} className="block truncate text-violet-400 hover:underline">
                      {l.website ? l.website.replace(/^https?:\/\//, '') : 'View original post ↗'}
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-3 py-2 text-zinc-400">{l.source || '—'}</td>
                <td className="px-3 py-2 text-zinc-400">{l.status}</td>
                <td className="px-3 py-2">
                  {l.lead_score != null ? (
                    <span
                      title={l.score_reasons?.join('\n')}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        l.lead_score >= 70 ? 'bg-emerald-500/15 text-emerald-400' : l.lead_score >= 40 ? 'bg-amber-500/15 text-amber-400' : 'bg-rose-500/15 text-rose-400'
                      }`}
                    >
                      {l.lead_score}/100
                    </span>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="max-w-[280px] px-3 py-2 text-zinc-400">
                  {l.qualification_reason ? (
                    <p className={l.status === 'disqualified' ? 'text-rose-300' : 'text-emerald-300'}>{l.qualification_reason}</p>
                  ) : l.company_summary ? (
                    <p>{l.company_summary}</p>
                  ) : (
                    <span className="text-zinc-600">not researched yet</span>
                  )}
                  {l.website_issues?.length ? (
                    <p className="mt-1 text-rose-300/80">Website issues: {l.website_issues.join(', ')}</p>
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
    <div className="rounded-lg border border-white/10 bg-black/20 p-3 text-xs">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-zinc-200">{l.company_name}</span>
        <div className="flex shrink-0 items-center gap-1">
          {l.lead_score != null && (
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${l.lead_score >= 70 ? 'bg-emerald-500/15 text-emerald-400' : l.lead_score >= 40 ? 'bg-amber-500/15 text-amber-400' : 'bg-rose-500/15 text-rose-400'}`}>
              {l.lead_score}/100
            </span>
          )}
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-400">{l.status}</span>
        </div>
      </div>
      <div className="mt-1 text-zinc-500">{l.source || '—'}</div>
      {linkHref && (
        <a href={linkHref} target="_blank" rel="noreferrer" className="mt-1 block truncate text-violet-400 hover:underline">
          {l.website ? l.website.replace(/^https?:\/\//, '') : 'View original post ↗'}
        </a>
      )}
      {l.qualification_reason && (
        <p className={`mt-1 ${l.status === 'disqualified' ? 'text-rose-300' : 'text-emerald-300'}`}>{l.qualification_reason}</p>
      )}
    </div>
  )
}

const STAGE_SOURCE_OPTIONS = ['', 'hackernews', 'google_maps', 'free_outbound'] as const

/** Search + source filter + pagination, backed by the real backend query params. */
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
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company..."
          aria-label="Search leads by company name"
          className="input flex-1 min-w-[160px]"
        />
        <select
          value={source}
          onChange={(e) => setSource(e.target.value)}
          aria-label="Filter by source"
          className="input"
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
        <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
          <span>
            Page {page} of {totalPages} · {total} total
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
              className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 hover:bg-white/5 disabled:opacity-30"
            >
              <ChevronLeft className="h-3 w-3" /> Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              aria-label="Next page"
              className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 hover:bg-white/5 disabled:opacity-30"
            >
              Next <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

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

  const statusStyle =
    draft.status === 'approved'
      ? 'bg-emerald-500/10 text-emerald-400'
      : draft.status === 'sent'
      ? 'bg-violet-500/10 text-violet-300'
      : 'bg-amber-500/10 text-amber-400'

  return (
    <div className={`rounded-xl border bg-black/20 ${selected ? 'border-violet-500/50' : 'border-white/10'}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select draft for ${draft.company_name}`}
          className="h-4 w-4 shrink-0 accent-violet-600"
        />
        <div onClick={() => setOpen((v) => !v)} className="flex flex-1 cursor-pointer items-center justify-between">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-zinc-100">{draft.company_name}</div>
            <div className="truncate text-xs text-zinc-500">{draft.subject || '(no subject)'}</div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusStyle}`}>{draft.status}</span>
            <ChevronDown className={`h-4 w-4 text-zinc-600 transition ${open ? 'rotate-180' : ''}`} aria-hidden />
          </div>
        </div>
      </div>
      {open && (
        <div className="grid gap-2 px-4 pb-4">
          {(draft.company_summary || draft.pain_points?.length || draft.website_issues?.length || draft.icp_fit_score != null) && (
            <div className="mb-1 rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs">
              <p className="mb-1.5 font-medium text-zinc-300">Why this email says what it says (from research):</p>
              {draft.website && (
                <a href={draft.website.startsWith('http') ? draft.website : `https://${draft.website}`} target="_blank" rel="noreferrer" className="text-violet-400 hover:underline">
                  {draft.website} ↗
                </a>
              )}
              {draft.company_summary && <p className="mt-1 text-zinc-400">{draft.company_summary}</p>}
              {draft.website_issues && draft.website_issues.length > 0 && (
                <p className="mt-1 text-zinc-400">
                  <span className="text-rose-300">Website issues found: </span>
                  {draft.website_issues.join(', ')}
                </p>
              )}
              {draft.pain_points && draft.pain_points.length > 0 && (
                <p className="mt-1 text-zinc-400">
                  <span className="text-amber-300">Possible pain points: </span>
                  {draft.pain_points.join(', ')}
                </p>
              )}
              {draft.icp_fit_score != null && (
                <p className="mt-1 text-zinc-500">ICP fit score: {draft.icp_fit_score}/100</p>
              )}
            </div>
          )}
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="input" placeholder="Subject" />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="input resize-y font-sans"
            placeholder="Email body"
          />
          {err && <p className="text-xs text-rose-400">{err}</p>}

          {quality && (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs">
              <div className="flex flex-wrap gap-2">
                <span className={`rounded px-1.5 py-0.5 font-semibold ${quality.quality_score >= 70 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                  Quality {quality.quality_score}%
                </span>
                <span className={`rounded px-1.5 py-0.5 font-semibold ${quality.spam_risk === 'low' ? 'bg-emerald-500/15 text-emerald-400' : quality.spam_risk === 'medium' ? 'bg-amber-500/15 text-amber-400' : 'bg-rose-500/15 text-rose-400'}`}>
                  Spam risk: {quality.spam_risk}
                </span>
                <span className="rounded bg-white/5 px-1.5 py-0.5 text-zinc-300">Personalization {quality.personalization_score}%</span>
                <span className="rounded bg-white/5 px-1.5 py-0.5 text-zinc-300">CTA: {quality.cta_strength}</span>
              </div>
              {quality.issues.length > 0 && (
                <ul className="mt-2 list-disc pl-4 text-zinc-400">
                  {quality.issues.map((issue) => <li key={issue}>{issue}</li>)}
                </ul>
              )}
              {quality.ai_review && (
                <div className="mt-2 border-t border-white/10 pt-2">
                  <p className="mb-1 font-medium text-violet-300">AI Review</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-zinc-300">Quality {quality.ai_review.quality_score}%</span>
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-zinc-300">Spam: {quality.ai_review.spam_risk}</span>
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-zinc-300">CTA: {quality.ai_review.cta_strength}</span>
                  </div>
                  {quality.ai_review.issues?.length > 0 && (
                    <ul className="mt-2 list-disc pl-4 text-zinc-400">
                      {quality.ai_review.issues.map((issue) => <li key={issue}>{issue}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              disabled={!!checkingQuality}
              onClick={() => runQualityCheck(false)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:bg-white/10 disabled:opacity-50"
            >
              {checkingQuality === 'basic' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Check Quality
            </button>
            <button
              disabled={!!checkingQuality}
              onClick={() => runQualityCheck(true)}
              title="Runs a deeper Groq-backed review — costs one LLM call, unlike the free check above."
              className="flex items-center gap-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-300 transition hover:bg-violet-500/20 disabled:opacity-50"
            >
              {checkingQuality === 'ai' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              AI Review
            </button>
            <button
              disabled={saving}
              onClick={saveAndApprove}
              className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
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
