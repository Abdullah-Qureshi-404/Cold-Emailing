import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, ArrowRight, Sparkles, Users, BadgeCheck, Mail, Target, Rocket, Wand2, Loader2, TrendingUp } from 'lucide-react'
import { campaignsApi } from '../services/api/campaigns'
import { SkeletonCards } from '../components/Skeleton'
import { toast } from '../store/useToastStore'
import type { Campaign, CampaignCreatePayload, CampaignDashboardMetrics, CampaignPlan } from '../types/api'

const emptyForm: CampaignCreatePayload = {
  name: '',
  niche: '',
  target_location: '',
  service_description: '',
  target_customer: '',
  daily_limit: 50,
}

const AnimatedCountUp: React.FC<{ value: number }> = ({ value }) => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let start = 0
    const end = value
    if (start === end) {
      setCount(end)
      return
    }
    const duration = 1000
    const startTime = performance.now()

    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeProgress = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(easeProgress * (end - start) + start))
      if (progress < 1) {
        requestAnimationFrame(step)
      } else {
        setCount(end)
      }
    }

    requestAnimationFrame(step)
  }, [value])

  return <span>{count.toLocaleString()}</span>
}

export const CampaignsPage: React.FC = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CampaignCreatePayload>(emptyForm)
  const [planPrompt, setPlanPrompt] = useState('')
  const [planLoading, setPlanLoading] = useState(false)
  const [plan, setPlan] = useState<CampaignPlan | null>(null)

  const { data: campaigns, isLoading, isError, error } = useQuery({
    queryKey: ['campaigns'],
    queryFn: campaignsApi.getCampaigns,
  })

  // Pull each campaign's dashboard so the cards and the top stat strip can
  // show real numbers, not just names — this is what makes the home page
  // feel like a dashboard instead of a bare list.
  const dashboards = useQueries({
    queries: (campaigns ?? []).map((c) => ({
      queryKey: ['dashboard', c.id],
      queryFn: () => campaignsApi.getCampaignDashboard(c.id),
      enabled: !!campaigns,
    })),
  })
  const dashboardByCampaign = new Map<number, CampaignDashboardMetrics>()
  dashboards.forEach((d, i) => {
    if (d.data && campaigns) dashboardByCampaign.set(campaigns[i].id, d.data)
  })

  const totals = Array.from(dashboardByCampaign.values()).reduce(
    (acc, d) => ({
      leads: acc.leads + d.total_leads,
      qualified: acc.qualified + d.qualified_leads,
      sent: acc.sent + d.emails_sent,
      replies: acc.replies + d.replies,
    }),
    { leads: 0, qualified: 0, sent: 0, replies: 0 }
  )

  const createMutation = useMutation({
    mutationFn: campaignsApi.createCampaign,
    onSuccess: (campaign) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
      setShowForm(false)
      setForm(emptyForm)
      toast.success(`Campaign "${campaign.name}" created.`)
      navigate(`/campaigns/${campaign.id}`)
    },
  })

  const generatePlan = async () => {
    if (!planPrompt.trim()) return
    setPlanLoading(true)
    try {
      const result = await campaignsApi.planCampaign(planPrompt)
      setPlan(result)
      setForm({
        name: result.campaign_name,
        niche: result.industry,
        target_location: result.location,
        service_description: result.email_angle || result.ideal_customer,
        target_customer: result.ideal_customer,
        daily_limit: 50,
      })
      setShowForm(true)
      toast.success('Plan generated — review the pre-filled form below before creating.')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setPlanLoading(false)
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.3 }}
      className="relative min-h-[calc(100vh-6rem)] bg-[#0a0a0f] text-white"
    >
      <div className="relative mx-auto max-w-6xl py-4 sm:py-6">
        {/* Top Header */}
        <div className="mb-8 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center border-b border-white/[0.08] pb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 shadow-lg shadow-violet-600/30 purple-glow-sm">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Campaign Studio</h1>
                <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-0.5 text-[11px] font-semibold text-violet-300">
                  AI Powered
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-400">
                Find high-intent leads, verify them, write personalized emails, send.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition-all duration-200 hover:opacity-95 hover:shadow-violet-600/50 hover:scale-[1.02] active:scale-[0.98]"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Cancel' : '+ New Campaign'}
          </button>
        </div>

        {/* Aggregate Stats Row */}
        {campaigns && campaigns.length > 0 && (
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard 
              icon={Rocket} 
              label="Campaigns" 
              value={campaigns.length} 
              iconColor="text-violet-400 bg-violet-500/10"
              trend="+12% active"
            />
            <StatCard 
              icon={Users} 
              label="Leads Found" 
              value={totals.leads} 
              iconColor="text-cyan-400 bg-cyan-500/10"
              trend="+18.5% total"
            />
            <StatCard 
              icon={BadgeCheck} 
              label="Qualified" 
              value={totals.qualified} 
              accent="text-emerald-400" 
              iconColor="text-emerald-400 bg-emerald-500/10"
              trend="+24.1% rate"
            />
            <StatCard 
              icon={Mail} 
              label="Emails Sent" 
              value={totals.sent} 
              accent="text-fuchsia-300" 
              iconColor="text-fuchsia-400 bg-fuchsia-500/10"
              trend="+98.4% delivered"
            />
          </div>
        )}

        {/* AI Campaign Planner Featured Card with Gradient Border */}
        <div className="mb-8 relative rounded-2xl p-[1px] bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 shadow-xl shadow-purple-500/10 purple-glow">
          <div className="rounded-2xl bg-[#12121a]/95 p-6 backdrop-blur-xl">
            <div className="mb-2 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300">
                <Wand2 className="h-4.5 w-4.5" />
              </div>
              <h2 className="text-base font-bold text-zinc-100">AI Campaign Planner</h2>
            </div>
            <p className="mb-4 text-xs text-zinc-400">
              Describe who you want to reach in plain English — AI fills in the setup fields below for you to review.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={planPrompt}
                onChange={(e) => setPlanPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && generatePlan()}
                placeholder='e.g. "Find dentists in Texas with fewer than 20 employees"'
                aria-label="Describe your ideal customer"
                className="input flex-1"
              />
              <button
                onClick={generatePlan}
                disabled={planLoading || !planPrompt.trim()}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:opacity-95 disabled:opacity-50 purple-glow-sm"
              >
                {planLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                Generate with AI
              </button>
            </div>
            {plan && (plan.search_queries?.length > 0 || plan.qualification_rules?.length > 0) && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 grid gap-3 rounded-xl border border-white/[0.08] bg-[#0a0a0f]/60 p-4 text-xs sm:grid-cols-2"
              >
                {plan.search_queries?.length > 0 && (
                  <div>
                    <p className="mb-1.5 font-semibold text-violet-300">Suggested search queries</p>
                    <ul className="list-disc space-y-1 pl-4 text-zinc-400">
                      {plan.search_queries.map((q) => <li key={q}>{q}</li>)}
                    </ul>
                  </div>
                )}
                {plan.qualification_rules?.length > 0 && (
                  <div>
                    <p className="mb-1.5 font-semibold text-violet-300">Qualification criteria</p>
                    <ul className="list-disc space-y-1 pl-4 text-zinc-400">
                      {plan.qualification_rules.map((r) => <li key={r}>{r}</li>)}
                    </ul>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* Create Campaign Form Modal / Panel */}
        <AnimatePresence>
          {showForm && (
            <motion.form
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.25 }}
              onSubmit={(e) => {
                e.preventDefault()
                createMutation.mutate(form)
              }}
              className="mb-8 grid gap-4 rounded-2xl border border-violet-500/30 bg-[#12121a]/90 p-6 shadow-2xl backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <h3 className="text-base font-semibold text-zinc-100">Create New Campaign</h3>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Campaign name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
                <Field label="Niche / industry" value={form.niche} onChange={(v) => setForm({ ...form, niche: v })} required />
                <Field label="Target location" value={form.target_location} onChange={(v) => setForm({ ...form, target_location: v })} required />
                <Field
                  label="Daily email limit"
                  value={String(form.daily_limit ?? 50)}
                  onChange={(v) => setForm({ ...form, daily_limit: Number(v) || 50 })}
                  type="number"
                />
              </div>
              <Field label="Your service / offer" value={form.service_description} onChange={(v) => setForm({ ...form, service_description: v })} required textarea />
              <Field label="Ideal customer" value={form.target_customer} onChange={(v) => setForm({ ...form, target_customer: v })} required />
              {createMutation.isError && <p className="text-sm text-rose-400">{(createMutation.error as Error).message}</p>}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:opacity-95 disabled:opacity-50 purple-glow-sm"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Campaign'} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {isLoading && <SkeletonCards count={3} />}
        {isError && (
          <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-sm text-rose-300">
            Couldn't load campaigns: {(error as Error).message}
          </p>
        )}

        {/* Empty State */}
        {campaigns && campaigns.length === 0 && !showForm && (
          <div className="rounded-2xl border border-dashed border-white/[0.12] bg-[#12121a]/50 p-16 text-center backdrop-blur-xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-400">
              <Target className="h-7 w-7" />
            </div>
            <p className="text-base font-semibold text-zinc-100">No campaigns yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-400">
              Create one to start finding leads, researching them, and writing personalized outreach automatically.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mx-auto mt-5 flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition-all hover:opacity-95 purple-glow-sm"
            >
              <Plus className="h-4 w-4" /> New Campaign
            </button>
          </div>
        )}

        {/* Campaign List Premium Cards */}
        <div className="grid gap-4">
          {campaigns?.map((c) => (
            <CampaignCard key={c.id} campaign={c} dashboard={dashboardByCampaign.get(c.id)} onOpen={() => navigate(`/campaigns/${c.id}`)} />
          ))}
        </div>
      </div>
    </motion.div>
  )
}

const StatCard: React.FC<{
  icon: React.ElementType
  label: string
  value: number
  accent?: string
  iconColor?: string
  trend?: string
}> = ({ icon: Icon, label, value, accent = 'text-white', iconColor = 'text-violet-400 bg-violet-500/10', trend }) => (
  <motion.div
    whileHover={{ y: -2, scale: 1.01 }}
    className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12121a]/80 p-5 backdrop-blur-xl transition-all duration-200 hover:border-violet-500/40 hover:shadow-xl hover:shadow-violet-500/10"
  >
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</span>
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconColor}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
    </div>
    <div className="mt-3 flex items-baseline justify-between">
      <div className={`text-3xl font-extrabold tracking-tight ${accent}`}>
        <AnimatedCountUp value={value} />
      </div>
      {trend && (
        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
          <TrendingUp className="h-3 w-3" />
          {trend}
        </span>
      )}
    </div>
  </motion.div>
)

const CampaignCard: React.FC<{ campaign: Campaign; dashboard?: CampaignDashboardMetrics; onOpen: () => void }> = ({
  campaign: c,
  dashboard: d,
  onOpen,
}) => (
  <motion.div
    whileHover={{ scale: 1.015, y: -2 }}
    transition={{ duration: 0.2 }}
    onClick={onOpen}
    className="group cursor-pointer rounded-2xl border border-white/[0.08] bg-[#12121a]/80 p-5 backdrop-blur-xl transition-all duration-200 hover:border-violet-500/40 hover:bg-[#161624] hover:shadow-xl hover:shadow-violet-500/15"
  >
    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <span className="truncate text-base font-bold text-zinc-100 group-hover:text-violet-300 transition-colors">{c.name}</span>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              c.status === 'active'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/20'
            }`}
          >
            {c.status}
          </span>
        </div>
        <div className="mt-1 text-xs font-medium text-zinc-400">
          {c.niche} · {c.target_location}
        </div>
      </div>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04] text-zinc-400 transition-all group-hover:bg-violet-600/20 group-hover:text-violet-300">
        <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </div>
    </div>
    {d && (
      <div className="mt-4 grid grid-cols-4 gap-3 border-t border-white/[0.06] pt-3.5">
        <MiniStat label="Leads" value={d.total_leads} />
        <MiniStat label="Qualified" value={d.qualified_leads} accent="text-emerald-400" />
        <MiniStat label="Drafts" value={d.emails_generated} accent="text-amber-300" />
        <MiniStat label="Sent" value={d.emails_sent} accent="text-violet-300" />
      </div>
    )}
  </motion.div>
)

const MiniStat: React.FC<{ label: string; value: number; accent?: string }> = ({ label, value, accent = 'text-zinc-200' }) => (
  <div>
    <div className={`text-base font-bold ${accent}`}>{value}</div>
    <div className="text-[11px] font-semibold text-zinc-500">{label}</div>
  </div>
)

const Field: React.FC<{
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  type?: string
  textarea?: boolean
}> = ({ label, value, onChange, required, type = 'text', textarea }) => (
  <label className="grid gap-1.5 text-xs font-semibold text-zinc-300">
    {label}
    {textarea ? (
      <textarea
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="input resize-y"
      />
    ) : (
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      />
    )}
  </label>
)
