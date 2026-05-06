'use client';

import { useQuery } from '@apollo/client/react';
import { GET_DISEASES } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';

export function useDiseases() {
  const { actions } = useDashboardStore();
  const cacheKey = getCacheKey('diseases');
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_DISEASES, {
    skip: !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.diseases) {
        actions.setCache(cacheKey, result.diseases);
      }
    },
  });

  const rawData = cachedData || data?.diseases || [];

  // Transform to simple array shape used by dropdowns. The source
  // field is now `disease_filter` (authoritative primary disease
  // group); the consumer-facing `name` key is unchanged.
  const diseases = rawData.map(d => ({
    name: d.disease_filter,
  }));

  return {
    diseases,
    loading: loading && !cachedData,
    error,
    raw: rawData,
    usingCache: !!cachedData,
  };
}
