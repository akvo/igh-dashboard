import { create } from 'zustand';
import { CACHE_TTL } from '@/lib/transformations/constants';

/**
 * Generate a cache key for parameterized queries
 * @param {string} baseName - Base query name
 * @param {Object} params - Query parameters
 * @returns {string} Cache key
 */
export function getCacheKey(baseName, params = {}) {
  const filteredParams = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b));

  if (filteredParams.length === 0) return baseName;

  const paramString = filteredParams
    .map(([k, v]) => `${k}:${JSON.stringify(v)}`)
    .join('|');

  return `${baseName}:${paramString}`;
}

/**
 * Check if a cache entry is still fresh
 * @param {Object} cacheEntry - Cache entry with fetchedAt timestamp
 * @returns {boolean} Whether the cache is fresh
 */
export function isCacheFresh(cacheEntry) {
  if (!cacheEntry || !cacheEntry.fetchedAt) return false;
  return Date.now() - cacheEntry.fetchedAt < CACHE_TTL;
}

/**
 * Dashboard data store using Zustand
 * Caches raw API responses to avoid repeated HTTP calls
 */
export const useDashboardStore = create((set, get) => ({
  // Raw API response cache
  cache: {},

  // Loading states per query key
  loading: {},

  // Error states per query key
  errors: {},

  // Metadata
  meta: {
    lastGlobalRefresh: null,
  },

  // Actions
  actions: {
    /**
     * Set cache data for a query
     * @param {string} key - Cache key
     * @param {*} data - Raw API response data
     */
    setCache: (key, data) => {
      set((state) => ({
        cache: {
          ...state.cache,
          [key]: {
            data,
            fetchedAt: Date.now(),
          },
        },
      }));
    },

    /**
     * Get cached data if fresh
     * @param {string} key - Cache key
     * @returns {*|null} Cached data or null if stale/missing
     */
    getCachedData: (key) => {
      const entry = get().cache[key];
      return isCacheFresh(entry) ? entry.data : null;
    },

    /**
     * Check if data is cached and fresh
     * @param {string} key - Cache key
     * @returns {boolean}
     */
    hasFreshCache: (key) => {
      return isCacheFresh(get().cache[key]);
    },

    /**
     * Set loading state for a query
     * @param {string} key - Cache key
     * @param {boolean} isLoading - Loading state
     */
    setLoading: (key, isLoading) => {
      set((state) => ({
        loading: {
          ...state.loading,
          [key]: isLoading,
        },
      }));
    },

    /**
     * Set error state for a query
     * @param {string} key - Cache key
     * @param {Error|null} error - Error object or null
     */
    setError: (key, error) => {
      set((state) => ({
        errors: {
          ...state.errors,
          [key]: error,
        },
      }));
    },

    /**
     * Invalidate a specific cache entry
     * @param {string} key - Cache key to invalidate
     */
    invalidateCache: (key) => {
      set((state) => {
        const newCache = { ...state.cache };
        delete newCache[key];
        return { cache: newCache };
      });
    },

    /**
     * Clear all cache entries
     */
    clearAllCache: () => {
      set({
        cache: {},
        meta: {
          ...get().meta,
          lastGlobalRefresh: Date.now(),
        },
      });
    },

    /**
     * Refresh all data by clearing cache
     * Components will refetch on next render
     */
    refreshAll: () => {
      get().actions.clearAllCache();
    },
  },
}));
