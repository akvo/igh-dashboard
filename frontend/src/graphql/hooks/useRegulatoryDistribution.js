'use client';

import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';
import { GET_REGULATORY_DISTRIBUTION } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';

export function useRegulatoryDistribution(globalHealthAreas, primaryDiseaseNames, secondaryDiseaseNames, productNames, phaseNames) {
  const { actions } = useDashboardStore();
  const cacheKey = getCacheKey('regulatoryDistribution', { globalHealthAreas, primaryDiseaseNames, secondaryDiseaseNames, productNames, phaseNames });
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_REGULATORY_DISTRIBUTION, {
    variables: {
      globalHealthAreas: globalHealthAreas && globalHealthAreas.length > 0 ? globalHealthAreas : undefined,
      primaryDiseaseNames: primaryDiseaseNames && primaryDiseaseNames.length > 0 ? primaryDiseaseNames : undefined,
      secondaryDiseaseNames: secondaryDiseaseNames && secondaryDiseaseNames.length > 0 ? secondaryDiseaseNames : undefined,
      productNames: productNames && productNames.length > 0 ? productNames : undefined,
      phaseNames: phaseNames?.length > 0 ? phaseNames : undefined,
    },
    skip: !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.regulatoryDistribution) {
        actions.setCache(cacheKey, result.regulatoryDistribution);
      }
    },
  });

  const rawData = cachedData || data?.regulatoryDistribution;

  const approvalStatus = useMemo(() =>
    (rawData?.approvalStatus || []).map(row => ({
      name: row.approval_status,
      value: row.candidateCount,
    })).sort((a, b) => b.value - a.value),
    [rawData?.approvalStatus]
  );

  // Fixed order so color assignment by index is deterministic:
  // Yes = tan, No = orange, Unknown = lavender
  const WHO_PREQUAL_ORDER = ['Yes', 'No', 'Unknown'];

  const whoPrequalification = useMemo(() =>
    (rawData?.whoPrequalification || []).map(row => ({
      name: row.who_prequalification,
      value: row.candidateCount,
    })).sort((a, b) => WHO_PREQUAL_ORDER.indexOf(a.name) - WHO_PREQUAL_ORDER.indexOf(b.name)),
    [rawData?.whoPrequalification]
  );

  const approvingAuthorities = useMemo(() =>
    (rawData?.approvingAuthorities || []).map(row => ({
      category: row.authority_type === 'Stringent Regulatory Authority'
        ? 'Stringent\nRegulatory\nAuthority'
        : 'National\nRegulatory\nAuthority',
      who_prequalified: row.who_prequalified,
      no_who_listing: row.no_who_listing,
    })).sort((a, b) => (b.who_prequalified + b.no_who_listing) - (a.who_prequalified + a.no_who_listing)),
    [rawData?.approvingAuthorities]
  );

  return {
    approvalStatus,
    whoPrequalification,
    approvingAuthorities,
    loading: loading && !cachedData,
    error,
    usingCache: !!cachedData,
  };
}
