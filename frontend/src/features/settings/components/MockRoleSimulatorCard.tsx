import React from 'react'
import { Shield, UserCheck, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import { cn } from '../../../lib/utils'

type RoleType = 'admin' | 'sdr' | 'manager'

export const MockRoleSimulatorCard: React.FC = () => {
  const { user, switchRole } = useAuth()

  const roles: { id: RoleType; name: string; desc: string }[] = [
    {
      id: 'admin',
      name: 'System Administrator',
      desc: 'Full access to all campaigns, settings, and Celery task execution.',
    },
    {
      id: 'sdr',
      name: 'Sales Development Rep (SDR)',
      desc: 'Lead intelligence, prospect enrichment, and AI email draft reviews.',
    },
    {
      id: 'manager',
      name: 'Outreach Manager',
      desc: 'Campaign performance telemetry, approval queues, and response metrics.',
    },
  ]

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111113] p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-purple-400" />
          <h3 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">
            User Role Simulation Mode
          </h3>
        </div>
        <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
          AuthContext Active
        </span>
      </div>

      <p className="text-xs text-zinc-400">
        Simulate different team role permissions across the frontend UI.
      </p>

      <div className="grid gap-3 lg:grid-cols-3">
        {roles.map((r) => {
          const isSelected = user?.role === r.id
          return (
            <button
              key={r.id}
              onClick={() => switchRole(r.id)}
              className={cn(
                'rounded-xl border p-4 text-left transition flex flex-col justify-between space-y-2 group',
                isSelected
                  ? 'border-purple-500/50 bg-purple-950/20 ai-glow-sm'
                  : 'border-white/[0.06] bg-[#161619] hover:border-white/20'
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-zinc-100">{r.name}</span>
                  {isSelected && <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0" />}
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">{r.desc}</p>
              </div>

              <div className="pt-2 border-t border-white/[0.06] flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
                <UserCheck className="h-3 w-3" />
                <span>Role: {r.id.toUpperCase()}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
