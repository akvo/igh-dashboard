'use client';

import { useQuery } from '@apollo/client/react';
import { GET_TEMPORAL_SNAPSHOTS } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';
import { transformTemporalSnapshots } from '@/lib/transformations';

export function useTemporalSnapshots(years) {
  const { actions } = useDashboardStore();
  const cacheKey = getCacheKey('temporalSnapshots', { years });
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_TEMPORAL_SNAPSHOTS, {
    variables: { years: years?.length > 0 ? years : undefined },
    skip: !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.temporalSnapshots) {
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
  };
}

// Alias for consistency (no fallback data)
export function useTemporalSnapshotsWithFallback(years) {
  return useTemporalSnapshots(years);
}
