'use client';

import { useQuery } from '@apollo/client/react';
import { GET_PORTFOLIO_KPIS } from '../queries';
import { portfolioKPIsFixture } from '@/data/fixtures';

export function usePortfolioKPIs() {
  const { data, loading, error } = useQuery(GET_PORTFOLIO_KPIS);

  // Transform data for UI
  const kpis = data?.portfolioKPIs
    ? [
        {
          id: 'diseases',
          title: 'Number of diseases',
          value: data.portfolioKPIs.totalDiseases,
          description: 'Total number of diseases',
          buttonText: 'Explore pipeline for diseases',
        },
        {
          id: 'candidates',
          title: 'Total number of candidates',
          value: data.portfolioKPIs.totalCandidates,
          description: 'Total number of candidates.',
          buttonText: 'Explore candidates',
        },
        {
          id: 'approved',
          title: 'Approved products',
          value: data.portfolioKPIs.approvedProducts,
          description: 'Total number of approved products.',
          buttonText: 'Explore approved products',
        },
      ]
    : [];

  return {
    kpis,
    loading,
    error,
    raw: data?.portfolioKPIs,
  };
}

// Hook with fixture fallback for development without backend
export function usePortfolioKPIsWithFallback() {
  const { kpis, loading, error, raw } = usePortfolioKPIs();

  // Use fixture data if there's an error or no data
  if (error || (!loading && kpis.length === 0)) {
    const fixture = portfolioKPIsFixture.portfolioKPIs;
    return {
      kpis: [
        {
          id: 'diseases',
          title: 'Number of diseases',
          value: fixture.totalDiseases,
          description: 'Total number of diseases',
          buttonText: 'Explore pipeline for diseases',
        },
        {
          id: 'candidates',
          title: 'Total number of candidates',
          value: fixture.totalCandidates,
          description: 'Total number of candidates.',
          buttonText: 'Explore candidates',
        },
        {
          id: 'approved',
          title: 'Approved products',
          value: fixture.approvedProducts,
          description: 'Total number of approved products.',
          buttonText: 'Explore approved products',
        },
      ],
      loading: false,
      error: null,
      usingFixture: true,
    };
  }

  return { kpis, loading, error, usingFixture: false };
}
