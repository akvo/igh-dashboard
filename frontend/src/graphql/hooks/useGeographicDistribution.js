'use client';

import { useQuery } from '@apollo/client/react';
import { GET_GEOGRAPHIC_DISTRIBUTION } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';
import { transformGeographicDistribution } from '@/lib/transformations';

export function useGeographicDistribution(locationScope = 'Trial Location', statuses, globalHealthAreas, primaryDiseaseNames, secondaryDiseaseNames, productNames, phaseNames) {
  const { actions } = useDashboardStore();
  // Include all filter params in the cache key so each combination gets its own entry
  const effectiveStatuses = statuses?.length > 0 ? statuses : undefined;
  const effectiveGHA = globalHealthAreas?.length > 0 ? globalHealthAreas : undefined;
  const effectivePrimaryDiseases = primaryDiseaseNames?.length > 0 ? primaryDiseaseNames : undefined;
  const effectiveSecondaryDiseases = secondaryDiseaseNames?.length > 0 ? secondaryDiseaseNames : undefined;
  const effectiveProducts = productNames?.length > 0 ? productNames : undefined;
  const effectivePhases = phaseNames?.length > 0 ? phaseNames : undefined;
  const cacheKey = getCacheKey('geographicDistribution', {
    locationScope,
    statuses: effectiveStatuses,
    globalHealthAreas: effectiveGHA,
    primaryDiseaseNames: effectivePrimaryDiseases,
    secondaryDiseaseNames: effectiveSecondaryDiseases,
    productNames: effectiveProducts,
    phaseNames: effectivePhases,
  });
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_GEOGRAPHIC_DISTRIBUTION, {
    variables: {
      scope: locationScope,
      statuses: effectiveStatuses,
      globalHealthAreas: effectiveGHA,
      primaryDiseaseNames: effectivePrimaryDiseases,
      secondaryDiseaseNames: effectiveSecondaryDiseases,
      productNames: effectiveProducts,
      phaseNames: effectivePhases,
    },
    skip: !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.geographicDistribution) {
        actions.setCache(cacheKey, result.geographicDistribution);
      }
    },
  });

  const rawData = cachedData || data?.geographicDistribution;
  const { mapData, distributionList } = transformGeographicDistribution(rawData);

  return {
    mapData: mapData || {},
    distributionList: distributionList || [],
    loading: loading && !cachedData,
    error,
    raw: rawData,
    usingCache: !!cachedData,
  };
}
