// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';

// Only the active sub-tab's data hook actually fetches; all four are
// called every render (with a skip flag), so stub them to empty results.
const hooks = vi.hoisted(() => ({
  usePortfolioCandidates: vi.fn(() => ({ candidates: [], totalCount: 0, hasNextPage: false, loading: false })),
  useRdPrioritiesWithCandidates: vi.fn(() => ({ priorities: [], totalCount: 0, hasNextPage: false, loading: false })),
  useClinicalTrials: vi.fn(() => ({ trials: [], totalCount: 0, hasNextPage: false, loading: false })),
  useRdPriorities: vi.fn(() => ({ priorities: [], totalCount: 0, hasNextPage: false, loading: false })),
}));
vi.mock('@/graphql/hooks', () => hooks);

// The real DataTable renders an Apollo-backed CategoryFilter we don't set
// up here. Stub it to null; keep the real TabNav and Dropdown so the
// sub-tab labels and the inline filter labels render.
vi.mock('@/components/ui', async (importActual) => ({
  ...(await importActual()),
  DataTable: () => null,
}));

// The hierarchical filters pull their own data; stub to null so the test
// tree only carries the lightweight Dropdown labels we assert on.
vi.mock('@/components/filters/HierarchicalDiseaseFilter', () => ({ default: () => null }));
vi.mock('@/components/filters/HierarchicalProductFilter', () => ({ default: () => null }));

vi.mock('@apollo/client/react', () => ({ useApolloClient: () => ({}) }));

const setRdPhase = vi.fn();
vi.mock('@/components/global-filters', () => ({
  useGlobalFilters: () => ({
    healthArea: ['Neglected disease'], primary: ['Malaria'], secondary: [],
    product: ['Vaccine'], expandedProduct: ['Vaccine'], rdPhase: ['Phase 1'],
    setHealthArea: vi.fn(), setPrimary: vi.fn(), setSecondary: vi.fn(),
    setProduct: vi.fn(), setRdPhase,
    healthAreaOptions: [], narrowedHierarchy: {}, productOptions: [], rdPhaseOptions: [],
  }),
}));

import TableBuilderTabs from '@/components/pipeline-explorer/table-builder/TableBuilderTabs';

beforeEach(() => {
  Object.values(hooks).forEach((h) => h.mockClear());
  setRdPhase.mockClear();
  // Per-tab state is URL-backed; reset between tests so a seeded extTab
  // does not leak into the next case.
  window.history.replaceState(null, '', '/');
});

describe('TableBuilderTabs', () => {
  it('renders all four sub-tab labels', () => {
    render(<TableBuilderTabs />);
    // On the default Candidates tab, 'Candidates & approved products' appears
    // twice — as the TabNav button and as the active card heading — so use
    // getAllByText. The other two full labels appear only as tab buttons.
    expect(screen.getAllByText('Candidates & approved products').length).toBeGreaterThan(0);
    expect(screen.getByText('R&D priorities & candidates')).toBeInTheDocument();
    expect(screen.getByText('Clinical trials & candidates')).toBeInTheDocument();
    // 'R&D priorities' (exact) is the fourth tab's label; getAllByText guards
    // against it also appearing as a heading on other tabs.
    expect(screen.getAllByText('R&D priorities').length).toBeGreaterThan(0);
  });

  it('defaults to the candidates tab: forwards global filters into the candidates hook and shows its description', () => {
    render(<TableBuilderTabs />);
    const filter = hooks.usePortfolioCandidates.mock.calls[0][0];
    expect(filter).toMatchObject({
      globalHealthAreas: ['Neglected disease'],
      primaryDiseaseNames: ['Malaria'],
      productNames: ['Vaccine'],
      phaseNames: ['Phase 1'],
    });
    expect(screen.getByText(/single table/i)).toBeInTheDocument();
  });

  it('shows the R&D stage filter on the candidates tab only', () => {
    render(<TableBuilderTabs />);
    expect(screen.getByText('R&D stage')).toBeInTheDocument();
  });

  it('switches to the R&D-priorities-only tab via the extTab url param and uses its hook', () => {
    window.history.replaceState(null, '', '/?extTab=rd-only');
    render(<TableBuilderTabs />);
    const filter = hooks.useRdPriorities.mock.calls[0][0];
    expect(filter).toMatchObject({
      globalHealthAreas: ['Neglected disease'],
      primaryDiseaseNames: ['Malaria'],
    });
    // R&D-priorities tab exposes only GHA + Disease — no R&D stage filter.
    expect(screen.queryByText('R&D stage')).not.toBeInTheDocument();
  });
});
