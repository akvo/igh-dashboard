'use client';

import { useQuery } from '@apollo/client/react';
import { GET_GLOBAL_HEALTH_AREA_SUMMARIES } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';
import { transformGlobalHealthAreaSummaries } from '@/lib/transformations';

export function useGlobalHealthAreaSummaries(
  candidateTypes,
  { globalHealthAreas, primaryDiseaseNames, secondaryDiseaseNames, phaseNames, productNames } = {},
) {
  const { actions } = useDashboardStore();
  const cacheKey = getCacheKey('globalHealthAreaSummaries', {
    candidateTypes, globalHealthAreas, primaryDiseaseNames, secondaryDiseaseNames, phaseNames, productNames,
  });
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_GLOBAL_HEALTH_AREA_SUMMARIES, {
    variables: {
      candidateTypes: candidateTypes && candidateTypes.length > 0 ? candidateTypes : undefined,
      globalHealthAreas: globalHealthAreas && globalHealthAreas.length > 0 ? globalHealthAreas : undefined,
      primaryDiseaseNames: primaryDiseaseNames && primaryDiseaseNames.length > 0 ? primaryDiseaseNames : undefined,
      secondaryDiseaseNames: secondaryDiseaseNames && secondaryDiseaseNames.length > 0 ? secondaryDiseaseNames : undefined,
      phaseNames: phaseNames && phaseNames.length > 0 ? phaseNames : undefined,
      productNames: productNames && productNames.length > 0 ? productNames : undefined,
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
