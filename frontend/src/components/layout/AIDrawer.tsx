import React, { useState } from 'react'
import { Sparkles, X, Send, Bot, Cpu, CheckCircle2 } from 'lucide-react'
import { useAIStore } from '../../store/useAIStore'
import { cn } from '../../lib/utils'

export const AIDrawer: React.FC = () => {
  const { isAIDrawerOpen, setAIDrawerOpen, activePrompt, setActivePrompt } = useAIStore()
  const [inputVal, setInputVal] = useState('')
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: 'Hello Alex. Groq AI Engine is online (140ms latency). How can I assist your outbound cold email automation today?',
      time: 'Just now',
    },
  ])

  if (!isAIDrawerOpen) return null

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    const promptText = inputVal || activePrompt
    if (!promptText.trim()) return

    const newMsg = { sender: 'user' as const, text: promptText, time: 'Just now' }
    setMessages((prev) => [...prev, newMsg])
    setInputVal('')
    setActivePrompt('')

    // Simulate AI response
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `Executing AI action: "${promptText}". Analyzing 142 leads and drafting personalized angles using Groq LLM...`,
          time: 'Just now',
        },
      ])
    }, 600)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAIDrawerOpen(false)} />

      <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="pointer-events-auto w-screen max-w-md border-l border-white/[0.12] bg-[#111113] p-5 shadow-2xl flex flex-col justify-between ai-glow">
          {/* Drawer Header */}
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                    Groq AI Copilot
                    <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  </h2>
                  <p className="text-[11px] font-mono text-purple-400">Model: Llama 3.3 70B • 140ms</p>
                </div>
              </div>
              <button
                onClick={() => setAIDrawerOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-200 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Status Pill */}
            <div className="mt-3 flex items-center justify-between rounded-lg border border-purple-500/20 bg-purple-950/20 px-3 py-2 text-xs text-purple-300">
              <span className="flex items-center gap-1.5">
                <Cpu className="h-3.5 w-3.5 text-purple-400" />
                Context: Dashboard & Active Workspace
              </span>
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Ready
              </span>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto my-4 space-y-3 pr-1">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  'rounded-xl p-3 text-xs leading-relaxed max-w-[85%]',
                  msg.sender === 'user'
                    ? 'ml-auto bg-purple-600/20 text-purple-100 border border-purple-500/30'
                    : 'bg-[#18181c] text-zinc-300 border border-white/[0.08]'
                )}
              >
                <div className="flex items-center gap-1.5 font-semibold text-[10px] text-zinc-400 mb-1">
                  {msg.sender === 'ai' ? (
                    <>
                      <Bot className="h-3 w-3 text-purple-400" /> Groq Assistant
                    </>
                  ) : (
                    'You'
                  )}
                  <span className="ml-auto text-[9px] text-zinc-500">{msg.time}</span>
                </div>
                {msg.text}
              </div>
            ))}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="border-t border-white/[0.08] pt-3">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputVal || activePrompt}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder="Ask AI to enrich leads, generate drafts, or optimize ICP..."
                className="w-full rounded-xl border border-white/[0.12] bg-[#161619] py-2.5 pl-3 pr-10 text-xs text-zinc-100 placeholder-zinc-500 focus:border-purple-500/50 focus:outline-none"
              />
              <button
                type="submit"
                className="absolute right-2 rounded-lg bg-purple-600 p-1.5 text-white transition hover:bg-purple-500"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
