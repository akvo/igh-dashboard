// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import VisualInsightsPage from '@/app/pipeline-explorer/page';
import TableBuilderPage from '@/app/pipeline-explorer/table-builder/page';

describe('Pipeline Explorer placeholder pages', () => {
  it('Visual Insights page renders its placeholder', () => {
    render(<VisualInsightsPage />);
    expect(screen.getByText(/Visual Insights/i)).toBeTruthy();
    expect(screen.getByText(/coming soon/i)).toBeTruthy();
  });

  it('Table Builder page renders its placeholder', () => {
    render(<TableBuilderPage />);
    expect(screen.getByText(/Table Builder/i)).toBeTruthy();
    expect(screen.getByText(/coming soon/i)).toBeTruthy();
  });
});
