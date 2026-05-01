'use client';

import { useQuery } from '@apollo/client/react';
import { GET_GHA_PRODUCT_TYPE_SUMMARIES } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';
import { transformGhaProductTypeSummaries } from '@/lib/transformations';

export function useGhaProductTypeSummaries(candidateTypes, { skip = false } = {}) {
  const { actions } = useDashboardStore();
  const cacheKey = getCacheKey('ghaProductTypeSummaries', { candidateTypes });
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_GHA_PRODUCT_TYPE_SUMMARIES, {
    variables: {
      candidateTypes: candidateTypes && candidateTypes.length > 0 ? candidateTypes : undefined,
    },
    skip: skip || !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.ghaProductTypeSummaries) {
        actions.setCache(cacheKey, result.ghaProductTypeSummaries);
      }
    },
  });

  const rawData = cachedData || data?.ghaProductTypeSummaries;
  const bubbleData = transformGhaProductTypeSummaries(rawData);

  return {
    bubbleData: bubbleData || [],
    loading: loading && !cachedData,
    error,
    raw: rawData,
    usingCache: !!cachedData,
  };
}
