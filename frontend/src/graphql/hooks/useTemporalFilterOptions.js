'use client';

import { useQuery } from '@apollo/client/react';
import { GET_TEMPORAL_FILTER_OPTIONS } from '../queries';
import { useDashboardStore } from '@/store';

const CACHE_KEY = 'temporalFilterOptions';

export function useTemporalFilterOptions() {
  const { actions } = useDashboardStore();
  const cachedData = actions.getCachedData(CACHE_KEY);

  const { data, loading, error } = useQuery(GET_TEMPORAL_FILTER_OPTIONS, {
    skip: !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.temporalFilterOptions) {
        actions.setCache(CACHE_KEY, result.temporalFilterOptions);
      }
    },
  });

  const pairs = cachedData || data?.temporalFilterOptions || [];

  return {
    pairs,
    loading: loading && !cachedData,
    error,
  };
}
