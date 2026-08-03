import React from 'react'
import { AlertTriangle } from 'lucide-react'

interface State {
  hasError: boolean
  message?: string
}

/**
 * Catches render-time errors in the component tree below it so one bad
 * screen doesn't white-screen the entire app. Logs the real error to the
 * console (and, if configured, Sentry) — shows a generic, actionable
 * message to the user.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Unhandled UI error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#050505] p-6 text-white">
          <div className="max-w-sm text-center">
            <AlertTriangle className="mx-auto mb-4 h-8 w-8 text-rose-400" />
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="mt-2 text-sm text-zinc-400">
              This screen hit an unexpected error. Reloading usually fixes it — your data is safe, this is a
              display issue only.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
