'use client';

import { useQuery } from '@apollo/client/react';
import { GET_PORTFOLIO_KPIS } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';
import { transformPortfolioKPIs } from '@/lib/transformations';

export function usePortfolioKPIs(globalHealthAreas, diseaseNames, productNames) {
  const { actions } = useDashboardStore();
  const cacheKey = getCacheKey('portfolioKPIs', { globalHealthAreas, diseaseNames, productNames });
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_PORTFOLIO_KPIS, {
    variables: {
      globalHealthAreas: globalHealthAreas?.length > 0 ? globalHealthAreas : undefined,
      diseaseNames: diseaseNames?.length > 0 ? diseaseNames : undefined,
      productNames: productNames?.length > 0 ? productNames : undefined,
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
