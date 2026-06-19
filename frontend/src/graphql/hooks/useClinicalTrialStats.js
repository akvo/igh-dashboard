'use client';

import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';
import { GET_CLINICAL_TRIAL_STATS } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';

export function useClinicalTrialStats(globalHealthAreas, primaryDiseaseNames, secondaryDiseaseNames, productNames, phaseNames) {
  const { actions } = useDashboardStore();
  const cacheKey = getCacheKey('clinicalTrialStats', { globalHealthAreas, primaryDiseaseNames, secondaryDiseaseNames, productNames, phaseNames });
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_CLINICAL_TRIAL_STATS, {
    variables: {
      globalHealthAreas: globalHealthAreas && globalHealthAreas.length > 0 ? globalHealthAreas : undefined,
      primaryDiseaseNames: primaryDiseaseNames?.length > 0 ? primaryDiseaseNames : undefined,
      secondaryDiseaseNames: secondaryDiseaseNames?.length > 0 ? secondaryDiseaseNames : undefined,
      productNames: productNames && productNames.length > 0 ? productNames : undefined,
      phaseNames: phaseNames?.length > 0 ? phaseNames : undefined,
    },
    skip: !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.clinicalTrialStats) {
        actions.setCache(cacheKey, result.clinicalTrialStats);
      }
    },
  });

  const rawData = cachedData || data?.clinicalTrialStats;

  const totalTrials = rawData?.totalTrials || 0;

  const statusDistribution = useMemo(() =>
    (rawData?.statusDistribution || []).map(row => ({
      name: row.status,
      value: row.trialCount,
    })).sort((a, b) => b.value - a.value),
    [rawData?.statusDistribution]
  );

  const ageGroupDistribution = useMemo(() =>
    (rawData?.ageGroupDistribution || []).map(row => ({
      name: row.age_group_name,
      value: row.candidateCount,
    })),
    [rawData?.ageGroupDistribution]
  );

  const diseaseDistribution = useMemo(() =>
    (rawData?.diseaseDistribution || []).map(row => ({
      name: row.disease_name,
      value: row.trialCount,
      group: row.global_health_area,
    })),
    [rawData?.diseaseDistribution]
  );

  const productTypeDistribution = useMemo(() =>
    (rawData?.productTypeDistribution || []).map(row => ({
      name: row.product_name,
      value: row.trialCount,
    })),
    [rawData?.productTypeDistribution]
  );

  const ghaDistribution = useMemo(() =>
    (rawData?.ghaDistribution || []).map(row => ({
      name: row.global_health_area,
      value: row.trialCount,
    })),
    [rawData?.ghaDistribution]
  );

  return {
    totalTrials,
    statusDistribution,
    ageGroupDistribution,
    diseaseDistribution,
    productTypeDistribution,
    ghaDistribution,
    loading: loading && !cachedData,
    error,
    usingCache: !!cachedData,
  };
}
