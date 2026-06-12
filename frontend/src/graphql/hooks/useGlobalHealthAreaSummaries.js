'use client';

import { useQuery } from '@apollo/client/react';
import { GET_GLOBAL_HEALTH_AREA_SUMMARIES } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';
import { transformGlobalHealthAreaSummaries } from '@/lib/transformations';

const arr = (v) => (v && v.length > 0 ? v : undefined);

export function useGlobalHealthAreaSummaries(
  candidateTypes,
  { globalHealthAreas, primaryDiseaseNames, secondaryDiseaseNames, phaseNames } = {},
) {
  const { actions } = useDashboardStore();
  const cacheKey = getCacheKey('globalHealthAreaSummaries', {
    candidateTypes, globalHealthAreas, primaryDiseaseNames, secondaryDiseaseNames, phaseNames,
  });
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_GLOBAL_HEALTH_AREA_SUMMARIES, {
    variables: {
      candidateTypes: arr(candidateTypes),
      globalHealthAreas: arr(globalHealthAreas),
      primaryDiseaseNames: arr(primaryDiseaseNames),
      secondaryDiseaseNames: arr(secondaryDiseaseNames),
      phaseNames: arr(phaseNames),
    },
    skip: !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.globalHealthAreaSummaries) {
        actions.setCache(cacheKey, result.globalHealthAreaSummaries);
      }
    },
  });

  const rawData = cachedData || data?.globalHealthAreaSummaries;
  const bubbleData = transformGlobalHealthAreaSummaries(rawData);

  return {
    bubbleData: bubbleData || [],
    loading: loading && !cachedData,
    error,
    raw: rawData,
    usingCache: !!cachedData,
  };
}
