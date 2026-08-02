import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, X, ArrowRight, Sparkles, Users, BadgeCheck, Mail, Target, Rocket, Wand2, Loader2 } from 'lucide-react'
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
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[900px] -translate-x-1/2 rounded-full bg-violet-600/[0.15] blur-[140px]" />
      <div className="pointer-events-none absolute right-0 top-40 h-72 w-72 rounded-full bg-fuchsia-600/[0.08] blur-[100px]" />

      <div className="relative mx-auto max-w-5xl px-6 py-16">
        {/* Hero */}
        <div className="mb-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-500/30">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Cold Outreach</h1>
              <p className="text-sm text-zinc-400">
                Find high-intent leads, verify them, write personalized emails, send.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-500"
          >
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Cancel' : 'New Campaign'}
          </button>
        </div>

        {/* Aggregate stats */}
        {campaigns && campaigns.length > 0 && (
          <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={Rocket} label="Campaigns" value={campaigns.length} />
            <StatCard icon={Users} label="Leads found" value={totals.leads} />
            <StatCard icon={BadgeCheck} label="Qualified" value={totals.qualified} accent="text-emerald-400" />
            <StatCard icon={Mail} label="Emails sent" value={totals.sent} accent="text-violet-300" />
          </div>
        )}

        <div className="mb-6 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.07] to-fuchsia-500/[0.04] p-5">
          <div className="mb-2 flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-violet-400" />
            <p className="text-sm font-medium text-zinc-200">AI Campaign Planner</p>
          </div>
          <p className="mb-3 text-xs text-zinc-500">
            Describe who you want to reach in plain English — AI fills in the setup fields below for you to review.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
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
              className="flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
            >
              {planLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Generate with AI
            </button>
          </div>
          {plan && (plan.search_queries?.length > 0 || plan.qualification_rules?.length > 0) && (
            <div className="mt-3 grid gap-2 rounded-lg border border-white/10 bg-black/20 p-3 text-xs sm:grid-cols-2">
              {plan.search_queries?.length > 0 && (
                <div>
                  <p className="mb-1 font-medium text-zinc-400">Suggested search queries</p>
                  <ul className="list-disc space-y-0.5 pl-4 text-zinc-500">
                    {plan.search_queries.map((q) => <li key={q}>{q}</li>)}
                  </ul>
                </div>
              )}
              {plan.qualification_rules?.length > 0 && (
                <div>
                  <p className="mb-1 font-medium text-zinc-400">Qualification criteria</p>
                  <ul className="list-disc space-y-0.5 pl-4 text-zinc-500">
                    {plan.qualification_rules.map((r) => <li key={r}>{r}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {showForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              createMutation.mutate(form)
            }}
            className="mb-10 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur"
          >
            <div className="grid grid-cols-2 gap-4">
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
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="flex w-fit items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Campaign'} <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        {isLoading && <SkeletonCards count={3} />}
        {isError && (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
            Couldn't load campaigns: {(error as Error).message}
          </p>
        )}

        {campaigns && campaigns.length === 0 && !showForm && (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-16 text-center">
            <Target className="mx-auto mb-3 h-8 w-8 text-violet-400" />
            <p className="text-sm font-medium text-zinc-200">No campaigns yet</p>
            <p className="mx-auto mt-1 max-w-xs text-xs text-zinc-500">
              Create one to start finding leads, researching them, and writing personalized outreach automatically.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mx-auto mt-4 flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-500"
            >
              <Plus className="h-3.5 w-3.5" /> New Campaign
            </button>
          </div>
        )}

        <div className="grid gap-3">
          {campaigns?.map((c) => (
            <CampaignCard key={c.id} campaign={c} dashboard={dashboardByCampaign.get(c.id)} onOpen={() => navigate(`/campaigns/${c.id}`)} />
          ))}
        </div>
      </div>
    </div>
  )
}

const StatCard: React.FC<{ icon: React.ElementType; label: string; value: number; accent?: string }> = ({
  icon: Icon,
  label,
  value,
  accent = 'text-zinc-100',
}) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
    <Icon className="mb-2 h-4 w-4 text-zinc-500" />
    <div className={`text-2xl font-semibold ${accent}`}>{value}</div>
    <div className="text-[11px] text-zinc-500">{label}</div>
  </div>
)

const CampaignCard: React.FC<{ campaign: Campaign; dashboard?: CampaignDashboardMetrics; onOpen: () => void }> = ({
  campaign: c,
  dashboard: d,
  onOpen,
}) => (
  <div
    onClick={onOpen}
    className="group cursor-pointer rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-violet-500/40 hover:bg-white/[0.05]"
  >
    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-zinc-100">{c.name}</span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
              c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-500/10 text-zinc-400'
            }`}
          >
            {c.status}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-zinc-500">
          {c.niche} · {c.target_location}
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-zinc-600 transition group-hover:translate-x-0.5 group-hover:text-violet-400" />
    </div>
    {d && (
      <div className="mt-4 grid grid-cols-4 gap-2 border-t border-white/5 pt-3">
        <MiniStat label="Leads" value={d.total_leads} />
        <MiniStat label="Qualified" value={d.qualified_leads} accent="text-emerald-400" />
        <MiniStat label="Drafts" value={d.emails_generated} accent="text-amber-300" />
        <MiniStat label="Sent" value={d.emails_sent} accent="text-violet-300" />
      </div>
    )}
  </div>
)

const MiniStat: React.FC<{ label: string; value: number; accent?: string }> = ({ label, value, accent = 'text-zinc-200' }) => (
  <div>
    <div className={`text-sm font-semibold ${accent}`}>{value}</div>
    <div className="text-[10px] text-zinc-600">{label}</div>
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
  <label className="grid gap-1.5 text-xs font-medium text-zinc-400">
    {label}
    {textarea ? (
      <textarea
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500/50"
      />
    ) : (
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-violet-500/50"
      />
    )}
  </label>
)
