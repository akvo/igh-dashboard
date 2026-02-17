'use client';

import { useQuery } from '@apollo/client/react';
import { GET_AVAILABLE_YEARS } from '../queries';
import { useDashboardStore } from '@/store';

const CACHE_KEY = 'availableYears';

export function useAvailableYears() {
  const { actions } = useDashboardStore();
  const cachedData = actions.getCachedData(CACHE_KEY);

  const { data, loading, error } = useQuery(GET_AVAILABLE_YEARS, {
    skip: !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.availableYears) {
        actions.setCache(CACHE_KEY, result.availableYears);
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
