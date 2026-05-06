'use client';

import { useQuery } from '@apollo/client/react';
import { GET_SECONDARY_DISEASES } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';

export function useSecondaryDiseases() {
  const { actions } = useDashboardStore();
  const cacheKey = getCacheKey('secondaryDiseases');
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_SECONDARY_DISEASES, {
    skip: !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.secondaryDiseases) {
        actions.setCache(cacheKey, result.secondaryDiseases);
      }
    },
  });

  const rawData = cachedData || data?.secondaryDiseases || [];

  // Each row carries the parent primary disease alongside the
  // secondary, so consumers can build a parent->children map
  // without a second roundtrip. The simple `{ name }` projection is
  // preserved for components that just need a flat list of
  // secondaries; tree consumers should read `raw`.
  return {
    diseases: rawData.map(d => ({ name: d.secondary_disease_name })),
    loading: loading && !cachedData,
    error,
    raw: rawData,
    usingCache: !!cachedData,
  };
}
