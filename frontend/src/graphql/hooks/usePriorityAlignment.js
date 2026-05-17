'use client';

import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';
import { GET_PRIORITY_ALIGNMENT_OVERVIEW } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';

// Empty payload returned while loading / before first fetch. Lets the
// page render skeletons against a stable shape (avoids null-checks).
const EMPTY = Object.freeze({
  totalPriorities: 0,
  byArea: [],
  productTypeBreakdown: [],
  diseaseOptions: [],
  womenOrChildrenShare: Object.freeze({ yes: 0, no: 0, unknown: 0 }),
});

/**
 * Apollo hook wrapping `priorityAlignmentOverview`.
 *
 * Both the Home page WHO Priority Alignment section and the WHO Priority
 * alignment page share this hook. Home calls it with `primaryDiseaseNames`
 * only; the WHO page passes all four filter arrays.
 *
 * @param {object} filters
 * @param {string[]|null|undefined} filters.globalHealthAreas
 * @param {string[]|null|undefined} filters.primaryDiseaseNames
 * @param {string[]|null|undefined} filters.secondaryDiseaseNames
 * @param {string[]|null|undefined} filters.productNames
 */
export function usePriorityAlignment(filters = {}) {
  const { actions } = useDashboardStore();
  const normalized = {
    globalHealthAreas:
      filters.globalHealthAreas && filters.globalHealthAreas.length > 0
        ? filters.globalHealthAreas
        : undefined,
    primaryDiseaseNames:
      filters.primaryDiseaseNames && filters.primaryDiseaseNames.length > 0
        ? filters.primaryDiseaseNames
        : undefined,
    secondaryDiseaseNames:
      filters.secondaryDiseaseNames && filters.secondaryDiseaseNames.length > 0
        ? filters.secondaryDiseaseNames
        : undefined,
    productNames:
      filters.productNames && filters.productNames.length > 0 ? filters.productNames : undefined,
  };
  const cacheKey = getCacheKey('priorityAlignment', normalized);
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_PRIORITY_ALIGNMENT_OVERVIEW, {
    variables: normalized,
    skip: !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.priorityAlignmentOverview) {
        actions.setCache(cacheKey, result.priorityAlignmentOverview);
      }
    },
  });

  const payload = cachedData || data?.priorityAlignmentOverview || EMPTY;

  const productTypeChartData = useMemo(
    () =>
      payload.productTypeBreakdown.map((row) => ({
        name: row.product_name,
        value: row.candidateCount,
      })),
    [payload.productTypeBreakdown],
  );

  // Yes / NA / No legend order; trim zero-area wedges so the donut
  // doesn't render empty slices.
  const womenOrChildrenChartData = useMemo(() => {
    const share = payload.womenOrChildrenShare;
    return [
      { name: 'Yes', value: share.yes },
      { name: 'NA', value: share.unknown },
      { name: 'No', value: share.no },
    ].filter((slice) => slice.value > 0);
  }, [payload.womenOrChildrenShare]);

  return {
    totalPriorities: payload.totalPriorities,
    byArea: payload.byArea,
    productTypeChartData,
    diseaseOptions: payload.diseaseOptions,
    womenOrChildrenShare: payload.womenOrChildrenShare,
    womenOrChildrenChartData,
    loading: loading && !cachedData,
    error,
    usingCache: !!cachedData,
  };
}
