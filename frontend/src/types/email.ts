export interface EmailDraft {
  id: string
  leadId: string
  leadName: string
  leadCompany: string
  leadTitle: string
  subject: string
  body: string
  status: 'pending_approval' | 'approved' | 'sent' | 'rejected'
  aiAngle: string
  confidenceScore: number
  generatedAt: string
}
