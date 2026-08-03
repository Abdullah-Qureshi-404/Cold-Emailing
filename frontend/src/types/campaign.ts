export interface Campaign {
  id: string
  name: string
  status: 'active' | 'paused' | 'draft' | 'completed'
  targetICP: string
  totalLeads: number
  sentCount: number
  openRate: number
  replyRate: number
  aiPersonalizationScore: number
  createdAt: string
  updatedAt: string
}
