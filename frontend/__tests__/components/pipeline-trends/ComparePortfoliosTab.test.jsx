// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render } from '@testing-library/react';

// Spy on HierarchicalProductFilter so we can assert the tab renders it with
// the by-key group members (instead of the old flat Dropdown). Rendering a
// marker avoids portal/DOM interaction.
const hpfSpy = vi.hoisted(() => vi.fn(() => null));
vi.mock('@/components/filters/HierarchicalProductFilter', () => ({ default: hpfSpy }));

// The compare tab fetches via usePortfolioComparison and renders an
// Apollo-backed DataTable; stub both so the tab renders standalone.
vi.mock('@/graphql/hooks', () => ({
  usePortfolioComparison: () => ({ results: [], loading: false }),
  usePipelineFilterPairs: () => ({ pairs: [] }),
  useTemporalSnapshots: () => ({ chartData: [], phases: [], loading: false }),
}));
vi.mock('@/components/ui', async (importActual) => ({
  ...(await importActual()),
  DataTable: () => null,
}));
// The compare tab renders charts we don't care about here; stub the chart
// module so an empty-data render can't throw and distract from the assertion.
vi.mock('@/components/charts', () => ({
  StackedBarChart: () => null,
  GroupedBarChart: () => null,
  ChartEmptyState: () => null,
  ChartLegend: () => null,
}));

import { ComparePortfoliosTab } from '@/app/pipeline-trends/TemporalTrendsSection';

// By-key options: value = product_key string, label = product name. Two of
// them are VCP members (keys '35' and '58').
const PRODUCT_OPTIONS = [
  { value: '30', label: 'Drugs' },
  { value: '35', label: 'Chemical vector control products' },
  { value: '58', label: 'Vector control products' },
];
const GROUP_MEMBERS = ['35', '58'];

describe('ComparePortfoliosTab product filter', () => {
  beforeEach(() => {
    hpfSpy.mockClear();
    window.history.replaceState(null, '', '/');
  });

  it('renders HierarchicalProductFilter with by-key VCP group members', () => {
    render(
      <ComparePortfoliosTab
        narrowedHierarchy={[]}
        productOptions={PRODUCT_OPTIONS}
        productGroupMembers={GROUP_MEMBERS}
        yearOptions={[]}
        filterPairs={[]}
      />,
    );
    expect(hpfSpy).toHaveBeenCalled();
    const props = hpfSpy.mock.calls[0][0];
    expect(props.label).toBe('Product type');
    expect(props.groupMembers).toEqual(GROUP_MEMBERS);
    expect(props.options).toEqual(PRODUCT_OPTIONS); // no disease selected → falls back to productOptions
    expect(props.selected).toEqual([]); // empty portfolio
  });
});
