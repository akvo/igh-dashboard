'use client';

import { useQuery } from '@apollo/client/react';
import { GET_RD_PRIORITIES_WITH_CANDIDATES, GET_RD_PRIORITIES } from '../queries';

export function buildPriorityFilterVars(filter) {
  return {
    global_health_areas: filter?.globalHealthAreas?.length > 0 ? filter.globalHealthAreas : undefined,
    disease_names: filter?.diseaseNames?.length > 0 ? filter.diseaseNames : undefined,
    search: filter?.search || undefined,
  };
}

export function useRdPrioritiesWithCandidates(filter, limit = 20, offset = 0, options = {}) {
  const { data, loading, error } = useQuery(GET_RD_PRIORITIES_WITH_CANDIDATES, {
    variables: {
      filter: buildPriorityFilterVars(filter),
      limit,
      offset,
    },
    fetchPolicy: 'network-only',
    skip: options.skip,
  });

  const result = data?.rdPrioritiesWithCandidates;

  return {
    priorities: result?.nodes || [],
    totalCount: result?.totalCount || 0,
    hasNextPage: result?.hasNextPage || false,
    loading,
    error,
  };
}

export function useRdPriorities(filter, limit = 20, offset = 0, options = {}) {
  const { data, loading, error } = useQuery(GET_RD_PRIORITIES, {
    variables: {
      filter: buildPriorityFilterVars(filter),
      limit,
      offset,
    },
    fetchPolicy: 'network-only',
    skip: options.skip,
  });

  const result = data?.rdPriorities;

  return {
    priorities: result?.nodes || [],
    totalCount: result?.totalCount || 0,
    hasNextPage: result?.hasNextPage || false,
    loading,
    error,
  };
}
