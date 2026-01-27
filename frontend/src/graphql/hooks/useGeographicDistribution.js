'use client';

import { useQuery } from '@apollo/client/react';
import { GET_GEOGRAPHIC_DISTRIBUTION } from '../queries';
import { geographicDistributionTrialsFixture } from '@/data/fixtures';

export function useGeographicDistribution(locationScope = 'Trial Location') {
  const { data, loading, error } = useQuery(GET_GEOGRAPHIC_DISTRIBUTION, {
    variables: { scope: locationScope },
  });

  // Transform to map format: { iso_code: candidateCount }
  const mapData = data?.geographicDistribution?.reduce((acc, item) => {
    if (item.iso_code) {
      acc[item.iso_code] = item.candidateCount;
    }
    return acc;
  }, {}) || {};

  // Also provide array format for other uses
  const distributionList = data?.geographicDistribution || [];

  return {
    mapData,
    distributionList,
    loading,
    error,
    raw: data?.geographicDistribution,
  };
}

// Hook with fixture fallback
export function useGeographicDistributionWithFallback(locationScope = 'Trial Location') {
  const { mapData, distributionList, loading, error, raw } = useGeographicDistribution(locationScope);

  if (error || (!loading && Object.keys(mapData).length === 0)) {
    const fixture = geographicDistributionTrialsFixture.geographicDistribution;
    const fixtureMapData = fixture.reduce((acc, item) => {
      if (item.iso_code) {
        acc[item.iso_code] = item.candidateCount;
      }
      return acc;
    }, {});

    return {
      mapData: fixtureMapData,
      distributionList: fixture,
      loading: false,
      error: null,
      usingFixture: true,
    };
  }

  return { mapData, distributionList, loading, error, usingFixture: false };
}
