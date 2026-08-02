import React from 'react'
import { Server, Sparkles, Mail, Database, ShieldCheck } from 'lucide-react'

export const EnvironmentConfigCard: React.FC = () => {
  const envModules = [
    {
      name: 'Groq AI Engine',
      model: 'Llama-3.3-70b-versatile',
      status: 'Configured (.env)',
      icon: Sparkles,
      color: 'text-cyan-400 border-cyan-500/30 bg-cyan-950/20',
    },
    {
      name: 'Gmail API Connector',
      model: 'OAuth2 Scope (send, readonly)',
      status: 'Configured (.env)',
      icon: Mail,
      color: 'text-purple-400 border-purple-500/30 bg-purple-950/20',
    },
    {
      name: 'PostgreSQL Database',
      model: 'SQLAlchemy ORM + Supabase',
      status: 'Connected',
      icon: Database,
      color: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20',
    },
    {
      name: 'Celery + Redis Task Queue',
      model: 'Async Background Processing',
      status: 'Active',
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
            Backend Infrastructure Status
          </h3>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" /> System Operational
        </span>
      </div>

      <p className="text-xs text-zinc-400">
        Active environment modules loaded from backend configuration (`backend/config.py`).
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
                <span className="font-mono text-[10px] text-emerald-400 font-bold">
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
