import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react'
import { useToastStore } from '../store/useToastStore'

const ICONS = { success: CheckCircle2, error: AlertTriangle, info: Info }
const STYLES = {
  success: 'border-emerald-500/40 bg-emerald-950/80 text-emerald-200 shadow-[0_0_20px_rgba(16,185,129,0.2)]',
  error: 'border-rose-500/40 bg-rose-950/80 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.2)]',
  info: 'border-violet-500/40 bg-[#161324]/95 text-violet-200 purple-glow-sm',
}

/** Stacked, auto-dismissing toasts (bottom-right) */
export const Toaster: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-full max-w-sm flex-col gap-2.5">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICONS[t.kind]
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-xs font-semibold shadow-2xl backdrop-blur-xl ${STYLES[t.kind]}`}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex-1 leading-relaxed">{t.text}</span>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="shrink-0 rounded-lg p-0.5 opacity-70 hover:bg-white/10 hover:opacity-100 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
