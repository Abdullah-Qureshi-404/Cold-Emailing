import React from 'react'
import { useLocation } from 'react-router-dom'
import { Search, Sparkles, Command, Menu, Bell, Loader2 } from 'lucide-react'
import { useCommandStore } from '../../store/useCommandStore'
import { useAIStore } from '../../store/useAIStore'
import { useUIStore } from '../../store/useUIStore'
import { useTaskStore, isTaskInFlight } from '../../store/useTaskStore'
import { UserProfileMenu } from './UserProfileMenu'

const routeTitles: Record<string, string> = {
  '/app/dashboard': 'AI Command Center',
  '/app/campaigns': 'Campaign Studio',
  '/app/analytics': 'Analytics & Health',
  '/app/settings': 'Settings & Integrations',
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
    (/^\/app\/campaigns\/\d+/.test(location.pathname) ? 'Campaign Workspace' : 'Dashboard')

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-white/[0.08] bg-[#09090b]/80 px-4 backdrop-blur-md">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleMobileMenu}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-zinc-400 sm:hidden hover:bg-white/[0.05]"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-purple-400">Mission Control</div>
          <h1 className="text-sm font-semibold text-zinc-100">{currentTitle}</h1>
        </div>
      </div>

      {/* Right: Search, AI Copilot Trigger & User Menu */}
      <div className="flex items-center gap-3">
        {/* Command Palette Trigger Button */}
        <button
          onClick={() => setCommandOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#141417] px-3 py-1.5 text-xs text-zinc-400 transition hover:border-white/20 hover:text-zinc-200"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Search actions or leads...</span>
          <kbd className="hidden rounded bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] font-medium text-zinc-400 md:inline-flex items-center gap-0.5">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>

        {/* Background Task Activity Trigger */}
        <button
          onClick={toggleTaskDrawer}
          title="Background task activity"
          className={`relative flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
            isTaskDrawerOpen
              ? 'border-purple-500/50 bg-purple-600/20 text-purple-200'
              : 'border-white/[0.08] bg-[#141417] text-zinc-400 hover:border-white/20 hover:text-zinc-200'
          }`}
        >
          {runningCount > 0 ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
          ) : (
            <Bell className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">Activity</span>
          {runningCount > 0 && (
            <span className="rounded-full bg-purple-600 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">
              {runningCount}
            </span>
          )}
        </button>

        {/* AI Copilot Drawer Trigger */}
        <button
          onClick={toggleAIDrawer}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
            isAIDrawerOpen
              ? 'border-purple-500/50 bg-purple-600/20 text-purple-200 ai-glow-sm'
              : 'border-purple-500/30 bg-purple-950/20 text-purple-300 hover:bg-purple-900/30'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-purple-400" />
          <span className="hidden sm:inline">AI Copilot</span>
        </button>

        {/* User Profile Menu */}
        <UserProfileMenu />
      </div>
    </header>
  )
}
