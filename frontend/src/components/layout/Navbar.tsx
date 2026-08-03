import React from 'react'
import { useLocation } from 'react-router-dom'
import { Search, Sparkles, Command, Menu, Bell, Loader2 } from 'lucide-react'
import { useCommandStore } from '../../store/useCommandStore'
import { useAIStore } from '../../store/useAIStore'
import { useUIStore } from '../../store/useUIStore'
import { useTaskStore, isTaskInFlight } from '../../store/useTaskStore'
import { UserProfileMenu } from './UserProfileMenu'

const routeTitles: Record<string, string> = {
  '/campaigns': 'Campaign Studio',
  '/leads': 'Lead Database & Intelligence',
  '/dashboard': 'AI Command Center',
  '/analytics': 'Analytics & Telemetry',
  '/settings': 'Settings & Configurations',
  '/app/dashboard': 'AI Command Center',
  '/app/campaigns': 'Campaign Studio',
  '/app/leads': 'Lead Database & Intelligence',
  '/app/analytics': 'Analytics & Telemetry',
  '/app/settings': 'Settings & Configurations',
}

export const Navbar: React.FC = () => {
  const location = useLocation()
  const { setOpen: setCommandOpen } = useCommandStore()
  const { toggleAIDrawer, isAIDrawerOpen } = useAIStore()
  const { toggleMobileMenu, toggleTaskDrawer, isTaskDrawerOpen } = useUIStore()
  const tasks = useTaskStore((state) => state.tasks)

  const runningCount = tasks.filter(isTaskInFlight).length

  const currentTitle =
    routeTitles[location.pathname] ||
    (/^\/(app\/)?campaigns\/\d+/.test(location.pathname) ? 'Campaign Workspace' : 'Outreach Platform')

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-white/[0.08] bg-[#0a0a0f]/80 px-4 sm:px-6 backdrop-blur-xl">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMobileMenu}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-[#12121a] text-zinc-400 sm:hidden hover:bg-white/[0.05]"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-violet-400 font-sans">
            Outreach Control
          </div>
          <h1 className="text-sm font-semibold tracking-tight text-zinc-100">{currentTitle}</h1>
        </div>
      </div>

      {/* Right: Search, AI Copilot Trigger & User Menu */}
      <div className="flex items-center gap-3">
        {/* Command Palette Trigger Button */}
        <button
          onClick={() => setCommandOpen(true)}
          className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-[#12121a] px-3.5 py-1.5 text-xs text-zinc-400 transition hover:border-violet-500/30 hover:text-zinc-200"
        >
          <Search className="h-3.5 w-3.5 text-violet-400" />
          <span className="hidden md:inline font-medium">Search actions or leads...</span>
          <kbd className="hidden rounded-md bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-400 md:inline-flex items-center gap-0.5">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>

        {/* Background Task Activity Trigger */}
        <button
          onClick={toggleTaskDrawer}
          title="Background task activity"
          className={`relative flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition ${
            isTaskDrawerOpen
              ? 'border-violet-500/50 bg-violet-600/20 text-violet-200 shadow-lg shadow-violet-500/10'
              : 'border-white/[0.08] bg-[#12121a] text-zinc-400 hover:border-white/20 hover:text-zinc-200'
          }`}
        >
          {runningCount > 0 ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
          ) : (
            <Bell className="h-3.5 w-3.5 text-zinc-400" />
          )}
          <span className="hidden sm:inline">Activity</span>
          {runningCount > 0 && (
            <span className="rounded-full bg-violet-600 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">
              {runningCount}
            </span>
          )}
        </button>

        {/* AI Copilot Drawer Trigger */}
        <button
          onClick={toggleAIDrawer}
          className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition ${
            isAIDrawerOpen
              ? 'border-violet-500/50 bg-violet-600/20 text-violet-200 purple-glow-sm'
              : 'border-violet-500/30 bg-violet-950/20 text-violet-300 hover:bg-violet-900/30'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          <span className="hidden sm:inline">AI Copilot</span>
        </button>

        {/* User Profile Menu */}
        <UserProfileMenu />
      </div>
    </header>
  )
}
