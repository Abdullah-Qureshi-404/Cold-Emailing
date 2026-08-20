import React from 'react'
import { PageHeader } from '../../../components/common/PageHeader'
import { EnvironmentConfigCard } from '../components/EnvironmentConfigCard'

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & System Status"
        description="View backend infrastructure readiness, external API credentials, and production environment variables."
      />

      {/* Backend System Infrastructure Status */}
      <EnvironmentConfigCard />
    </div>
  )
}
