'use client';

import { useQuery } from '@apollo/client/react';
import { GET_GLOBAL_HEALTH_AREA_SUMMARIES } from '../queries';
import { globalHealthAreaSummariesFixture } from '@/data/fixtures';
import { useDashboardStore } from '@/store';
import { transformGlobalHealthAreaSummaries } from '@/lib/transformations';

const CACHE_KEY = 'globalHealthAreaSummaries';

export function useGlobalHealthAreaSummaries() {
  const { actions } = useDashboardStore();
  const cachedData = actions.getCachedData(CACHE_KEY);

  const { data, loading, error } = useQuery(GET_GLOBAL_HEALTH_AREA_SUMMARIES, {
    skip: !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.globalHealthAreaSummaries) {
        actions.setCache(CACHE_KEY, result.globalHealthAreaSummaries);
      }
    },
  });

  const rawData = cachedData || data?.globalHealthAreaSummaries;
  const bubbleData = transformGlobalHealthAreaSummaries(rawData);

  return {
    bubbleData,
    loading: loading && !cachedData,
    error,
    raw: rawData,
    usingCache: !!cachedData,
  };
}

// Hook with fixture fallback
export function useGlobalHealthAreaSummariesWithFallback() {
  const { bubbleData, loading, error, raw, usingCache } = useGlobalHealthAreaSummaries();

  if (error || (!loading && bubbleData.length === 0)) {
    const fixture = globalHealthAreaSummariesFixture.globalHealthAreaSummaries;
    return {
      bubbleData: transformGlobalHealthAreaSummaries(fixture),
      loading: false,
      error: null,
      usingFixture: true,
      usingCache: false,
    };
  }

  return { bubbleData, loading, error, usingFixture: false, usingCache };
}
