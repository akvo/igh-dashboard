'use client';

import { useQuery } from '@apollo/client/react';
import { GET_GEOGRAPHIC_DISTRIBUTION } from '../queries';
import { geographicDistributionTrialsFixture, geographicDistributionDevFixture } from '@/data/fixtures';
import { useDashboardStore, getCacheKey } from '@/store';
import { transformGeographicDistribution } from '@/lib/transformations';

export function useGeographicDistribution(locationScope = 'Trial Location') {
  const { actions } = useDashboardStore();
  const cacheKey = getCacheKey('geographicDistribution', { locationScope });
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_GEOGRAPHIC_DISTRIBUTION, {
    variables: { scope: locationScope },
    skip: !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.geographicDistribution) {
        actions.setCache(cacheKey, result.geographicDistribution);
      }
    },
  });

  const rawData = cachedData || data?.geographicDistribution;
  const { mapData, distributionList } = transformGeographicDistribution(rawData);

  return {
    mapData,
    distributionList,
    loading: loading && !cachedData,
    error,
    raw: rawData,
    usingCache: !!cachedData,
  };
}

// Hook with fixture fallback
export function useGeographicDistributionWithFallback(locationScope = 'Trial Location') {
  const { mapData, distributionList, loading, error, raw, usingCache } = useGeographicDistribution(locationScope);

  if (error || (!loading && Object.keys(mapData).length === 0)) {
    // Select fixture based on location scope
    const fixtureData = locationScope === 'Developer Location'
      ? geographicDistributionDevFixture.geographicDistribution
      : geographicDistributionTrialsFixture.geographicDistribution;

    const transformed = transformGeographicDistribution(fixtureData);

    return {
      mapData: transformed.mapData,
      distributionList: transformed.distributionList,
      loading: false,
      error: null,
      usingFixture: true,
      usingCache: false,
    };
  }

  return { mapData, distributionList, loading, error, usingFixture: false, usingCache };
}
