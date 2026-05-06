'use client';

import { useQuery } from '@apollo/client/react';
import { GET_TECHNOLOGY_TYPE_DISTRIBUTION } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';
import { transformTechnologyTypeDistribution } from '@/lib/transformations';

export function useTechnologyTypeDistribution(globalHealthAreas, primaryDiseaseNames, secondaryDiseaseNames, productNames, phaseNames, candidateType) {
  const { actions } = useDashboardStore();
  const cacheKey = getCacheKey('technologyTypeDistribution', { globalHealthAreas, primaryDiseaseNames, secondaryDiseaseNames, productNames, phaseNames, candidateType });
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_TECHNOLOGY_TYPE_DISTRIBUTION, {
    variables: {
      globalHealthAreas: globalHealthAreas && globalHealthAreas.length > 0 ? globalHealthAreas : undefined,
      primaryDiseaseNames: primaryDiseaseNames && primaryDiseaseNames.length > 0 ? primaryDiseaseNames : undefined,
      secondaryDiseaseNames: secondaryDiseaseNames && secondaryDiseaseNames.length > 0 ? secondaryDiseaseNames : undefined,
      productNames: productNames && productNames.length > 0 ? productNames : undefined,
      phaseNames: phaseNames && phaseNames.length > 0 ? phaseNames : undefined,
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
