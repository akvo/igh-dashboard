'use client';

import { useQuery } from '@apollo/client/react';
import { GET_PORTFOLIO_KPIS } from '../queries';
import { portfolioKPIsFixture } from '@/data/fixtures';
import { useDashboardStore } from '@/store';
import { transformPortfolioKPIs } from '@/lib/transformations';

const CACHE_KEY = 'portfolioKPIs';

export function usePortfolioKPIs() {
  const { cache, actions } = useDashboardStore();
  const cachedData = actions.getCachedData(CACHE_KEY);

  const { data, loading, error } = useQuery(GET_PORTFOLIO_KPIS, {
    skip: !!cachedData, // Skip fetch if we have fresh cached data
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.portfolioKPIs) {
        actions.setCache(CACHE_KEY, result.portfolioKPIs);
      }
    },
  });

  // Use cached data or fresh Apollo data
  const rawData = cachedData || data?.portfolioKPIs;
  const kpis = transformPortfolioKPIs(rawData);

  return {
    kpis,
    loading: loading && !cachedData,
    error,
    raw: rawData,
    usingCache: !!cachedData,
  };
}

// Hook with fixture fallback for development without backend
export function usePortfolioKPIsWithFallback() {
  const { kpis, loading, error, raw, usingCache } = usePortfolioKPIs();

  // Use fixture data if there's an error or no data
  if (error || (!loading && kpis.length === 0)) {
    const fixture = portfolioKPIsFixture.portfolioKPIs;
    return {
      kpis: transformPortfolioKPIs(fixture),
      loading: false,
      error: null,
      usingFixture: true,
      usingCache: false,
    };
  }

  return { kpis, loading, error, usingFixture: false, usingCache };
}
