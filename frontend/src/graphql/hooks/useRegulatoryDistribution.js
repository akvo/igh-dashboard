'use client';

import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';
import { GET_REGULATORY_DISTRIBUTION } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';

export function useRegulatoryDistribution(globalHealthAreas, diseaseNames, productNames) {
  const { actions } = useDashboardStore();
  const cacheKey = getCacheKey('regulatoryDistribution', { globalHealthAreas, diseaseNames, productNames });
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_REGULATORY_DISTRIBUTION, {
    variables: {
      globalHealthAreas: globalHealthAreas && globalHealthAreas.length > 0 ? globalHealthAreas : undefined,
      diseaseNames: diseaseNames && diseaseNames.length > 0 ? diseaseNames : undefined,
      productNames: productNames && productNames.length > 0 ? productNames : undefined,
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
    })),
    [rawData?.approvalStatus]
  );

  const whoPrequalification = useMemo(() =>
    (rawData?.whoPrequalification || []).map(row => ({
      name: row.who_prequalification,
      value: row.candidateCount,
    })),
    [rawData?.whoPrequalification]
  );

  const approvingAuthorities = useMemo(() =>
    (rawData?.approvingAuthorities || []).map(row => ({
      category: row.authority_type === 'Stringent Regulatory Authority'
        ? 'Stringent\nRegulatory\nAuthority'
        : 'National\nRegulatory\nAuthority',
      who_prequalified: row.who_prequalified,
      no_who_listing: row.no_who_listing,
    })),
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
