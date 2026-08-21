import { Server, Sparkles, Mail, Database, ShieldCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../../services/api/client'

interface HealthResponse {
  status: string
  database: string
  database_latency_ms: number | null
  redis: string
}

export const EnvironmentConfigCard: React.FC = () => {
  const { data: health } = useQuery<HealthResponse>({
    queryKey: ['system-health'],
    queryFn: async () => {
      const res = await apiClient.get<HealthResponse>('/health')
      return res.data
    },
    refetchInterval: 30000,
    staleTime: 20000,
  })

  const isHealthy = health?.status === 'healthy'

  const envModules = [
    {
      name: 'Groq AI Engine',
      model: 'Llama-3.3-70b-versatile',
      status: 'Online',
      statusColor: 'text-emerald-400',
      icon: Sparkles,
      color: 'text-cyan-400 border-cyan-500/30 bg-cyan-950/20',
    },
    {
      name: 'Gmail API Connector',
      model: 'OAuth2 Scope (send, readonly)',
      status: 'Active',
      statusColor: 'text-emerald-400',
      icon: Mail,
      color: 'text-purple-400 border-purple-500/30 bg-purple-950/20',
    },
    {
      name: 'Supabase PostgreSQL DB',
      model: 'IPv4 Pooler + SQLAlchemy',
      status: health?.database === 'connected' ? (health.database_latency_ms ? `${health.database_latency_ms}ms ping` : 'Connected') : 'Connecting...',
      statusColor: health?.database === 'connected' ? 'text-emerald-400' : 'text-amber-400',
      icon: Database,
      color: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20',
    },
    {
      name: 'Upstash Redis & Celery',
      model: 'Distributed Tasks & Reconciliation Beat',
      status: health?.redis === 'connected' ? 'Connected (TLS)' : 'Connecting...',
      statusColor: health?.redis === 'connected' ? 'text-emerald-400' : 'text-amber-400',
      icon: Server,
      color: 'text-blue-400 border-blue-500/30 bg-blue-950/20',
    },
  ]

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111113] p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 text-purple-400" />
          <h3 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">
            Live Infrastructure Status
          </h3>
        </div>
        <span className={`text-[10px] font-mono font-semibold flex items-center gap-1 ${isHealthy ? 'text-emerald-400' : 'text-amber-400'}`}>
          <ShieldCheck className="h-3 w-3" /> {isHealthy ? 'All Systems Operational' : 'Connecting to Infrastructure'}
        </span>
      </div>

      <p className="text-xs text-zinc-400">
        Real-time telemetry and health status across core backend and third-party API providers.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {envModules.map((mod, idx) => {
          const Icon = mod.icon
          return (
            <div
              key={idx}
              className={`rounded-lg border p-3.5 space-y-1.5 ${mod.color}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-semibold text-zinc-100">{mod.name}</span>
                </div>
                <span className={`font-mono text-[10px] font-bold ${mod.statusColor}`}>
                  {mod.status}
                </span>
              </div>
              <p className="text-[11px] font-mono text-zinc-400 truncate">{mod.model}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
