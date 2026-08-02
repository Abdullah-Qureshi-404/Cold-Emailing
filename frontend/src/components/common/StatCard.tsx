import React from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '../../lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  changePercent?: number
  trend?: 'up' | 'down' | 'neutral'
  subtext?: string
  icon?: React.ReactNode
  className?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  changePercent,
  trend = 'up',
  subtext,
  icon,
  className,
}) => {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#111113] p-5 transition-all hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/5',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">{label}</span>
        {icon && <div className="text-purple-400/80">{icon}</div>}
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <span className="font-mono text-2xl font-semibold tracking-tight text-zinc-100">{value}</span>
        {changePercent !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium',
              trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-rose-400' : 'text-zinc-400'
            )}
          >
            {trend === 'up' ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            <span>{changePercent > 0 ? `+${changePercent}%` : `${changePercent}%`}</span>
          </div>
        )}
      </div>

      {subtext && <p className="mt-2 text-xs text-zinc-500">{subtext}</p>}
    </div>
  )
}
