import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'
import { BackendStatusBanner } from './BackendStatusBanner'
import { CommandPalette } from './CommandPalette'
import { AIDrawer } from './AIDrawer'
import { TaskActivityDrawer } from './TaskActivityDrawer'
import { useActiveCampaignSync } from '../../hooks/useActiveCampaignSync'

export const AppShell: React.FC = () => {
  // Keep active campaign in sync globally across all /app routes
  useActiveCampaignSync()
  const location = useLocation()

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-[#0a0a0f] text-zinc-100 font-sans antialiased selection:bg-violet-500/20 selection:text-violet-200">
      {/* Background Ambient Glow Effects */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[1000px] -translate-x-1/2 rounded-full bg-violet-600/[0.12] blur-[150px]" />
      <div className="pointer-events-none absolute right-0 top-1/3 h-80 w-80 rounded-full bg-purple-600/[0.08] blur-[120px]" />

      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Workspace */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <Navbar />
        <BackendStatusBanner />

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0a0a0f]/60 backdrop-blur-3xl">
          <div className="mx-auto max-w-7xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Overlays */}
      <CommandPalette />
      <AIDrawer />
      {/* Always mounted: polls in-flight Celery tasks even while closed. */}
      <TaskActivityDrawer />
    </div>
  )
}
