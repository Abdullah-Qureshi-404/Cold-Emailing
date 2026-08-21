import React from 'react'
import { Mail, Sparkles } from 'lucide-react'

interface WorkspaceSwitcherProps {
  isCollapsed?: boolean
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({ isCollapsed }) => {
  if (isCollapsed) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-md shadow-purple-600/30">
        <Mail className="h-5 w-5" />
      </div>
    )
  }

  return (
    <div className="flex w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-[#161619]/90 p-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-md shadow-purple-600/30">
        <Mail className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-bold text-zinc-100 tracking-tight">
          Cold Emailing
        </div>
        <div className="flex items-center gap-1 text-[10px] font-medium text-purple-400">
          <Sparkles className="h-2.5 w-2.5" />
          <span>AI Pipeline Engine</span>
        </div>
      </div>
    </div>
  )
}
