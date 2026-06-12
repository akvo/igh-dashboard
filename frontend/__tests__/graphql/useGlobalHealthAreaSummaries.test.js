import { describe, it, expect, vi, beforeEach } from 'vitest';

const useQueryMock = vi.fn(() => ({ data: undefined, loading: false, error: undefined }));
vi.mock('@apollo/client/react', () => ({ useQuery: (...a) => useQueryMock(...a) }));
vi.mock('@/store', () => ({
  useDashboardStore: () => ({ actions: { getCachedData: () => undefined, setCache: () => {} } }),
  getCacheKey: (name, params) => `${name}:${JSON.stringify(params)}`,
}));
vi.mock('@/lib/transformations', () => ({ transformGlobalHealthAreaSummaries: () => [] }));

import { useGlobalHealthAreaSummaries } from '@/graphql/hooks/useGlobalHealthAreaSummaries';

describe('useGlobalHealthAreaSummaries global filters', () => {
  beforeEach(() => useQueryMock.mockClear());

  it('passes global filters as query variables', () => {
    useGlobalHealthAreaSummaries(['Candidate'], {
      globalHealthAreas: ['Neglected disease'],
      primaryDiseaseNames: ['Malaria'],
      phaseNames: ['Phase 1'],
    });
    const variables = useQueryMock.mock.calls[0][1].variables;
    expect(variables.globalHealthAreas).toEqual(['Neglected disease']);
    expect(variables.primaryDiseaseNames).toEqual(['Malaria']);
    expect(variables.phaseNames).toEqual(['Phase 1']);
  });

  it('omits empty arrays (sends undefined)', () => {
    useGlobalHealthAreaSummaries(['Candidate'], { globalHealthAreas: [] });
    const variables = useQueryMock.mock.calls[0][1].variables;
    expect(variables.globalHealthAreas).toBeUndefined();
  });
});
