export interface Lead {
  id: string
  fullName: string
  title: string
  company: string
  email: string
  icpScore: number
  enrichmentStatus: 'verified' | 'enriching' | 'pending' | 'failed'
  industry: string
  companySize: string
  intentSignal?: string
  campaignId?: string
}
