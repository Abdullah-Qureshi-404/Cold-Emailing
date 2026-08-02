import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Megaphone,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Cpu,
  ShieldCheck,
} from 'lucide-react'
import { useUIStore } from '../../store/useUIStore'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import { cn } from '../../lib/utils'

// Per-campaign work (leads, emails, activity) lives inside the Campaign
// Workspace at /app/campaigns/:id rather than as separate top-level pages.
const navItems = [
  { name: 'Command Center', path: '/app/dashboard', icon: LayoutDashboard },
  { name: 'Campaigns', path: '/app/campaigns', icon: Megaphone },
  { name: 'Analytics', path: '/app/analytics', icon: BarChart3 },
  { name: 'Settings', path: '/app/settings', icon: Settings },
]

export const Sidebar: React.FC = () => {
  const { isSidebarCollapsed, toggleSidebar } = useUIStore()

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r border-white/[0.08] bg-[#0c0c0e] transition-all duration-300 ease-in-out select-none',
        isSidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* Sidebar Header & Workspace Switcher */}
      <div className="flex h-16 items-center px-3 border-b border-white/[0.08]">
        <WorkspaceSwitcher isCollapsed={isSidebarCollapsed} />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 p-2.5">
        {!isSidebarCollapsed && (
          <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Platform
          </div>
        )}
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium transition-all',
                  isActive
                    ? 'bg-purple-500/15 text-purple-300 border border-purple-500/25 shadow-sm shadow-purple-500/5'
                    : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                )
              }
              title={isSidebarCollapsed ? item.name : undefined}
            >
              <Icon className="h-4 w-4 shrink-0 transition-colors group-hover:text-purple-400" />
              {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* System Status Indicators */}
      {!isSidebarCollapsed && (
        <div className="mx-2.5 mb-3 rounded-lg border border-white/[0.08] bg-[#111113] p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <Cpu className="h-3.5 w-3.5 text-purple-400" />
              Groq AI Latency
            </span>
            <span className="font-mono text-purple-300 font-semibold">140ms</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-zinc-400">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              Warmup Health
            </span>
            <span className="font-mono text-emerald-400 font-semibold">99%</span>
          </div>
        </div>
      )}

      {/* Collapse Toggle Button */}
      <div className="p-2.5 border-t border-white/[0.08] flex items-center justify-end">
        <button
          onClick={toggleSidebar}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-white/[0.08] bg-[#161619] text-zinc-400 transition hover:bg-white/[0.08] hover:text-zinc-200"
          title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  )
}
