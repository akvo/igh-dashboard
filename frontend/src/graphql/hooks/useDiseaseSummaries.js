'use client';

import { useQuery } from '@apollo/client/react';
import { GET_DISEASE_SUMMARIES } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';
import { transformDiseaseSummaries } from '@/lib/transformations';

export function useDiseaseSummaries(candidateTypes, { skip = false, productNames, technologyTypes } = {}) {
  const { actions } = useDashboardStore();
  const cacheKey = getCacheKey('diseaseSummaries', { candidateTypes, productNames, technologyTypes });
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_DISEASE_SUMMARIES, {
    variables: {
      candidateTypes: candidateTypes && candidateTypes.length > 0 ? candidateTypes : undefined,
      productNames: productNames && productNames.length > 0 ? productNames : undefined,
      technologyTypes: technologyTypes && technologyTypes.length > 0 ? technologyTypes : undefined,
    },
    skip: skip || !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.diseaseSummaries) {
        actions.setCache(cacheKey, result.diseaseSummaries);
      }
    },
  });

  const rawData = cachedData || data?.diseaseSummaries;
  const bubbleData = transformDiseaseSummaries(rawData);

  return {
    bubbleData: bubbleData || [],
    loading: loading && !cachedData,
    error,
    raw: rawData,
    usingCache: !!cachedData,
  };
}
