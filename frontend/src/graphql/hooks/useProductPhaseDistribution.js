'use client';

import { useQuery } from '@apollo/client/react';
import { GET_PRODUCT_PHASE_DISTRIBUTION } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';
import { transformProductPhaseDistribution } from '@/lib/transformations';

export function useProductPhaseDistribution(globalHealthAreas, primaryDiseaseNames, secondaryDiseaseNames, productNames, phaseNames, candidateType) {
  const { actions } = useDashboardStore();
  const cacheKey = getCacheKey('productPhaseDistribution', { globalHealthAreas, primaryDiseaseNames, secondaryDiseaseNames, productNames, phaseNames, candidateType });
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_PRODUCT_PHASE_DISTRIBUTION, {
    variables: {
      globalHealthAreas: globalHealthAreas && globalHealthAreas.length > 0 ? globalHealthAreas : undefined,
      primaryDiseaseNames: primaryDiseaseNames && primaryDiseaseNames.length > 0 ? primaryDiseaseNames : undefined,
      secondaryDiseaseNames: secondaryDiseaseNames && secondaryDiseaseNames.length > 0 ? secondaryDiseaseNames : undefined,
      productNames: productNames && productNames.length > 0 ? productNames : undefined,
      phaseNames: phaseNames && phaseNames.length > 0 ? phaseNames : undefined,
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
