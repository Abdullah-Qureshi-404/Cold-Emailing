import { useCallback, useEffect, useRef, useState } from 'react';
import type { TaskResponse } from '../types/api';

export interface DispatchNotice {
  message: string;
  endpoint: string;
  tone: 'queued' | 'skipped' | 'info';
}

const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Lightweight "we dispatched it" acknowledgement.
 *
 * Deliberately not the source of truth for completion — that lives in the task
 * activity drawer. This only reports what the dispatch endpoint said, including
 * the `skipped` case where the daily-dedupe check found today's work already
 * done and there is no task to poll.
 */
export function useDispatchNotice(timeoutMs: number = DEFAULT_TIMEOUT_MS) {
  const [notice, setNotice] = useState<DispatchNotice | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setNotice(null);
  }, []);

  const notify = useCallback(
    (name: string, endpoint: string, response?: TaskResponse) => {
      let next: DispatchNotice;

      if (response?.status === 'skipped') {
        const count = response.total_saved ?? 0;
        next = {
          message: `${name}: already done today — ${count} lead${
            count === 1 ? '' : 's'
          } already collected. Nothing new was queued.`,
          endpoint,
          tone: 'skipped',
        };
      } else if (response?.status === 'queued') {
        next = {
          message: `${name} queued. Track progress in the Activity panel.`,
          endpoint,
          tone: 'queued',
        };
      } else {
        next = { message: name, endpoint, tone: 'info' };
      }

      if (timerRef.current) clearTimeout(timerRef.current);
      setNotice(next);
      timerRef.current = setTimeout(() => setNotice(null), timeoutMs);
    },
    [timeoutMs]
  );

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { notice, notify, clear };
}
