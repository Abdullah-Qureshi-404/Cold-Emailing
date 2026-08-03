export interface UserProfile {
  id: string
  name: string
  email: string
  avatarUrl: string
  role: 'admin' | 'sdr' | 'manager'
}

export interface Workspace {
  id: string
  name: string
  slug: string
  logoUrl?: string
  plan: 'Growth AI' | 'Enterprise' | 'Starter'
}
