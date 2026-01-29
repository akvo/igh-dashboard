'use client';

import { useQuery } from '@apollo/client/react';
import { GET_PORTFOLIO_KPIS } from '../queries';
import { useDashboardStore } from '@/store';
import { transformPortfolioKPIs } from '@/lib/transformations';

const CACHE_KEY = 'portfolioKPIs';

export function usePortfolioKPIs() {
  const { actions } = useDashboardStore();
  const cachedData = actions.getCachedData(CACHE_KEY);

  const { data, loading, error } = useQuery(GET_PORTFOLIO_KPIS, {
    skip: !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.portfolioKPIs) {
        actions.setCache(CACHE_KEY, result.portfolioKPIs);
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

// Alias for consistency (no fallback data)
export function usePortfolioKPIsWithFallback() {
  return usePortfolioKPIs();
}
