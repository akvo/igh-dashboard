// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Stub the chrome and the section so this test checks only the page's own
// composition and copy. Section behaviour is covered by
// PipelineOverviewSection.test.jsx; Sidebar by Sidebar.test.jsx.
vi.mock('@/components/layout/Sidebar', () => ({ default: () => null }));
vi.mock('@/components/global-filters', () => ({
  GlobalFilterBar: () => <div>GLOBAL FILTER BAR</div>,
  useGlobalFilters: () => ({}),
}));
vi.mock('@/components/pipeline-overview/PipelineOverviewSection', () => ({
  default: () => <div>PIPELINE OVERVIEW SECTION</div>,
}));

import PipelineOverviewPage from '@/app/pipeline-overview/page';

describe('Pipeline Overview page', () => {
  it('renders the page title and intro', () => {
    render(<PipelineOverviewPage />);
    expect(screen.getByRole('heading', { name: 'Pipeline overview' })).toBeTruthy();
    expect(
      screen.getByText(/Filters apply across the whole portal/i),
    ).toBeTruthy();
  });

  it('mounts the filter bar and the overview section', () => {
    render(<PipelineOverviewPage />);
    expect(screen.getByText(/GLOBAL FILTER BAR/)).toBeTruthy();
    expect(screen.getByText(/PIPELINE OVERVIEW SECTION/)).toBeTruthy();
  });

  it('does not render an Aggregated portfolio section', () => {
    render(<PipelineOverviewPage />);
    expect(screen.queryByText(/Aggregated portfolio/i)).toBeNull();
  });
});
