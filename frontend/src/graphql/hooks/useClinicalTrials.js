'use client';

import { useQuery } from '@apollo/client/react';
import { GET_CLINICAL_TRIALS } from '../queries';

export function useClinicalTrials(filter, limit = 20, offset = 0, options = {}) {
  const { data, loading, error } = useQuery(GET_CLINICAL_TRIALS, {
    variables: {
      filter: {
        global_health_areas: filter?.globalHealthAreas?.length > 0 ? filter.globalHealthAreas : undefined,
        disease_names: filter?.diseaseNames?.length > 0 ? filter.diseaseNames : undefined,
        product_names: filter?.productNames?.length > 0 ? filter.productNames : undefined,
        status: filter?.status || undefined,
      },
      limit,
      offset,
    },
    fetchPolicy: 'network-only',
    skip: options.skip,
  });

  const result = data?.clinicalTrials;

  return {
    trials: result?.nodes || [],
    totalCount: result?.totalCount || 0,
    hasNextPage: result?.hasNextPage || false,
    loading,
    error,
  };
}
