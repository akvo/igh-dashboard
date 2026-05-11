'use client';

import { useQuery } from '@apollo/client/react';
import { GET_CLINICAL_TRIALS } from '../queries';

export function buildClinicalTrialFilterVars(filter) {
  return {
    global_health_areas: filter?.globalHealthAreas?.length > 0 ? filter.globalHealthAreas : undefined,
    primary_disease_names:
      filter?.primaryDiseaseNames?.length > 0 ? filter.primaryDiseaseNames : undefined,
    secondary_disease_names:
      filter?.secondaryDiseaseNames?.length > 0 ? filter.secondaryDiseaseNames : undefined,
    product_names: filter?.productNames?.length > 0 ? filter.productNames : undefined,
    statuses: filter?.statuses?.length > 0 ? filter.statuses : undefined,
    column_filters: filter?.columnFilters,
  };
}

export function useClinicalTrials(filter, limit = 20, offset = 0, options = {}) {
  const { data, loading, error } = useQuery(GET_CLINICAL_TRIALS, {
    variables: {
      filter: buildClinicalTrialFilterVars(filter),
      sort: options.sort,
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
