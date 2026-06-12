import { describe, it, expect, vi, beforeEach } from 'vitest';

const useQueryMock = vi.fn(() => ({ data: undefined, loading: false, error: undefined }));
vi.mock('@apollo/client/react', () => ({ useQuery: (...a) => useQueryMock(...a) }));
vi.mock('@/store', () => ({
  useDashboardStore: () => ({ actions: { getCachedData: () => undefined, setCache: () => {} } }),
  getCacheKey: (name, params) => `${name}:${JSON.stringify(params)}`,
}));
vi.mock('@/lib/transformations', () => ({ transformDiseaseSummaries: () => [] }));

import { useDiseaseSummaries } from '@/graphql/hooks/useDiseaseSummaries';

describe('useDiseaseSummaries global filters', () => {
  beforeEach(() => useQueryMock.mockClear());

  it('passes global filters as query variables', () => {
    useDiseaseSummaries(['Candidate'], {
      globalHealthAreas: ['Neglected disease'],
      secondaryDiseaseNames: ['P. falciparum'],
      phaseNames: ['Phase 2'],
    });
    const variables = useQueryMock.mock.calls[0][1].variables;
    expect(variables.globalHealthAreas).toEqual(['Neglected disease']);
    expect(variables.secondaryDiseaseNames).toEqual(['P. falciparum']);
    expect(variables.phaseNames).toEqual(['Phase 2']);
  });

  it('still supports the existing productNames/technologyTypes options', () => {
    useDiseaseSummaries(null, { productNames: ['Vaccine'], technologyTypes: ['mRNA'] });
    const variables = useQueryMock.mock.calls[0][1].variables;
    expect(variables.productNames).toEqual(['Vaccine']);
    expect(variables.technologyTypes).toEqual(['mRNA']);
  });
});
