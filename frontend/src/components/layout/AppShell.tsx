import React from 'react'
import { Outlet } from 'react-router-dom'
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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090b] text-zinc-100 font-sans antialiased selection:bg-purple-500/20 selection:text-purple-200">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Workspace */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <Navbar />
        <BackendStatusBanner />

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#09090b]">
          <div className="mx-auto max-w-7xl">
            <Outlet />
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
