import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Megaphone,
  Users,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useUIStore } from '../../store/useUIStore'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import { cn } from '../../lib/utils'

const navItems = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Campaigns', path: '/campaigns', icon: Megaphone },
  { name: 'Leads', path: '/leads', icon: Users },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Settings', path: '/settings', icon: Settings },
]

export const Sidebar: React.FC = () => {
  const { isSidebarCollapsed, toggleSidebar } = useUIStore()

  return (
    <>
      {/* Desktop Sidebar Navigation */}
      <aside
        className={cn(
          'relative z-20 hidden md:flex flex-col border-r border-white/[0.08] bg-[#12121a]/90 backdrop-blur-2xl transition-all duration-300 ease-in-out select-none',
          isSidebarCollapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Sidebar Header & Workspace Switcher */}
        <div className="flex h-16 items-center px-3 border-b border-white/[0.08]">
          <WorkspaceSwitcher isCollapsed={isSidebarCollapsed} />
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 p-3">
          {!isSidebarCollapsed && (
            <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Outreach Platform
            </div>
          )}
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-200',
                    isActive
                      ? 'bg-violet-600/20 text-violet-200 border border-violet-500/35 shadow-lg shadow-violet-500/10'
                      : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-100'
                  )
                }
                title={isSidebarCollapsed ? item.name : undefined}
              >
                <Icon className="h-4 w-4 shrink-0 text-violet-400 transition-transform duration-200 group-hover:scale-110" />
                {!isSidebarCollapsed && <span className="truncate font-semibold tracking-tight">{item.name}</span>}
              </NavLink>
            )
          })}
        </nav>

        {/* Collapse Toggle Button */}
        <div className="p-3 border-t border-white/[0.08] flex items-center justify-end">
          <button
            onClick={toggleSidebar}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-[#1a1a26] text-zinc-400 transition hover:border-violet-500/30 hover:bg-violet-600/20 hover:text-violet-200"
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar (Screens < 768px) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-white/[0.08] bg-[#12121a]/95 px-2 py-2 backdrop-blur-2xl shadow-2xl">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-semibold transition-all duration-200',
                  isActive
                    ? 'text-violet-300 bg-violet-600/20 border border-violet-500/30 shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                )
              }
            >
              <Icon className="h-4 w-4 text-violet-400" />
              <span>{item.name}</span>
            </NavLink>
          )
        })}
      </div>
    </>
  )
}
