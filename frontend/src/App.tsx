import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Toaster } from './components/Toaster'
import { initMonitoring } from './lib/monitoring'

const CampaignsPage = lazy(() => import('./pages/CampaignsPage').then((m) => ({ default: m.CampaignsPage })))
const CampaignPage = lazy(() => import('./pages/CampaignPage').then((m) => ({ default: m.CampaignPage })))

initMonitoring()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 15,
      refetchOnWindowFocus: false,
    },
  },
})

const RouteFallback: React.FC = () => (
  <div className="min-h-screen bg-[#050505]" />
)

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Navigate to="/campaigns" replace />} />
              <Route path="/campaigns" element={<CampaignsPage />} />
              <Route path="/campaigns/:id" element={<CampaignPage />} />
              <Route path="*" element={<Navigate to="/campaigns" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster />
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
