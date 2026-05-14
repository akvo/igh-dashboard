'use client';

import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';
import { GET_HOME_PRIORITY_ALIGNMENT } from '../queries';
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
 * Apollo hook wrapping `priorityAlignmentOverview` with the dashboard
 * store cache pattern (same as useProductDistribution).
 *
 * @param {number[]|null|undefined} diseaseKeys
 */
export function useHomePriorityAlignment(diseaseKeys) {
  const { actions } = useDashboardStore();
  const cacheKey = getCacheKey('homePriorityAlignment', { diseaseKeys });
  const cachedData = actions.getCachedData(cacheKey);

  const { data, loading, error } = useQuery(GET_HOME_PRIORITY_ALIGNMENT, {
    variables: {
      diseaseKeys: diseaseKeys && diseaseKeys.length > 0 ? diseaseKeys : undefined,
    },
    skip: !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.priorityAlignmentOverview) {
        actions.setCache(cacheKey, result.priorityAlignmentOverview);
      }
    },
  });

  const payload = cachedData || data?.priorityAlignmentOverview || EMPTY;

  // Shape product type rows for DonutChart (name/value).
  const productTypeChartData = useMemo(
    () =>
      payload.productTypeBreakdown.map((row) => ({
        name: row.product_name,
        value: row.candidateCount,
      })),
    [payload.productTypeBreakdown],
  );

  // Shape women/children share for DonutChart. We expose Yes/NA/No in
  // the design's legend order (Yes | NA | No) and surface "NA" — the
  // priorities where the Two-Options field is unset — as its own slice
  // rather than hiding it. Pretending the denominator is just Yes+No
  // would inflate the headline percentage. Empty buckets are filtered
  // out so the donut doesn't render zero-area wedges.
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
