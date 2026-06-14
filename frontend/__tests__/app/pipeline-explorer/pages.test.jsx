// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Stub both view hosts so this file checks only that each route mounts
// its host; host behaviour is covered by the dedicated host tests
// (VisualInsightsTabs.test.jsx, TableBuilderTabs.test.jsx).
vi.mock('@/components/pipeline-explorer/visual-insights/VisualInsightsTabs', () => ({ default: () => <div>VISUAL INSIGHTS TABS</div> }));
vi.mock('@/components/pipeline-explorer/table-builder/TableBuilderTabs', () => ({ default: () => <div>TABLE BUILDER TABS</div> }));

import VisualInsightsPage from '@/app/pipeline-explorer/page';
import TableBuilderPage from '@/app/pipeline-explorer/table-builder/page';

describe('Pipeline Explorer pages', () => {
  it('Visual Insights page renders the VisualInsightsTabs host', () => {
    render(<VisualInsightsPage />);
    expect(screen.getByText(/VISUAL INSIGHTS TABS/i)).toBeTruthy();
  });

  it('Table Builder page renders the TableBuilderTabs host', () => {
    render(<TableBuilderPage />);
    expect(screen.getByText(/TABLE BUILDER TABS/i)).toBeTruthy();
  });
});
