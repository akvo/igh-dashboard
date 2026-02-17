'use client';

import { useQuery } from '@apollo/client/react';
import { GET_TEMPORAL_SNAPSHOTS } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';
import { transformTemporalSnapshots } from '@/lib/transformations';

export function useTemporalSnapshots(years, diseaseKey) {
  const { actions } = useDashboardStore();

  // Only use cache when no filters are applied
  const hasFilters = (years?.length > 0) || diseaseKey;
  const cacheKey = getCacheKey('temporalSnapshots', { years, diseaseKey });
  const cachedData = hasFilters ? null : actions.getCachedData(cacheKey);

  const { data, loading, error, refetch } = useQuery(GET_TEMPORAL_SNAPSHOTS, {
    variables: {
      years: years?.length > 0 ? years : undefined,
      diseaseKey: diseaseKey || undefined,
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
