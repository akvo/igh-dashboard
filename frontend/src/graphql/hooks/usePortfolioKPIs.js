'use client';

import { useQuery } from '@apollo/client/react';
import { GET_PORTFOLIO_KPIS } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';
import { transformPortfolioKPIs } from '@/lib/transformations';

export function usePortfolioKPIs(globalHealthAreas, primaryDiseaseNames, secondaryDiseaseNames, productNames, phaseNames) {
  const { actions } = useDashboardStore();
  const cacheKey = getCacheKey('portfolioKPIs', { globalHealthAreas, primaryDiseaseNames, secondaryDiseaseNames, productNames, phaseNames });
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_PORTFOLIO_KPIS, {
    variables: {
      globalHealthAreas: globalHealthAreas?.length > 0 ? globalHealthAreas : undefined,
      primaryDiseaseNames: primaryDiseaseNames?.length > 0 ? primaryDiseaseNames : undefined,
      secondaryDiseaseNames: secondaryDiseaseNames?.length > 0 ? secondaryDiseaseNames : undefined,
      productNames: productNames?.length > 0 ? productNames : undefined,
      phaseNames: phaseNames?.length > 0 ? phaseNames : undefined,
    },
    skip: !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.portfolioKPIs) {
        actions.setCache(cacheKey, result.portfolioKPIs);
      }
    },
  });

  const rawData = cachedData || data?.portfolioKPIs;
  const kpis = transformPortfolioKPIs(rawData);

  return {
    kpis: kpis || [],
    loading: loading && !cachedData,
    error,
    raw: rawData,
    usingCache: !!cachedData,
  };
}
