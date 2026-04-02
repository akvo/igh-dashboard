'use client';

import { useQuery } from '@apollo/client/react';
import { GET_PHASES } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';
import { PHASE_CANONICAL_ORDER } from '@/lib/transformations/constants';

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

  // Sort phases by canonical R&D lifecycle order, falling back to
  // the backend's sort_order for phases not in the canonical map.
  const canonicalOrder = (name) => PHASE_CANONICAL_ORDER[name] ?? 500;

  const phases = rawData
    .map(p => ({
      key: p.phase_key,
      name: p.phase_name,
      sortOrder: p.sort_order,
    }))
    .sort((a, b) => canonicalOrder(a.name) - canonicalOrder(b.name)
                  || a.sortOrder - b.sortOrder);

  return {
    phases,
    loading: loading && !cachedData,
    error,
    raw: rawData,
    usingCache: !!cachedData,
  };
}
