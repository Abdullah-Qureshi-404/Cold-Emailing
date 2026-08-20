import React from 'react'
import { Shield, Database, Radio, CheckCircle2, AlertCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../../services/api/client'

interface HealthResponse {
  status: string
  database: string
  database_latency_ms: number | null
  redis: string
}

export const SystemHealthCard: React.FC = () => {
  const { data: health, isLoading } = useQuery<HealthResponse>({
    queryKey: ['system-health'],
    queryFn: async () => {
      const res = await apiClient.get<HealthResponse>('/health')
      return res.data
    },
    refetchInterval: 30000,
    staleTime: 15000,
  })

  const isHealthy = health?.status === 'healthy'

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111113] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-zinc-100">System Infrastructure Status</h3>
        </div>
        <span className={`text-xs font-mono font-semibold flex items-center gap-1 ${isHealthy ? 'text-emerald-400' : 'text-amber-400'}`}>
          {isHealthy ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" /> All Systems Online
            </>
          ) : (
            <>
              <AlertCircle className="h-3.5 w-3.5" /> {isLoading ? 'Checking...' : 'Degraded'}
            </>
          )}
        </span>
      </div>

      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#161619] p-3">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-400" />
            <div>
              <div className="font-semibold text-zinc-200">Supabase PostgreSQL</div>
              <div className="text-[10px] text-zinc-400">Database Pooler Connection</div>
            </div>
          </div>
          <span className="font-mono text-zinc-300">
            {health?.database === 'connected' ? (
              <span className="text-emerald-400 font-semibold">{health.database_latency_ms ? `${health.database_latency_ms}ms ping` : 'Connected'}</span>
            ) : (
              <span className="text-rose-400">Disconnected</span>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#161619] p-3">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-400" />
            <div>
              <div className="font-semibold text-zinc-200">Upstash Redis Broker</div>
              <div className="text-[10px] text-zinc-400">Celery Distributed State & Beat</div>
            </div>
          </div>
          <span className="font-mono text-emerald-400 font-semibold">
            {health?.redis === 'connected' ? 'Connected (TLS)' : 'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  )
}
