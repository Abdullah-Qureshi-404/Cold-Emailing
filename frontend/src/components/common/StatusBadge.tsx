import React from 'react'
import { cn } from '../../lib/utils'

interface StatusBadgeProps {
  status: string
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'ai' | 'neutral'
  className?: string
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, variant = 'neutral', className }) => {
  const variantStyles = {
    success: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    danger: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
    info: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    ai: 'bg-violet-600/20 text-violet-200 border-violet-500/30 purple-glow-sm',
    neutral: 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider transition-colors',
        variantStyles[variant],
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  )
}
