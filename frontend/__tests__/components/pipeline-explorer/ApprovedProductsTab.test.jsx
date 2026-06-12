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

import ApprovedProductsTab from '@/components/pipeline-explorer/visual-insights/ApprovedProductsTab';

describe('ApprovedProductsTab', () => {
  beforeEach(() => Object.values(hooks).forEach((h) => h.mockClear()));

  it('scopes summaries to Product and passes global filters', () => {
    render(<ApprovedProductsTab onExplore={() => {}} />);
    expect(hooks.useProductDistribution).toHaveBeenCalledWith(
      ['Neglected disease'], ['Malaria'], [], ['Vaccine'], ['Phase 1'], 'Product',
    );
    expect(hooks.useRegulatoryDistribution).toHaveBeenCalledWith(
      ['Neglected disease'], ['Malaria'], [], ['Vaccine'], ['Phase 1'],
    );
    expect(hooks.useGlobalHealthAreaSummaries.mock.calls[0][0]).toEqual(['Product']);
    const tableFilter = hooks.usePortfolioCandidates.mock.calls[0][0];
    expect(tableFilter).toMatchObject({ candidateType: 'Product', productNames: ['Vaccine'], phaseNames: ['Phase 1'] });
  });
});
