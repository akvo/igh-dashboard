'use client';

import { useQuery } from '@apollo/client/react';
import { GET_LAST_SYNC_DATE } from '../queries';
import { useDashboardStore } from '@/store';

const CACHE_KEY = 'lastSyncDate';

export function useLastSyncDate() {
  const { actions } = useDashboardStore();
  const cachedData = actions.getCachedData(CACHE_KEY);

  const { data, loading, error } = useQuery(GET_LAST_SYNC_DATE, {
    skip: !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.lastSyncDate) {
        actions.setCache(CACHE_KEY, result.lastSyncDate);
      }
    },
  });

  const rawDate = cachedData || data?.lastSyncDate || null;

  return {
    lastSyncDate: rawDate,
    loading: loading && !cachedData,
    error,
  };
}
