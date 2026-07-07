// @vitest-environment jsdom

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock the data hooks so the section renders without a GraphQL backend.
// useUrlState reads window history directly and needs no mock (the existing
// pipeline-explorer tab tests rely on the same behaviour).
vi.mock('@/graphql/hooks', () => ({
  usePortfolioKPIs: () => ({ kpis: [], loading: false }),
  useClinicalTrialStats: () => ({ totalTrials: 0 }),
  useProductPhaseDistribution: () => ({ chartData: [], phases: [], loading: false }),
  useProductDistribution: () => ({ chartData: [], loading: false }),
}));
vi.mock('@/components/global-filters', () => ({
  useGlobalFilters: () => ({
    healthArea: [], primary: [], secondary: [], rdPhase: [], expandedProduct: [],
  }),
}));

import PipelineOverviewSection from '@/components/pipeline-overview/PipelineOverviewSection';

describe('PipelineOverviewSection', () => {
  it('renders both chart cards with the Pipeline Overview copy', () => {
    render(<PipelineOverviewSection />);

    expect(screen.getByRole('heading', { name: 'Global pipeline overview' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Product types' })).toBeTruthy();

    // Copy unique to Pipeline Overview (absent from the old ExploreSection).
    expect(
      screen.getByText(/use Export Visual to save the chart as an image/i),
    ).toBeTruthy();
    expect(
      screen.getByText(/Use the ··· menu to export the chart/i),
    ).toBeTruthy();
  });
});
