// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render } from '@testing-library/react';

const hooks = vi.hoisted(() => ({
  usePortfolioKPIs: vi.fn(() => ({ kpis: {}, raw: {}, loading: false })),
  useGlobalHealthAreaSummaries: vi.fn(() => ({ bubbleData: [], loading: false })),
  useDiseaseSummaries: vi.fn(() => ({ bubbleData: [], loading: false })),
  useProductDistribution: vi.fn(() => ({ chartData: [], loading: false })),
  usePortfolioCandidates: vi.fn(() => ({ candidates: [], totalCount: 0, hasNextPage: false, loading: false })),
  useRegulatoryDistribution: vi.fn(() => ({ approvalStatus: [], whoPrequalification: [], approvingAuthorities: [], loading: false })),
  useClinicalTrialStats: vi.fn(() => ({ totalTrials: 0, statusDistribution: [], ageGroupDistribution: [], loading: false })),
  useClinicalTrials: vi.fn(() => ({ trials: [], totalCount: 0, hasNextPage: false, loading: false })),
  useGeographicDistribution: vi.fn(() => ({ mapData: [], loading: false })),
  useTechnologyTypeDistribution: vi.fn(() => ({ tableData: [], phases: [], loading: false })),
}));
vi.mock('@/graphql/hooks', () => hooks);
// The real DataTable renders an Apollo-backed CategoryFilter, which needs an
// ApolloProvider we don't set up here. These tests only assert that the tab
// forwards the global filters into its data hooks, so a stub DataTable keeps
// the render tree free of that unrelated dependency. The rest of @/components/ui
// (notably the Dropdown in the geo block) stays real.
vi.mock('@/components/ui', async (importActual) => ({
  ...(await importActual()),
  DataTable: () => null,
}));
vi.mock('@/components/global-filters', () => ({
  useGlobalFilters: () => ({
    healthArea: ['Neglected disease'], primary: ['Malaria'], secondary: [],
    expandedProduct: ['Vaccine'], rdPhase: ['Phase 1'],
  }),
}));

import ClinicalTrialsTab from '@/components/pipeline-explorer/visual-insights/ClinicalTrialsTab';

describe('ClinicalTrialsTab', () => {
  beforeEach(() => Object.values(hooks).forEach((h) => h.mockClear()));

  it('passes global filters into trial stats, geo, and the trials table', () => {
    render(<ClinicalTrialsTab onExplore={() => {}} />);
    expect(hooks.useClinicalTrialStats).toHaveBeenCalledWith(
      ['Neglected disease'], ['Malaria'], [], ['Vaccine'], ['Phase 1'],
    );
    const geoArgs = hooks.useGeographicDistribution.mock.calls[0];
    expect(geoArgs.slice(2)).toEqual([['Neglected disease'], ['Malaria'], [], ['Vaccine'], ['Phase 1']]);
    expect(geoArgs[0]).toBe('Trial Location');
    expect(geoArgs[1]).toBeNull();
    const tableFilter = hooks.useClinicalTrials.mock.calls[0][0];
    expect(tableFilter).toMatchObject({ globalHealthAreas: ['Neglected disease'], phaseNames: ['Phase 1'] });
  });

  it('renders the orientation intro, renamed table heading, and corrected geographic copy', () => {
    const { getByText, queryByText } = render(<ClinicalTrialsTab onExplore={() => {}} />);
    expect(getByText(/The clinical-trial layer of the pipeline/)).toBeInTheDocument();
    expect(getByText('Selected clinical trials')).toBeInTheDocument();
    expect(getByText(/The global heat map shows the country-level distribution/)).toBeInTheDocument();
    expect(queryByText(/spatial heat map/)).not.toBeInTheDocument();
    expect(getByText(/Proportion of clinical trial participants in each age bracket/)).toBeInTheDocument();
  });
});
