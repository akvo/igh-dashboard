'use client';

import { useQuery } from '@apollo/client/react';
import { GET_PRODUCTS } from '../queries';
import { useDashboardStore } from '@/store';

const CACHE_KEY = 'products';

export function useProducts() {
  const { actions } = useDashboardStore();
  const cachedData = actions.getCachedData(CACHE_KEY);

  const { data, loading, error } = useQuery(GET_PRODUCTS, {
    skip: !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.products) {
        actions.setCache(CACHE_KEY, result.products);
      }
    },
  });

  const products = cachedData || data?.products || [];

  return {
    products,
    loading: loading && !cachedData,
    error,
    usingCache: !!cachedData,
  };
}

// Alias for consistency (no fallback data)
export function useProductsWithFallback() {
  return useProducts();
}
