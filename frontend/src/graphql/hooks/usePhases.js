'use client';

import { useQuery } from '@apollo/client/react';
import { GET_PHASES } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';

export function usePhases() {
  const { actions } = useDashboardStore();
  const cacheKey = getCacheKey('phases');
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_PHASES, {
    skip: !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.phases) {
        actions.setCache(cacheKey, result.phases);
      }
    },
  });

  const rawData = cachedData || data?.phases || [];

  const phases = rawData.map(p => ({
    key: p.phase_key,
    name: p.phase_name,
    sortOrder: p.sort_order,
  }));

  return {
    phases,
    loading: loading && !cachedData,
    error,
    raw: rawData,
    usingCache: !!cachedData,
  };
}
