'use client';

import { useQuery } from '@apollo/client/react';
import { GET_DISEASE_SUMMARIES } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';
import { transformDiseaseSummaries } from '@/lib/transformations';

const arr = (v) => (v && v.length > 0 ? v : undefined);

export function useDiseaseSummaries(
  candidateTypes,
  {
    skip = false,
    productNames,
    technologyTypes,
    globalHealthAreas,
    primaryDiseaseNames,
    secondaryDiseaseNames,
    phaseNames,
  } = {},
) {
  const { actions } = useDashboardStore();
  const cacheKey = getCacheKey('diseaseSummaries', {
    candidateTypes, productNames, technologyTypes,
    globalHealthAreas, primaryDiseaseNames, secondaryDiseaseNames, phaseNames,
  });
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_DISEASE_SUMMARIES, {
    variables: {
      candidateTypes: arr(candidateTypes),
      productNames: arr(productNames),
      technologyTypes: arr(technologyTypes),
      globalHealthAreas: arr(globalHealthAreas),
      primaryDiseaseNames: arr(primaryDiseaseNames),
      secondaryDiseaseNames: arr(secondaryDiseaseNames),
      phaseNames: arr(phaseNames),
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
