import React from 'react'
import { cn } from '../../../lib/utils'

interface DraftStatusBadgeProps {
  status: 'pending' | 'approved' | 'sent' | string
  className?: string
}

export const DraftStatusBadge: React.FC<DraftStatusBadgeProps> = ({ status, className }) => {
  const getBadgeStyle = (st: string) => {
    switch (st.toLowerCase()) {
      case 'approved':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30 ai-glow-sm font-semibold'
      case 'sent':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 cyan-glow font-semibold'
      case 'pending':
      default:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
    }
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-medium capitalize',
        getBadgeStyle(status),
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status === 'pending' ? 'Pending Review' : status}
    </span>
  )
}
