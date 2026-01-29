'use client';

import { useQuery } from '@apollo/client/react';
import { GET_TEMPORAL_SNAPSHOTS } from '../queries';
import { temporalSnapshotsFixture } from '@/data/fixtures';
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
    chartData,
    phases,
    loading: loading && !cachedData,
    error,
    raw: rawData,
    usingCache: !!cachedData,
  };
}

// Hook with fixture fallback
export function useTemporalSnapshotsWithFallback(years) {
  const { chartData, phases, loading, error, raw, usingCache } = useTemporalSnapshots(years);

  if (error || (!loading && chartData.length === 0)) {
    let fixture = temporalSnapshotsFixture.temporalSnapshots;

    // Filter by years if provided
    if (years && years.length > 0) {
      fixture = fixture.filter(item => years.includes(item.year));
    }

    const transformed = transformTemporalSnapshots(fixture);
    return {
      ...transformed,
      loading: false,
      error: null,
      usingFixture: true,
      usingCache: false,
    };
  }

  return { chartData, phases, loading, error, usingFixture: false, usingCache };
}
