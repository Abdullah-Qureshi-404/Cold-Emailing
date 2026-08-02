import React, { useState } from 'react'
import { Sparkles, ArrowRight, Wand2 } from 'lucide-react'
import { useAIStore } from '../../../store/useAIStore'

export const QuickAIActionBar: React.FC = () => {
  const [prompt, setPrompt] = useState('')
  const { setActivePrompt, setAIDrawerOpen } = useAIStore()

  const handleLaunch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return
    setActivePrompt(prompt)
    setAIDrawerOpen(true)
    setPrompt('')
  }

  const suggestedPrompts = [
    'Target Fintech CTOs in NYC with Series B intent signals',
    'Generate 3-step sequence for SaaS VP of Engineering',
    'Audit deliverability health for active Gmail domains',
  ]

  return (
    <div className="rounded-xl border border-purple-500/30 bg-[#111113] p-5 shadow-xl ai-glow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-600/20 text-purple-400 border border-purple-500/30">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
              AI Outreach Generator
              <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[9px] font-mono text-purple-300 border border-purple-500/20">
                Groq Llama 3.3
              </span>
            </h3>
          </div>
        </div>
        <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">140ms AI Latency</span>
      </div>

      <form onSubmit={handleLaunch} className="relative flex items-center">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your ideal campaign (e.g. Target Fintech Founders with Series B funding)..."
          className="w-full rounded-xl border border-white/[0.12] bg-[#161619] py-3 pl-4 pr-32 text-xs text-zinc-100 placeholder-zinc-500 focus:border-purple-500/60 focus:outline-none transition"
        />
        <button
          type="submit"
          className="absolute right-1.5 flex items-center gap-1.5 rounded-lg bg-purple-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-purple-500 ai-glow-sm"
        >
          <Wand2 className="h-3.5 w-3.5" />
          <span>Launch AI</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </form>

      {/* Suggested Prompts Pills */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Quick Starters:</span>
        {suggestedPrompts.map((s, idx) => (
          <button
            key={idx}
            onClick={() => {
              setActivePrompt(s)
              setAIDrawerOpen(true)
            }}
            className="rounded-md border border-white/[0.06] bg-[#18181c] px-2.5 py-1 text-[11px] text-zinc-400 hover:border-purple-500/40 hover:text-purple-300 transition"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
