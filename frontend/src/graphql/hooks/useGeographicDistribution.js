'use client';

import { useQuery } from '@apollo/client/react';
import { GET_GEOGRAPHIC_DISTRIBUTION } from '../queries';
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
    mapData: mapData || {},
    distributionList: distributionList || [],
    loading: loading && !cachedData,
    error,
    raw: rawData,
    usingCache: !!cachedData,
  };
}
