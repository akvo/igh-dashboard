'use client';

// Visual Insights view body. The shell (header, toggle, filters) lives
// in the shared layout; this route only renders the view body — the
// VisualInsightsTabs host, which owns the tab/slide-in state.

import VisualInsightsTabs from '@/components/pipeline-explorer/visual-insights/VisualInsightsTabs';

export default function PipelineExplorerVisualInsightsPage() {
  return <VisualInsightsTabs />;
}
