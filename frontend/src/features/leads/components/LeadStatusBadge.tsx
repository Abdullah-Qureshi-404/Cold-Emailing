import React from 'react'
import { cn } from '../../../lib/utils'

interface LeadStatusBadgeProps {
  status: string
  className?: string
}

export const LeadStatusBadge: React.FC<LeadStatusBadgeProps> = ({ status, className }) => {
  const getBadgeStyle = (st: string) => {
    switch (st.toLowerCase()) {
      case 'qualified':
      case 'email_generated':
      case 'research_complete':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30 ai-glow-sm'
      case 'replied':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 cyan-glow'
      case 'sent':
      case 'email_found':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      case 'waiting_approval':
      case 'research_pending':
      case 'email_searching':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'disqualified':
      case 'email_not_found':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      default:
        return 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50'
    }
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize font-mono',
        getBadgeStyle(status),
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status.replace(/_/g, ' ')}
    </span>
  )
}
