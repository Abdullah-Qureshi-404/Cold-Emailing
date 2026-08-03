/**
 * Optional error monitoring hook-up. Real Sentry wiring needs your own
 * Sentry account + DSN (and the `@sentry/react` package installed) — that's
 * not something that can be provisioned for you, so this is left as a
 * ready-to-activate stub rather than a fake/silent integration.
 *
 * To activate:
 *   1. npm install @sentry/react
 *   2. Set VITE_SENTRY_DSN in frontend/.env
 *   3. Uncomment the Sentry.init(...) block below
 */
export function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (!dsn) return

  console.warn(
    '[monitoring] VITE_SENTRY_DSN is set, but @sentry/react is not installed — ' +
      'run `npm install @sentry/react` and uncomment the init in src/lib/monitoring.ts to enable error tracking.'
  )

  // import * as Sentry from '@sentry/react'
  // Sentry.init({ dsn, tracesSampleRate: 0.2 })
}
