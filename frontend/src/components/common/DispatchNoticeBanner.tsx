import React from 'react';
import { Info, Clock3, CheckCircle2 } from 'lucide-react';
import type { DispatchNotice } from '../../hooks/useDispatchNotice';

const toneStyles: Record<DispatchNotice['tone'], { wrapper: string; icon: React.ElementType }> = {
  queued: {
    wrapper: 'border-purple-500/30 bg-purple-950/40 text-purple-300 ai-glow-sm',
    icon: Clock3,
  },
  skipped: {
    wrapper: 'border-amber-500/30 bg-amber-950/25 text-amber-300',
    icon: CheckCircle2,
  },
  info: {
    wrapper: 'border-white/[0.12] bg-[#161619] text-zinc-300',
    icon: Info,
  },
};

export const DispatchNoticeBanner: React.FC<{ notice: DispatchNotice | null }> = ({ notice }) => {
  if (!notice) return null;
  const { wrapper, icon: Icon } = toneStyles[notice.tone];

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border p-3 font-mono text-xs ${wrapper}`}
    >
      <span className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {notice.message}
      </span>
      <span className="hidden shrink-0 text-[10px] opacity-70 sm:inline">{notice.endpoint}</span>
    </div>
  );
};
