import React from 'react';
import { Bot, CheckCircle2, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useValidatedActiveCampaignId } from '../../../hooks/useValidatedActiveCampaignId';
import { useCampaignDashboard } from '../hooks/useCampaignDashboard';

interface AITimelineStreamProps {
  /** Scopes this component to a specific campaign (Campaign Workspace). Falls back to the global active campaign. */
  campaignId?: number | null;
}

export const AITimelineStream: React.FC<AITimelineStreamProps> = ({ campaignId }) => {
  const activeCampaignId = useValidatedActiveCampaignId(campaignId);
  const { data: dashboard } = useCampaignDashboard(activeCampaignId);

  const defaultEvents = [
    {
      id: 'evt_1',
      title: 'Groq LLM Engine Ready',
      description: 'Llama 3.3 model connected and ready for website research & email generation.',
      timestamp: 'Just now',
      type: 'deliverability_alert',
      status: 'completed',
    },
    {
      id: 'evt_2',
      title: 'Gmail API Dispatcher',
      description: 'OAuth2 Gmail thread scanner & email sender initialized for active campaign.',
      timestamp: '2m ago',
      type: 'agent_action',
      status: 'completed',
    },
    {
      id: 'evt_3',
      title: 'Google Maps Scraper',
      description: 'Celery background task worker polling for lead extraction requests.',
      timestamp: '5m ago',
      type: 'email_generated',
      status: 'completed',
    },
  ];

  const timeline = dashboard
    ? [
        {
          id: `evt_dash_${dashboard.campaign_id}`,
          title: `Campaign #${dashboard.campaign_id} Telemetry Synchronized`,
          description: `${dashboard.total_leads} total leads, ${dashboard.emails_sent} sent, ${dashboard.replies} replies detected.`,
          timestamp: 'Just now',
          type: 'email_generated',
          status: 'completed',
        },
        ...defaultEvents.slice(0, 2),
      ]
    : defaultEvents;

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111113] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-zinc-100">Live AI Agent Stream</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-mono text-zinc-400">FastAPI & Celery Online</span>
        </div>
      </div>

      <div className="relative space-y-4 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/[0.08]">
        {timeline.map((evt) => {
          const getIcon = () => {
            switch (evt.type) {
              case 'email_generated':
                return <Sparkles className="h-3.5 w-3.5 text-purple-400" />;
              case 'deliverability_alert':
                return <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />;
              case 'agent_action':
                return <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />;
              default:
                return <CheckCircle2 className="h-3.5 w-3.5 text-purple-400" />;
            }
          };

          return (
            <div key={evt.id} className="relative flex items-start gap-3 pl-7">
              <div className="absolute left-1.5 top-0.5 flex h-3.5 w-3.5 -translate-x-1/2 items-center justify-center rounded-full bg-[#111113] border border-white/[0.2]">
                {getIcon()}
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-200">{evt.title}</span>
                  <span className="text-[10px] font-mono text-zinc-500">{evt.timestamp}</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{evt.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
