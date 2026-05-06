'use client';

import { useQuery } from '@apollo/client/react';
import { GET_PORTFOLIO_CANDIDATES } from '../queries';

export function buildCandidateFilterVars(filter) {
  return {
    global_health_areas: filter?.globalHealthAreas?.length > 0 ? filter.globalHealthAreas : undefined,
    primary_disease_names:
      filter?.primaryDiseaseNames?.length > 0 ? filter.primaryDiseaseNames : undefined,
    secondary_disease_names:
      filter?.secondaryDiseaseNames?.length > 0 ? filter.secondaryDiseaseNames : undefined,
    product_names: filter?.productNames?.length > 0 ? filter.productNames : undefined,
    candidate_type: filter?.candidateType || undefined,
    phase_names: filter?.phaseNames?.length > 0 ? filter.phaseNames : undefined,
    search: filter?.search || undefined,
  };
}

export function usePortfolioCandidates(filter, limit = 20, offset = 0, options = {}) {
  const { data, loading, error } = useQuery(GET_PORTFOLIO_CANDIDATES, {
    variables: {
      filter: buildCandidateFilterVars(filter),
      limit,
      offset,
    },
    fetchPolicy: 'network-only',
    skip: options.skip,
  });

  const result = data?.portfolioCandidates;

  return {
    candidates: result?.nodes || [],
    totalCount: result?.totalCount || 0,
    hasNextPage: result?.hasNextPage || false,
    loading,
    error,
  };
}
