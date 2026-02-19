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

  // Transform to simple array of disease group names for dropdowns
  const diseases = rawData.map(d => ({
    name: d.disease_group_name,
  }));

  return {
    diseases,
    loading: loading && !cachedData,
    error,
    raw: rawData,
    usingCache: !!cachedData,
  };
}
