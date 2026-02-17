'use client';

import { useQuery } from '@apollo/client/react';
import { GET_CANDIDATE_TYPE_DISTRIBUTION } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';
import { transformCandidateTypeDistribution } from '@/lib/transformations';

export function useCandidateTypeDistribution(productKeys, phaseNames) {
  const { actions } = useDashboardStore();
  const cacheKey = getCacheKey('candidateTypeDistribution', { productKeys, phaseNames });
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_CANDIDATE_TYPE_DISTRIBUTION, {
    variables: {
      productKeys: productKeys && productKeys.length > 0 ? productKeys : undefined,
      phaseNames: phaseNames && phaseNames.length > 0 ? phaseNames : undefined,
    },
    skip: !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.candidateTypeDistribution) {
        actions.setCache(cacheKey, result.candidateTypeDistribution);
      }
    },
  });

  const rawData = cachedData || data?.candidateTypeDistribution;
  const { chartData, segments } = transformCandidateTypeDistribution(rawData);

  return {
    chartData: chartData || [],
    segments: segments || [],
    loading: loading && !cachedData,
    error,
    raw: rawData,
    usingCache: !!cachedData,
  };
}
