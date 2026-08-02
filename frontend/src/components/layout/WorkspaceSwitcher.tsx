import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { ChevronDown, Check, Building2, Sparkles } from 'lucide-react'
import { cn } from '../../lib/utils'

interface WorkspaceSwitcherProps {
  isCollapsed?: boolean
}

export const WorkspaceSwitcher: React.FC<WorkspaceSwitcherProps> = ({ isCollapsed }) => {
  const { activeWorkspace, workspaces, switchWorkspace } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  if (isCollapsed) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-purple-500/30 bg-purple-950/20 text-purple-400 ai-glow-sm">
        <Building2 className="h-5 w-5" />
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-lg border border-white/[0.08] bg-[#161619] p-2.5 text-left transition hover:border-white/20 hover:bg-[#1c1c20]"
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-purple-600/20 text-purple-400 border border-purple-500/30">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-xs font-semibold text-zinc-100">{activeWorkspace.name}</span>
            </div>
            <span className="text-[10px] font-medium text-purple-400 flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5" />
              {activeWorkspace.plan}
            </span>
          </div>
        </div>
        <ChevronDown className={cn('h-4 w-4 text-zinc-400 transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1.5 w-full rounded-lg border border-white/[0.12] bg-[#161619] p-1.5 shadow-xl backdrop-blur-xl">
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Workspaces
            </div>
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => {
                  switchWorkspace(ws.id)
                  setIsOpen(false)
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-md px-2.5 py-2 text-xs transition',
                  ws.id === activeWorkspace.id
                    ? 'bg-purple-500/10 text-purple-300 font-medium'
                    : 'text-zinc-300 hover:bg-white/[0.05] hover:text-white'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="truncate">{ws.name}</span>
                </div>
                {ws.id === activeWorkspace.id && <Check className="h-3.5 w-3.5 text-purple-400" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
