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

  return {
    diseases: rawData.map(d => ({ name: d.disease_group_name })),
    loading: loading && !cachedData,
    error,
    raw: rawData,
    usingCache: !!cachedData,
  };
}
