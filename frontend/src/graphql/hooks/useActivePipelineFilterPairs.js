'use client';

import { useQuery } from '@apollo/client/react';
import { GET_ACTIVE_PIPELINE_FILTER_PAIRS } from '../queries';
import { useDashboardStore } from '@/store';

const CACHE_KEY = 'activePipelineFilterPairs';

export function useActivePipelineFilterPairs() {
  const { actions } = useDashboardStore();
  const cachedData = actions.getCachedData(CACHE_KEY);

  const { data, loading, error } = useQuery(GET_ACTIVE_PIPELINE_FILTER_PAIRS, {
    skip: !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.activePipelineFilterPairs) {
        actions.setCache(CACHE_KEY, result.activePipelineFilterPairs);
      }
    },
  });

  const pairs = cachedData || data?.activePipelineFilterPairs || [];

  return {
    pairs,
    loading: loading && !cachedData,
    error,
  };
}
