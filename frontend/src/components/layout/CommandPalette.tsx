import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, LayoutDashboard, Megaphone, BarChart3, Settings, Sparkles, X } from 'lucide-react'
import { useCommandStore } from '../../store/useCommandStore'
import { useAIStore } from '../../store/useAIStore'

export const CommandPalette: React.FC = () => {
  const { isOpen, setOpen, query, setQuery } = useCommandStore()
  const { setAIDrawerOpen, setActivePrompt } = useAIStore()
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(!isOpen)
      } else if (e.key === 'Escape' && isOpen) {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, setOpen])

  if (!isOpen) return null

  const handleNavigate = (path: string) => {
    navigate(path)
    setOpen(false)
    setQuery('')
  }

  const handleTriggerAI = (prompt: string) => {
    setActivePrompt(prompt)
    setAIDrawerOpen(true)
    setOpen(false)
    setQuery('')
  }

  const navCommands = [
    { title: 'AI Command Center', path: '/app/dashboard', icon: LayoutDashboard, shortcut: 'G D' },
    { title: 'Campaigns', path: '/app/campaigns', icon: Megaphone, shortcut: 'G C' },
    { title: 'Analytics & Health', path: '/app/analytics', icon: BarChart3, shortcut: 'G A' },
    { title: 'Settings', path: '/app/settings', icon: Settings, shortcut: 'G S' },
  ]

  const aiCommands = [
    { prompt: 'Target Fintech CTOs with Series B intent signals', label: 'AI Action: Draft Fintech Campaign' },
    { prompt: 'Analyze deliverability health for active domains', label: 'AI Action: Deliverability Audit' },
    { prompt: 'Scrape and enrich top 50 decision makers at Stripe & Brex', label: 'AI Action: Enrich Prospect Leads' },
  ]

  const filteredNav = navCommands.filter((c) => c.title.toLowerCase().includes(query.toLowerCase()))
  const filteredAI = aiCommands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()) || c.prompt.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />

      <div className="relative w-full max-w-xl overflow-hidden rounded-xl border border-white/[0.12] bg-[#141417] shadow-2xl ai-glow">
        {/* Search Input Bar */}
        <div className="flex items-center border-b border-white/[0.08] px-4 py-3">
          <Search className="h-4 w-4 text-purple-400 shrink-0 mr-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, search leads, or launch AI action..."
            className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
            autoFocus
          />
          <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-zinc-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Command Results */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-3">
          {/* Navigation Section */}
          {filteredNav.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                Navigation
              </div>
              {filteredNav.map((cmd) => {
                const Icon = cmd.icon
                return (
                  <button
                    key={cmd.path}
                    onClick={() => handleNavigate(cmd.path)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-purple-500/10 hover:text-purple-300 transition group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 text-zinc-400 group-hover:text-purple-400" />
                      <span>{cmd.title}</span>
                    </div>
                    <kbd className="font-mono text-[10px] text-zinc-500 group-hover:text-purple-400">{cmd.shortcut}</kbd>
                  </button>
                )
              })}
            </div>
          )}

          {/* Quick AI Actions Section */}
          {filteredAI.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Quick AI Prompt Launchers
              </div>
              {filteredAI.map((aiCmd, i) => (
                <button
                  key={i}
                  onClick={() => handleTriggerAI(aiCmd.prompt)}
                  className="flex w-full items-start justify-between rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-purple-500/10 hover:text-purple-300 transition text-left group"
                >
                  <div>
                    <div className="font-medium text-purple-300">{aiCmd.label}</div>
                    <div className="text-[11px] text-zinc-500 truncate">{aiCmd.prompt}</div>
                  </div>
                  <Sparkles className="h-3.5 w-3.5 text-purple-400 shrink-0 mt-0.5" />
                </button>
              ))}
            </div>
          )}

          {filteredNav.length === 0 && filteredAI.length === 0 && (
            <div className="p-6 text-center text-xs text-zinc-500">
              No matching commands or AI launchers found for "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
