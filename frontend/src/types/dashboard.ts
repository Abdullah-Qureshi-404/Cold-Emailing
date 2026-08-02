export interface DashboardMetric {
  id: string
  label: string
  value: string | number
  changePercent: number
  trend: 'up' | 'down' | 'neutral'
  sparkline: number[]
  subtext: string
}

export interface AITimelineEvent {
  id: string
  timestamp: string
  title: string
  description: string
  type: 'agent_action' | 'lead_enrichment' | 'email_generated' | 'deliverability_alert'
  status: 'completed' | 'in_progress' | 'failed'
  campaignName?: string
  targetLead?: string
}

export interface DashboardSummary {
  metrics: DashboardMetric[]
  timeline: AITimelineEvent[]
}
