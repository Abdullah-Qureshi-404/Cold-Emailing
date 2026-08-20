import React from 'react'
import { useLocation } from 'react-router-dom'
import { Search, Command, Menu, Bell, Loader2 } from 'lucide-react'
import { useCommandStore } from '../../store/useCommandStore'
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
  const { toggleMobileMenu, toggleTaskDrawer, isTaskDrawerOpen } = useUIStore()
  const tasks = useTaskStore((state) => state.tasks)

  const runningCount = tasks.filter(isTaskInFlight).length

  return (
    <header className="relative z-30 flex h-16 items-center justify-between border-b border-white/[0.08] bg-[#0d0d12]/80 px-6 backdrop-blur-2xl">
      {/* Left: Mobile Menu & Current Route Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleMobileMenu}
          className="rounded-lg p-2 text-zinc-400 hover:bg-white/[0.04] lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <h1 className="text-base font-bold tracking-tight text-zinc-100">
          {routeTitles[location.pathname] || 'Campaign Studio'}
        </h1>
      </div>

      {/* Center: Global Search / Command Bar */}
      <div className="hidden max-w-md flex-1 px-8 md:block">
        <button
          onClick={() => setCommandOpen(true)}
          className="flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-[#14141a]/60 px-3.5 py-2 text-xs text-zinc-400 backdrop-blur-xl transition hover:border-white/20 hover:bg-[#181822]/80"
        >
          <div className="flex items-center gap-2.5">
            <Search className="h-4 w-4 text-zinc-400" />
            <span>Search campaigns, leads, or execute actions...</span>
          </div>
          <kbd className="flex items-center gap-0.5 rounded-md border border-white/[0.12] bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
            <Command className="h-3 w-3" /> K
          </kbd>
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Background Task Activity Drawer Trigger */}
        <button
          onClick={toggleTaskDrawer}
          className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
            isTaskDrawerOpen
              ? 'border-violet-500/50 bg-violet-600/20 text-violet-200'
              : 'border-white/[0.08] bg-[#12121a] text-zinc-400 hover:border-white/20 hover:text-zinc-200'
          }`}
        >
          {runningCount > 0 ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
          ) : (
            <Bell className="h-3.5 w-3.5 text-zinc-400" />
          )}
          <span>Activity</span>
          {runningCount > 0 && (
            <span className="rounded-full bg-violet-600 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white">
              {runningCount}
            </span>
          )}
        </button>

        {/* User Profile Menu */}
        <UserProfileMenu />
      </div>
    </header>
  )
}
