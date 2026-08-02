import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { ChevronDown, LogOut, Shield } from 'lucide-react'
import { cn } from '../../lib/utils'

export const UserProfileMenu: React.FC = () => {
  const { user, switchRole, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  if (!user) return null

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 rounded-lg border border-white/[0.08] bg-[#141417] p-1.5 pr-2.5 transition hover:border-white/20 hover:bg-[#1a1a1e]"
      >
        <img
          src={user.avatarUrl}
          alt={user.name}
          className="h-7 w-7 rounded-md object-cover border border-purple-500/30"
        />
        <div className="hidden text-left sm:block">
          <div className="text-xs font-semibold text-zinc-100">{user.name}</div>
          <div className="text-[10px] uppercase font-mono text-purple-400 font-medium">{user.role}</div>
        </div>
        <ChevronDown className={cn('h-3.5 w-3.5 text-zinc-400 transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1.5 w-56 rounded-lg border border-white/[0.12] bg-[#161619] p-1.5 shadow-2xl backdrop-blur-xl">
            <div className="px-3 py-2 border-b border-white/[0.08]">
              <p className="text-xs font-semibold text-zinc-200">{user.name}</p>
              <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
            </div>

            <div className="py-1">
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1">
                <Shield className="h-3 w-3 text-purple-400" />
                Simulate Role
              </div>
              {(['admin', 'sdr', 'manager'] as const).map((role) => (
                <button
                  key={role}
                  onClick={() => {
                    switchRole(role)
                    setIsOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-1.5 text-xs capitalize transition rounded-md',
                    user.role === role
                      ? 'bg-purple-500/10 text-purple-300 font-medium'
                      : 'text-zinc-400 hover:bg-white/[0.05] hover:text-zinc-200'
                  )}
                >
                  <span>{role}</span>
                  {user.role === role && <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />}
                </button>
              ))}
            </div>

            <div className="pt-1 border-t border-white/[0.08]">
              <button
                onClick={() => {
                  logout()
                  setIsOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 transition"
              >
                <LogOut className="h-3.5 w-3.5" />
                Log out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
