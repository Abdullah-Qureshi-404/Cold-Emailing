import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, ShieldCheck, Database, Server, ChevronDown } from 'lucide-react'
import { apiClient } from '../../services/api/client'
import { cn } from '../../lib/utils'

interface HealthResponse {
  status: string
  database: string
  database_latency_ms?: number
  redis: string
}

export const UserProfileMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)

  const { data: health } = useQuery<HealthResponse>({
    queryKey: ['system-health-indicator'],
    queryFn: () => apiClient.get('/health'),
    refetchInterval: 30000,
    staleTime: 20000,
  })

  const isHealthy = health?.status === 'healthy'

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="System status menu"
        className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-[#141417] px-3 py-1.5 transition hover:border-white/20 hover:bg-[#1a1a1e]"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', isHealthy ? 'bg-emerald-400' : 'bg-amber-400')} />
          <span className={cn('relative inline-flex rounded-full h-2.5 w-2.5', isHealthy ? 'bg-emerald-500' : 'bg-amber-500')} />
        </span>
        <div className="text-left">
          <div className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
            <span>System</span>
            <span className={cn('text-[10px] font-mono font-medium', isHealthy ? 'text-emerald-400' : 'text-amber-400')}>
              {isHealthy ? 'Operational' : 'Connecting'}
            </span>
          </div>
        </div>
        <ChevronDown className={cn('h-3.5 w-3.5 text-zinc-400 transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-white/[0.12] bg-[#161619] p-3 shadow-2xl backdrop-blur-xl space-y-2.5">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold text-zinc-100">Live Infrastructure</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Active
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between rounded-lg bg-[#111113] p-2">
                <span className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                  <Database className="h-3.5 w-3.5 text-emerald-400" /> PostgreSQL DB
                </span>
                <span className="font-mono text-[11px] text-emerald-400 font-medium capitalize">
                  {health?.database || 'Connected'}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-[#111113] p-2">
                <span className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                  <Server className="h-3.5 w-3.5 text-purple-400" /> Redis Task Broker
                </span>
                <span className="font-mono text-[11px] text-purple-400 font-medium capitalize">
                  {health?.redis || 'Connected'}
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-[#111113] p-2">
                <span className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
                  <Activity className="h-3.5 w-3.5 text-cyan-400" /> Backend Engine
                </span>
                <span className="font-mono text-[11px] text-cyan-400 font-medium">
                  FastAPI Production
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
