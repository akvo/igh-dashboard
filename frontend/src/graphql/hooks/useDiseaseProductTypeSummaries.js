'use client';

import { useQuery } from '@apollo/client/react';
import { GET_DISEASE_PRODUCT_TYPE_SUMMARIES } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';
import { transformDiseaseProductTypeSummaries } from '@/lib/transformations';

export function useDiseaseProductTypeSummaries(candidateTypes, { skip = false } = {}) {
  const { actions } = useDashboardStore();
  const cacheKey = getCacheKey('diseaseProductTypeSummaries', { candidateTypes });
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_DISEASE_PRODUCT_TYPE_SUMMARIES, {
    variables: {
      candidateTypes: candidateTypes && candidateTypes.length > 0 ? candidateTypes : undefined,
    },
    skip: skip || !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.diseaseProductTypeSummaries) {
        actions.setCache(cacheKey, result.diseaseProductTypeSummaries);
      }
    },
  });

  const rawData = cachedData || data?.diseaseProductTypeSummaries;
  const bubbleData = transformDiseaseProductTypeSummaries(rawData);

  return {
    bubbleData: bubbleData || [],
    loading: loading && !cachedData,
    error,
    raw: rawData,
    usingCache: !!cachedData,
  };
}
