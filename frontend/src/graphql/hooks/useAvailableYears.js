'use client';

import { useQuery } from '@apollo/client/react';
import { GET_AVAILABLE_YEARS } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';

export function useAvailableYears() {
  const { actions } = useDashboardStore();
  const cacheKey = getCacheKey('availableYears');
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_AVAILABLE_YEARS, {
    skip: !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.availableYears) {
        actions.setCache(cacheKey, result.availableYears);
      }
    },
  });

  const years = cachedData || data?.availableYears || [];

  return {
    years,
    loading: loading && !cachedData,
    error,
    usingCache: !!cachedData,
  };
}
