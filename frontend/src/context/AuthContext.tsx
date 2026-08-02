import React, { createContext, useContext, useState } from 'react'
import type { UserProfile, Workspace } from '../types/user'

interface AuthContextType {
  user: UserProfile | null
  activeWorkspace: Workspace
  workspaces: Workspace[]
  switchWorkspace: (workspaceId: string) => void
  switchRole: (role: 'admin' | 'sdr' | 'manager') => void
  logout: () => void
  login: () => void
  isAuthenticated: boolean
}

const mockUser: UserProfile = {
  id: 'usr_mock_001',
  name: 'Alex Vance',
  email: 'alex.vance@growthscale.ai',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  role: 'admin',
}

const mockWorkspaces: Workspace[] = [
  {
    id: 'ws_01',
    name: 'GrowthScale AI',
    slug: 'growthscale',
    plan: 'Growth AI',
  },
  {
    id: 'ws_02',
    name: 'Apex Outreach Labs',
    slug: 'apex-labs',
    plan: 'Enterprise',
  },
]

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(mockUser)
  const [workspaces] = useState<Workspace[]>(mockWorkspaces)
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace>(mockWorkspaces[0])

  const switchWorkspace = (workspaceId: string) => {
    const found = workspaces.find((w) => w.id === workspaceId)
    if (found) setActiveWorkspace(found)
  }

  const switchRole = (role: 'admin' | 'sdr' | 'manager') => {
    if (user) {
      setUser({ ...user, role })
    }
  }

  const logout = () => setUser(null)
  const login = () => setUser(mockUser)

  return (
    <AuthContext.Provider
      value={{
        user,
        activeWorkspace,
        workspaces,
        switchWorkspace,
        switchRole,
        logout,
        login,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
