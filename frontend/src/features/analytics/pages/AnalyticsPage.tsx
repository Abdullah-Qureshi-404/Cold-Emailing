import React from 'react';
import { PageHeader } from '../../../components/common/PageHeader';
import { CampaignTelemetryGrid } from '../components/CampaignTelemetryGrid';
import { PipelineConversionFunnel } from '../components/PipelineConversionFunnel';
import { ResearchQualityCard } from '../components/ResearchQualityCard';
import { useActiveCampaignSync } from '../../../hooks/useActiveCampaignSync';

/**
 * Reporting only. Sequence maintenance actions (follow-ups, reply scan, mark
 * cold) moved to the Campaign Workspace → Emails tab so every action for a
 * campaign lives in one place.
 */
export const AnalyticsPage: React.FC = () => {
  const { activeCampaignId } = useActiveCampaignSync();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Outreach Analytics & Sequence Telemetry"
        description="Campaign analytics and funnel conversion tracking. Run actions from a Campaign Workspace."
      />

      {!activeCampaignId && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-center text-xs text-amber-300 font-mono">
          Notice: open a campaign from Campaign Studio to load its analytics telemetry.
        </div>
      )}

      {/* Main Campaign Telemetry KPI Grid */}
      <CampaignTelemetryGrid />

      {/* Recharts Pipeline Funnel */}
      <PipelineConversionFunnel />

      {/* Groq AI Research Quality Stats */}
      <ResearchQualityCard />
    </div>
  );
};
