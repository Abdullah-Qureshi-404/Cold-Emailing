import React, { useState } from 'react'
import { Sparkles, RefreshCw, Send, CheckCircle2, User, Building } from 'lucide-react'

export const AIEmailGeneratorPreview: React.FC = () => {
  const [angleIndex, setAngleIndex] = useState(0)
  const [isApproved, setIsApproved] = useState(false)

  const angles = [
    {
      angle: 'Series B Growth Signals',
      subject: 'Quick Q on scaling sales engineering post-Series B at Plaid',
      body: `Hi Alex,\n\nSaw Plaid's recent expansion announcement in NYC. Congrats on the milestone!\n\nWhen scaling sales teams post-funding, deliverability often dips as volume increases. We helped Brex maintain a 99.4% inbox placement rate while scaling from 1k to 50k personalized emails/mo using Groq AI intent routing.\n\nOpen to reviewing our 2-min deliverability benchmark report?`,
      score: 98,
    },
    {
      angle: 'Tech Stack Upgrade Angle',
      subject: 'Groq LLM email routing vs standard outreach at Plaid',
      body: `Hi Alex,\n\nMost outbound platforms hit API bottlenecks when generating real-time lead personalizations.\n\nWe built an automated pipeline executing 140ms Groq LLM inferences per lead—matching ICP attributes with zero delay.\n\nWould you be open to testing 50 free AI-enriched leads for your team this week?`,
      score: 96,
    },
  ]

  const current = angles[angleIndex]

  const handleNextAngle = () => {
    setAngleIndex((prev) => (prev + 1) % angles.length)
    setIsApproved(false)
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111113] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Live AI Draft Inspector</h3>
        </div>
        <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-mono font-medium text-purple-300 border border-purple-500/20 ai-glow-sm">
          {current.score}% ICP Match
        </span>
      </div>

      {/* Prospect Meta Banner */}
      <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#161619] p-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600/20 text-purple-300 font-semibold border border-purple-500/30">
            <User className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-zinc-200">Alex Rivera</div>
            <div className="text-[11px] text-zinc-400 flex items-center gap-1">
              <Building className="h-3 w-3 text-zinc-500" />
              VP of Sales Engineering • Plaid
            </div>
          </div>
        </div>

        <button
          onClick={handleNextAngle}
          className="flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-[#1a1a1e] px-2.5 py-1.5 text-xs text-zinc-300 hover:border-purple-500/30 hover:text-purple-300 transition"
        >
          <RefreshCw className="h-3 w-3 text-purple-400" />
          <span>Regenerate Angle</span>
        </button>
      </div>

      {/* Email Body Inspector */}
      <div className="rounded-lg border border-white/[0.08] bg-[#141417] p-4 space-y-3 font-sans text-xs">
        <div className="border-b border-white/[0.06] pb-2">
          <span className="text-zinc-500">Subject: </span>
          <span className="font-medium text-zinc-200">{current.subject}</span>
        </div>
        <div className="whitespace-pre-line text-zinc-300 leading-relaxed font-sans">
          {current.body}
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-zinc-500 font-mono">
          Angle: <strong className="text-purple-300 font-medium">{current.angle}</strong>
        </span>
        <button
          onClick={() => setIsApproved(true)}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition ${
            isApproved
              ? 'bg-emerald-600 text-white'
              : 'bg-purple-600 text-white hover:bg-purple-500 ai-glow-sm'
          }`}
        >
          {isApproved ? (
            <>
              <CheckCircle2 className="h-4 w-4" />
              <span>Approved & Queued</span>
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              <span>Approve Draft</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
