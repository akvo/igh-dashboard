'use client';

import { useQuery } from '@apollo/client/react';
import { GET_TEMPORAL_SNAPSHOTS } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';
import { transformTemporalSnapshots } from '@/lib/transformations';

export function useTemporalSnapshots(years, globalHealthAreas, productKeys, primaryDiseaseNames, secondaryDiseaseNames) {
  const { actions } = useDashboardStore();

  const hasFilters = (years?.length > 0) || (globalHealthAreas?.length > 0) || (productKeys?.length > 0) || (primaryDiseaseNames?.length > 0) || (secondaryDiseaseNames?.length > 0);
  const cacheKey = getCacheKey('temporalSnapshots', { years, globalHealthAreas, productKeys, primaryDiseaseNames, secondaryDiseaseNames });
  const cachedData = hasFilters ? null : actions.getCachedData(cacheKey);

  const { data, loading, error, refetch } = useQuery(GET_TEMPORAL_SNAPSHOTS, {
    variables: {
      years: years?.length > 0 ? years : undefined,
      primaryDiseaseNames: primaryDiseaseNames?.length > 0 ? primaryDiseaseNames : undefined,
      secondaryDiseaseNames: secondaryDiseaseNames?.length > 0 ? secondaryDiseaseNames : undefined,
      globalHealthAreas: globalHealthAreas?.length > 0 ? globalHealthAreas : undefined,
      productKeys: productKeys?.length > 0 ? productKeys : undefined,
    },
    skip: !!cachedData,
    fetchPolicy: hasFilters ? 'network-only' : 'cache-first',
    onCompleted: (result) => {
      if (result?.temporalSnapshots && !hasFilters) {
        actions.setCache(cacheKey, result.temporalSnapshots);
      }
    },
  });

  const rawData = cachedData || data?.temporalSnapshots;
  const { chartData, phases } = transformTemporalSnapshots(rawData);

  return {
    chartData: chartData || [],
    phases: phases || [],
    loading: loading && !cachedData,
    error,
    raw: rawData,
    usingCache: !!cachedData,
    refetch,
  };
}
