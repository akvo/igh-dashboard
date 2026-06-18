'use client';

import { useQuery } from '@apollo/client/react';
import { GET_DISEASE_PRODUCT_TYPE_SUMMARIES } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';
import { transformDiseaseProductTypeSummaries } from '@/lib/transformations';

export function useDiseaseProductTypeSummaries(
  candidateTypes,
  {
    skip = false,
    globalHealthAreas,
    primaryDiseaseNames,
    secondaryDiseaseNames,
    productNames,
    phaseNames,
  } = {},
) {
  const { actions } = useDashboardStore();
  const cacheKey = getCacheKey('diseaseProductTypeSummaries', {
    candidateTypes, globalHealthAreas, primaryDiseaseNames, secondaryDiseaseNames, productNames, phaseNames,
  });
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_DISEASE_PRODUCT_TYPE_SUMMARIES, {
    variables: {
      candidateTypes: candidateTypes && candidateTypes.length > 0 ? candidateTypes : undefined,
      globalHealthAreas: globalHealthAreas && globalHealthAreas.length > 0 ? globalHealthAreas : undefined,
      primaryDiseaseNames: primaryDiseaseNames && primaryDiseaseNames.length > 0 ? primaryDiseaseNames : undefined,
      secondaryDiseaseNames: secondaryDiseaseNames && secondaryDiseaseNames.length > 0 ? secondaryDiseaseNames : undefined,
      productNames: productNames && productNames.length > 0 ? productNames : undefined,
      phaseNames: phaseNames && phaseNames.length > 0 ? phaseNames : undefined,
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
