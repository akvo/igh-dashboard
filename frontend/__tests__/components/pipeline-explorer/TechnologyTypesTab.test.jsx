// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, act } from '@testing-library/react';

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

import TechnologyTypesTab, { effectiveProductNames } from '@/components/pipeline-explorer/visual-insights/TechnologyTypesTab';

describe('TechnologyTypesTab', () => {
  beforeEach(() => {
    Object.values(hooks).forEach((h) => h.mockClear());
    // The drill-down selection is now URL-backed, so reset the URL between
    // tests to keep seeded query params from leaking across them.
    window.history.replaceState(null, '', '/');
  });

  it('passes global filters into the technology distribution hook', () => {
    render(<TechnologyTypesTab onExplore={() => {}} />);
    const args = hooks.useTechnologyTypeDistribution.mock.calls[0];
    expect(args.slice(0, 5)).toEqual([['Neglected disease'], ['Malaria'], [], ['Vaccine'], ['Phase 1']]);
  });

  it('reads the selected tech type from the tech.tt url param into the coverage hook', () => {
    window.history.replaceState(null, '', '/?tech.tt=mRNA');
    render(<TechnologyTypesTab onExplore={() => {}} />);
    // useDiseaseSummaries is the coverage-bubbles hook; with a tech type selected
    // it must be called un-skipped with that technology type.
    const opts = hooks.useDiseaseSummaries.mock.calls.at(-1)[1];
    expect(opts.technologyTypes).toEqual(['mRNA']);
    expect(opts.skip).toBe(false);
  });

  it('reads the selected disease from the tech.dis url param into the table hook', () => {
    // Use a disease that differs from the global `primary` mock (['Malaria']) so
    // the assertion proves the drilled disease overrides the global filter
    // rather than coincidentally matching it.
    window.history.replaceState(null, '', '/?tech.dis=Tuberculosis');
    render(<TechnologyTypesTab onExplore={() => {}} />);
    // The tech accordion table hook should receive the disease as primaryDiseaseNames.
    const tableFilter = hooks.usePortfolioCandidates.mock.calls[0][0];
    expect(tableFilter.primaryDiseaseNames).toEqual(['Tuberculosis']);
  });

  it('renders the section description and no placeholder copy', () => {
    const { getByText, queryByText } = render(<TechnologyTypesTab onExplore={() => {}} />);
    expect(getByText(/Each card shows a product type with its total candidate count/)).toBeInTheDocument();
    expect(queryByText(/make custom comparison page/)).not.toBeInTheDocument();
  });

  it('keeps a url-provided table filter on mount (does not reset it on load)', () => {
    vi.useFakeTimers();
    try {
      window.history.replaceState(
        null,
        '',
        '/?tech.tt=Subunit&tech.cand=1&f.tech=candidate_name%3Abime',
      );
      act(() => {
        render(<TechnologyTypesTab onExplore={() => {}} />);
      });
      // Advance past the 500ms reset-effect / filter-serializer debounce window.
      act(() => {
        vi.advanceTimersByTime(700);
      });
      expect(decodeURIComponent(window.location.search)).toContain('f.tech=candidate_name:bime');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('effectiveProductNames', () => {
  it('returns the global filter when no card is selected', () => {
    expect(effectiveProductNames(['Vaccine'], undefined)).toEqual(['Vaccine']);
    expect(effectiveProductNames(['Vaccine'], [])).toEqual(['Vaccine']);
  });
  it('returns undefined when neither side narrows', () => {
    expect(effectiveProductNames([], undefined)).toBeUndefined();
  });
  it('returns the local selection when there is no global filter', () => {
    expect(effectiveProductNames([], ['Diagnostics'])).toEqual(['Diagnostics']);
  });
  it('returns the intersection when global and local overlap', () => {
    expect(effectiveProductNames(['Vaccine', 'Diagnostics'], ['Diagnostics'])).toEqual(['Diagnostics']);
  });
  it('falls back to the local selection when global and local are disjoint', () => {
    expect(effectiveProductNames(['Vaccine'], ['Diagnostics'])).toEqual(['Diagnostics']);
  });
});
