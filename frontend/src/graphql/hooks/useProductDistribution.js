'use client';

import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';
import { GET_PRODUCT_DISTRIBUTION } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';

export function useProductDistribution(globalHealthAreas, primaryDiseaseNames, secondaryDiseaseNames, productNames, phaseNames, candidateType) {
  const { actions } = useDashboardStore();
  const cacheKey = getCacheKey('productDistribution', { globalHealthAreas, primaryDiseaseNames, secondaryDiseaseNames, productNames, phaseNames, candidateType });
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_PRODUCT_DISTRIBUTION, {
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
      if (result?.productDistribution) {
        actions.setCache(cacheKey, result.productDistribution);
      }
    },
  });

  const rawData = cachedData || data?.productDistribution || [];

  const chartData = useMemo(() =>
    rawData.map(row => ({ name: row.product_name, value: row.candidateCount })),
    [rawData]
  );

  return {
    chartData,
    loading: loading && !cachedData,
    error,
    usingCache: !!cachedData,
  };
}
