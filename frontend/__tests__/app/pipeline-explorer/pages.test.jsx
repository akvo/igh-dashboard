// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// The Visual Insights page now mounts the VisualInsightsTabs host (see
// pipeline-explorer-page.test.jsx for the dedicated coverage); stub it
// here so this file stays focused on the Table Builder placeholder.
vi.mock('@/components/pipeline-explorer/visual-insights/VisualInsightsTabs', () => ({ default: () => <div>VISUAL INSIGHTS TABS</div> }));

import VisualInsightsPage from '@/app/pipeline-explorer/page';
import TableBuilderPage from '@/app/pipeline-explorer/table-builder/page';

describe('Pipeline Explorer pages', () => {
  it('Visual Insights page renders the VisualInsightsTabs host', () => {
    render(<VisualInsightsPage />);
    expect(screen.getByText(/VISUAL INSIGHTS TABS/i)).toBeTruthy();
  });

  it('Table Builder page renders its placeholder', () => {
    render(<TableBuilderPage />);
    expect(screen.getByText(/Table Builder/i)).toBeTruthy();
    expect(screen.getByText(/coming soon/i)).toBeTruthy();
  });
});
