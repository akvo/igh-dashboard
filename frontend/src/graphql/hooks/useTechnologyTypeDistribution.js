'use client';

import { useQuery } from '@apollo/client/react';
import { GET_TECHNOLOGY_TYPE_DISTRIBUTION } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';
import { transformTechnologyTypeDistribution } from '@/lib/transformations';

export function useTechnologyTypeDistribution(globalHealthAreas, diseaseNames, productNames, candidateType) {
  const { actions } = useDashboardStore();
  const cacheKey = getCacheKey('technologyTypeDistribution', { globalHealthAreas, diseaseNames, productNames, candidateType });
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_TECHNOLOGY_TYPE_DISTRIBUTION, {
    variables: {
      globalHealthAreas: globalHealthAreas && globalHealthAreas.length > 0 ? globalHealthAreas : undefined,
      diseaseNames: diseaseNames && diseaseNames.length > 0 ? diseaseNames : undefined,
      productNames: productNames && productNames.length > 0 ? productNames : undefined,
      candidateType: candidateType || undefined,
    },
    skip: !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.technologyTypeDistribution) {
        actions.setCache(cacheKey, result.technologyTypeDistribution);
      }
    },
  });

  const rawData = cachedData || data?.technologyTypeDistribution;
  const { tableData, phases } = transformTechnologyTypeDistribution(rawData);

  return {
    tableData: tableData || [],
    phases: phases || [],
    totalCount: tableData?.length || 0,
    loading: loading && !cachedData,
    error,
    raw: rawData,
    usingCache: !!cachedData,
  };
}
