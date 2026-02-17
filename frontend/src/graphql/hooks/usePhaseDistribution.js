'use client';

import { useQuery } from '@apollo/client/react';
import { GET_PHASE_DISTRIBUTION } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';
import { transformPhaseDistribution } from '@/lib/transformations';

export function usePhaseDistribution(globalHealthArea, productKeys, candidateType) {
  const { actions } = useDashboardStore();
  const cacheKey = getCacheKey('phaseDistribution', { globalHealthArea, productKeys, candidateType });
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_PHASE_DISTRIBUTION, {
    variables: {
      globalHealthArea: globalHealthArea || undefined,
      productKeys: productKeys && productKeys.length > 0 ? productKeys : undefined,
      candidateType: candidateType || undefined,
    },
    skip: !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.phaseDistribution) {
        actions.setCache(cacheKey, result.phaseDistribution);
      }
    },
  });

  const rawData = cachedData || data?.phaseDistribution;
  const { chartData, phases } = transformPhaseDistribution(rawData);

  return {
    chartData: chartData || [],
    phases: phases || [],
    loading: loading && !cachedData,
    error,
    raw: rawData,
    usingCache: !!cachedData,
  };
}
