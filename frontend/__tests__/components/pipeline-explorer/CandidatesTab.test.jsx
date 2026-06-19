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
// the render tree free of that unrelated dependency.
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

import CandidatesTab from '@/components/pipeline-explorer/visual-insights/CandidatesTab';
import { makeFilterSerializer } from '@/lib/dataTableUrl';
import { CANDIDATE_COLUMNS } from '@/lib/exploreColumnConfig';

describe('CandidatesTab', () => {
  beforeEach(() => {
    Object.values(hooks).forEach((h) => h.mockClear());
    // The table state is now URL-backed; reset the URL so a param seeded by one
    // test does not leak into the others (which assert the unfiltered call).
    window.history.replaceState(null, '', '/');
  });

  it('passes the active global filters into its KPI and table hooks', () => {
    render(<CandidatesTab onExplore={() => {}} />);
    expect(hooks.usePortfolioKPIs).toHaveBeenCalledWith(
      ['Neglected disease'], ['Malaria'], [], ['Vaccine'], ['Phase 1'],
    );
    expect(hooks.useProductDistribution).toHaveBeenCalledWith(
      ['Neglected disease'], ['Malaria'], [], ['Vaccine'], ['Phase 1'], 'Candidate',
    );
    const tableFilter = hooks.usePortfolioCandidates.mock.calls[0][0];
    expect(tableFilter).toMatchObject({
      candidateType: 'Candidate',
      globalHealthAreas: ['Neglected disease'],
      primaryDiseaseNames: ['Malaria'],
      productNames: ['Vaccine'],
      phaseNames: ['Phase 1'],
    });
  });

  it('reads candidate column filters from the f.candidates url param into the table hook', () => {
    const ser = makeFilterSerializer(CANDIDATE_COLUMNS);
    // candidate_name is a text-filterable candidate column; deserialize runs on
    // read (no debounce), so the seeded filter reaches the hook synchronously.
    const encoded = ser.serialize({ candidate_name: { kind: 'text', text: 'malaria' } });
    window.history.replaceState(null, '', `/?f.candidates=${encodeURIComponent(encoded)}`);
    render(<CandidatesTab onExplore={() => {}} />);
    const tableFilter = hooks.usePortfolioCandidates.mock.calls[0][0];
    expect(tableFilter.columnFilters).toBeTruthy();
    expect(JSON.stringify(tableFilter.columnFilters)).toContain('malaria');
  });

  it('passes global filters into the disease-summaries hook (Top 5 diseases)', () => {
    render(<CandidatesTab onExplore={() => {}} />);
    const [, opts] = hooks.useDiseaseSummaries.mock.calls[0];
    expect(opts).toMatchObject({
      globalHealthAreas: ['Neglected disease'],
      primaryDiseaseNames: ['Malaria'],
      phaseNames: ['Phase 1'],
    });
  });

  it('product-scopes the GHA summaries that feed the KPI cards', () => {
    render(<CandidatesTab onExplore={() => {}} />);
    const [types, opts] = hooks.useGlobalHealthAreaSummaries.mock.calls[0];
    expect(types).toEqual(['Candidate']);
    expect(opts).toMatchObject({ productNames: ['Vaccine'] });
  });

  it('renders the renamed table heading and the chart descriptions', () => {
    const { getByText } = render(<CandidatesTab onExplore={() => {}} />);
    expect(getByText('Selected candidates')).toBeInTheDocument();
    expect(getByText(/Ranks the five diseases with the most candidates/)).toBeInTheDocument();
    expect(getByText(/Ranks the five product types with the most candidates/)).toBeInTheDocument();
  });
});
