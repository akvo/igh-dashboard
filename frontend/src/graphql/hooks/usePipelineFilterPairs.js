'use client';

import { useQuery } from '@apollo/client/react';
import { GET_PIPELINE_FILTER_PAIRS } from '../queries';
import { useDashboardStore } from '@/store';

const CACHE_KEY = 'pipelineFilterPairs';

export function usePipelineFilterPairs() {
  const { actions } = useDashboardStore();
  const cachedData = actions.getCachedData(CACHE_KEY);

  const { data, loading, error } = useQuery(GET_PIPELINE_FILTER_PAIRS, {
    skip: !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.pipelineFilterPairs) {
        actions.setCache(CACHE_KEY, result.pipelineFilterPairs);
      }
    },
  });

  const pairs = cachedData || data?.pipelineFilterPairs || [];

  return {
    pairs,
    loading: loading && !cachedData,
    error,
  };
}
