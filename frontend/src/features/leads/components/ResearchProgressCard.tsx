import React from 'react';
import { Sparkles, Cpu, Target, AlertTriangle } from 'lucide-react';
import { ApiErrorBanner } from '../../../components/common/ApiErrorBanner';
import { useValidatedActiveCampaignId } from '../../../hooks/useValidatedActiveCampaignId';
import { useResearchStatus } from '../hooks/useResearchStatus';

interface ResearchProgressCardProps {
  /** Scopes this component to a specific campaign (Campaign Workspace). Falls back to the global active campaign. */
  campaignId?: number | null;
}

export const ResearchProgressCard: React.FC<ResearchProgressCardProps> = ({ campaignId }) => {
  const activeCampaignId = useValidatedActiveCampaignId(campaignId);
  const { data: research, isLoading, isError, error } = useResearchStatus(activeCampaignId);

  const totalLeads = research?.total_leads || 0;
  const researchedLeads = research?.researched || 0;
  const confidence = research?.average_confidence || 0;
  const insufficient = research?.insufficient || 0;

  const percentComplete = totalLeads > 0 ? Math.round((researchedLeads / totalLeads) * 100) : 0;

  const extractedTech = ['FastAPI', 'Groq LLM', 'PostgreSQL', 'Celery Workers', 'Gmail API'];
  const extractedPainPoints = [
    'Scrapes lead website, extracts raw text, and generates structured analysis',
    'Evaluates domain reputation & verifies MX record deliverability',
    'Scores ICP persona compatibility before generating email copy',
  ];

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#111113] p-5 space-y-4 premium-card-hover ai-glow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
              AI Research Intelligence
            </h3>
            <p className="text-[11px] text-zinc-400">
              Automated web search, enrichment, and company profiling
            </p>
          </div>
        </div>
        <span className="font-mono text-xs text-purple-300 font-semibold bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
          {confidence} Avg Confidence
        </span>
      </div>

      {isLoading && (
        <div className="py-4 text-center text-xs text-zinc-500 font-mono">
          Loading AI research metrics...
        </div>
      )}

      {isError && (
        <ApiErrorBanner
          message={error instanceof Error ? error.message : 'Failed to load research status.'}
        />
      )}

      {/* Research Completion Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-zinc-400">Research Pipeline Progress</span>
          <span className="font-mono font-semibold text-purple-300">
            {researchedLeads} / {totalLeads} ({percentComplete}%)
          </span>
        </div>
        <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 via-cyan-500 to-pink-500 rounded-full transition-all duration-500"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>

      {/* Extracted Intelligence Insights */}
      <div className="grid gap-3 sm:grid-cols-2 pt-1 text-xs">
        <div className="rounded-lg border border-white/[0.06] bg-[#161619] p-3 space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-cyan-300 text-[11px]">
            <Cpu className="h-3.5 w-3.5 text-cyan-400" />
            Detected Tech Stack Focus
          </div>
          <div className="flex flex-wrap gap-1.5">
            {extractedTech.map((tech, idx) => (
              <span
                key={idx}
                className="rounded bg-zinc-800/80 px-2 py-0.5 font-mono text-[10px] text-zinc-300 border border-white/[0.06]"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-white/[0.06] bg-[#161619] p-3 space-y-2">
          <div className="flex items-center gap-1.5 font-semibold text-purple-300 text-[11px]">
            <Target className="h-3.5 w-3.5 text-purple-400" />
            Backend Research Engine Rules
          </div>
          <ul className="space-y-1 text-[11px] text-zinc-400 list-disc list-inside">
            {extractedPainPoints.map((pt, idx) => (
              <li key={idx} className="truncate">{pt}</li>
            ))}
          </ul>
        </div>
      </div>

      {insufficient > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-950/20 p-2.5 text-xs text-amber-300">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
          <span>
            {insufficient} leads flagged with insufficient data. Scraper re-attempt scheduled.
          </span>
        </div>
      )}
    </div>
  );
};
