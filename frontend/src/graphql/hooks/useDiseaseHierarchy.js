'use client';

import { useQuery } from '@apollo/client/react';
import { GET_DISEASE_HIERARCHY } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';

export function useDiseaseHierarchy() {
  const { actions } = useDashboardStore();
  const cacheKey = getCacheKey('diseaseHierarchy');
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_DISEASE_HIERARCHY, {
    skip: !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.diseaseHierarchy) {
        actions.setCache(cacheKey, result.diseaseHierarchy);
      }
    },
  });

  const rawData = cachedData || data?.diseaseHierarchy || [];

  return {
    hierarchy: rawData,
    loading: loading && !cachedData,
    error,
    usingCache: !!cachedData,
  };
}
