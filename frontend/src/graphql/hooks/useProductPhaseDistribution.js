'use client';

import { useQuery } from '@apollo/client/react';
import { GET_PRODUCT_PHASE_DISTRIBUTION } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';
import { transformProductPhaseDistribution } from '@/lib/transformations';

export function useProductPhaseDistribution(globalHealthArea, diseaseKey, candidateType) {
  const { actions } = useDashboardStore();
  const cacheKey = getCacheKey('productPhaseDistribution', { globalHealthArea, diseaseKey, candidateType });
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_PRODUCT_PHASE_DISTRIBUTION, {
    variables: {
      globalHealthArea: globalHealthArea || undefined,
      diseaseKey: diseaseKey || undefined,
      candidateType: candidateType || undefined,
    },
    skip: !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.productPhaseDistribution) {
        actions.setCache(cacheKey, result.productPhaseDistribution);
      }
    },
  });

  const rawData = cachedData || data?.productPhaseDistribution;
  const { chartData, phases } = transformProductPhaseDistribution(rawData);

  return {
    chartData: chartData || [],
    phases: phases || [],
    loading: loading && !cachedData,
    error,
    raw: rawData,
    usingCache: !!cachedData,
  };
}
