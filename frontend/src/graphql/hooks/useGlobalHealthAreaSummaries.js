'use client';

import { useQuery } from '@apollo/client/react';
import { GET_GLOBAL_HEALTH_AREA_SUMMARIES } from '../queries';
import { globalHealthAreaSummariesFixture } from '@/data/fixtures';

// Map API health area names to display names
const healthAreaDisplayNames = {
  'Neglected disease': 'Neglected diseases',
  'Sexual & reproductive health': "Women's health",
  'Emerging infectious disease': 'Emerging infectious diseases',
};

export function useGlobalHealthAreaSummaries() {
  const { data, loading, error } = useQuery(GET_GLOBAL_HEALTH_AREA_SUMMARIES);

  // Transform data for bubble chart
  const bubbleData = data?.globalHealthAreaSummaries?.map((item) => ({
    name: healthAreaDisplayNames[item.global_health_area] || item.global_health_area,
    value: item.candidateCount,
    diseaseCount: item.diseaseCount,
    productCount: item.productCount,
    originalName: item.global_health_area,
  })) || [];

  return {
    bubbleData,
    loading,
    error,
    raw: data?.globalHealthAreaSummaries,
  };
}

// Hook with fixture fallback
export function useGlobalHealthAreaSummariesWithFallback() {
  const { bubbleData, loading, error, raw } = useGlobalHealthAreaSummaries();

  if (error || (!loading && bubbleData.length === 0)) {
    const fixture = globalHealthAreaSummariesFixture.globalHealthAreaSummaries;
    return {
      bubbleData: fixture.map((item) => ({
        name: healthAreaDisplayNames[item.global_health_area] || item.global_health_area,
        value: item.candidateCount,
        diseaseCount: item.diseaseCount,
        productCount: item.productCount,
        originalName: item.global_health_area,
      })),
      loading: false,
      error: null,
      usingFixture: true,
    };
  }

  return { bubbleData, loading, error, usingFixture: false };
}
