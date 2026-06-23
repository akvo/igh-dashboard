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
  priorities: [],
});

/**
 * Apollo hook wrapping `priorityAlignmentOverview`.
 *
 * Both the Home page WHO Priority Alignment section and the WHO Priority
 * alignment page share this hook.
 *
 * @param {string[]|null|undefined} globalHealthAreas
 * @param {string[]|null|undefined} primaryDiseaseNames
 * @param {string[]|null|undefined} secondaryDiseaseNames
 * @param {string[]|null|undefined} productNames
 */
export function usePriorityAlignment(
  globalHealthAreas,
  primaryDiseaseNames,
  secondaryDiseaseNames,
  productNames,
  phaseNames,
) {
  const { actions } = useDashboardStore();

  // Memoising the variables object prevents `useQuery` from seeing a new
  // reference on every render and issuing a redundant network request. Each
  // array is coerced to `undefined` when empty so the GraphQL resolver
  // receives no filter (i.e. "all") rather than an empty-list filter.
  const variables = useMemo(
    () => ({
      globalHealthAreas: globalHealthAreas && globalHealthAreas.length > 0 ? globalHealthAreas : undefined,
      primaryDiseaseNames: primaryDiseaseNames && primaryDiseaseNames.length > 0 ? primaryDiseaseNames : undefined,
      secondaryDiseaseNames: secondaryDiseaseNames && secondaryDiseaseNames.length > 0 ? secondaryDiseaseNames : undefined,
      productNames: productNames && productNames.length > 0 ? productNames : undefined,
      phaseNames: phaseNames && phaseNames.length > 0 ? phaseNames : undefined,
    }),
    [globalHealthAreas, primaryDiseaseNames, secondaryDiseaseNames, productNames, phaseNames],
  );
  const cacheKey = getCacheKey('priorityAlignment', variables);
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_PRIORITY_ALIGNMENT_OVERVIEW, {
    variables,
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
  //
  // The NA (unknown) bucket is kept as its own slice rather than folded
  // into Yes or No. This keeps the headline "Yes" percentage honest: the
  // denominator is the full priority count (Yes + No + unknown), so the
  // share isn't artificially inflated by pretending unclassified
  // priorities lean one way or the other.
  const womenOrChildrenChartData = useMemo(() => {
    const share = payload.womenOrChildrenShare;
    return [
      { name: 'Yes', value: share.yes },
      { name: 'NA', value: share.unknown },
      { name: 'No', value: share.no },
    ].filter((slice) => slice.value > 0);
  }, [payload.womenOrChildrenShare]);

  // Total candidates linked to at least one priority across all GHAs.
  // Used by consumers to gate donut rendering — when zero, both donuts
  // should show empty state rather than misleading counts.
  const candidatesWithPriorityTotal = useMemo(
    () => payload.byArea.reduce((sum, a) => sum + (a.candidatesWithPriority ?? 0), 0),
    [payload.byArea],
  );

  return {
    totalPriorities: payload.totalPriorities,
    byArea: payload.byArea,
    candidatesWithPriorityTotal,
    productTypeChartData,
    diseaseOptions: payload.diseaseOptions,
    womenOrChildrenShare: payload.womenOrChildrenShare,
    womenOrChildrenChartData,
    priorities: payload.priorities,
    loading: loading && !cachedData,
    error,
    usingCache: !!cachedData,
  };
}
