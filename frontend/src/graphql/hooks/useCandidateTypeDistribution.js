'use client';

import { useQuery } from '@apollo/client/react';
import { GET_CANDIDATE_TYPE_DISTRIBUTION } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';
import { transformCandidateTypeDistribution } from '@/lib/transformations';

export function useCandidateTypeDistribution(
  productKeys,
  phaseNames,
  globalHealthAreas,
  primaryDiseaseNames,
  secondaryDiseaseNames,
) {
  const { actions } = useDashboardStore();
  const cacheKey = getCacheKey('candidateTypeDistribution', {
    productKeys,
    phaseNames,
    globalHealthAreas,
    primaryDiseaseNames,
    secondaryDiseaseNames,
  });
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_CANDIDATE_TYPE_DISTRIBUTION, {
    variables: {
      productKeys: productKeys && productKeys.length > 0 ? productKeys : undefined,
      phaseNames: phaseNames && phaseNames.length > 0 ? phaseNames : undefined,
      globalHealthAreas: globalHealthAreas && globalHealthAreas.length > 0 ? globalHealthAreas : undefined,
      primaryDiseaseNames: primaryDiseaseNames && primaryDiseaseNames.length > 0 ? primaryDiseaseNames : undefined,
      secondaryDiseaseNames: secondaryDiseaseNames && secondaryDiseaseNames.length > 0 ? secondaryDiseaseNames : undefined,
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
