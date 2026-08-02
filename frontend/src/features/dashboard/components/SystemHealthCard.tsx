import React from 'react'
import { Shield, Zap, CheckCircle2 } from 'lucide-react'

export const SystemHealthCard: React.FC = () => {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111113] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Deliverability & Health</h3>
        </div>
        <span className="text-xs font-mono text-emerald-400 font-semibold flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" /> 99/100 Health
        </span>
      </div>

      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#161619] p-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-400" />
            <div>
              <div className="font-semibold text-zinc-200">Groq LLM Latency</div>
              <div className="text-[10px] text-zinc-400">Llama 3.3 70B Engine</div>
            </div>
          </div>
          <span className="font-mono text-purple-300 font-semibold">140ms</span>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-[#161619] p-3">
          <div>
            <div className="font-semibold text-zinc-200">Gmail API Authentication</div>
            <div className="text-[10px] text-zinc-400">SPF, DKIM, DMARC Protocols</div>
          </div>
          <span className="font-mono text-emerald-400 font-semibold">100% Passing</span>
        </div>
      </div>
    </div>
  )
}
