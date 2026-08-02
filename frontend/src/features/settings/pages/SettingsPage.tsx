import React from 'react'
import { PageHeader } from '../../../components/common/PageHeader'
import { EnvironmentConfigCard } from '../components/EnvironmentConfigCard'
import { MockRoleSimulatorCard } from '../components/MockRoleSimulatorCard'

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings & System Status"
        description="View system module readiness and simulate team user roles across the platform."
      />

      {/* Backend System Infrastructure Status */}
      <EnvironmentConfigCard />

      {/* AuthContext Role Simulator */}
      <MockRoleSimulatorCard />
    </div>
  )
}
