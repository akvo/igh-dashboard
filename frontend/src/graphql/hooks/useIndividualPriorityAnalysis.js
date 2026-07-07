'use client';

import { useQuery } from '@apollo/client/react';
import { useMemo } from 'react';
import { GET_INDIVIDUAL_PRIORITY_ANALYSIS } from '../queries';
import { useDashboardStore, getCacheKey } from '@/store';

// Empty payload returned while loading / skipped. Lets the section
// render skeletons against a stable shape (no null-check fan-out).
const EMPTY = Object.freeze({
  candidatesCount: 0,
  targetPopulation: null,
  pipelineBuildUp: [],
});

/**
 * Apollo hook wrapping `individualPriorityAnalysis`.
 *
 * Drives the WHO Priority alignment page's Individual priority
 * analysis section: stat cards, target_population text, and the
 * pipeline build-up stacked bar chart.
 *
 * Empty state: when `priorityKey` is null/undefined the hook skips
 * the network request and returns `EMPTY`. The caller is expected to
 * not render the active body in that case.
 *
 * @param {object}   args
 * @param {number|null} args.priorityKey
 * @param {string[]} [args.globalHealthAreas]
 * @param {string[]} [args.primaryDiseaseNames]
 * @param {string[]} [args.secondaryDiseaseNames]
 * @param {string[]} [args.productNames]
 * @param {string[]} [args.phaseNames]
 */
export function useIndividualPriorityAnalysis({
  priorityKey,
  globalHealthAreas,
  primaryDiseaseNames,
  secondaryDiseaseNames,
  productNames,
  phaseNames,
}) {
  const { actions } = useDashboardStore();

  const variables = useMemo(
    () => ({
      priorityKey,
      globalHealthAreas:
        globalHealthAreas && globalHealthAreas.length > 0 ? globalHealthAreas : undefined,
      primaryDiseaseNames:
        primaryDiseaseNames && primaryDiseaseNames.length > 0 ? primaryDiseaseNames : undefined,
      secondaryDiseaseNames:
        secondaryDiseaseNames && secondaryDiseaseNames.length > 0
          ? secondaryDiseaseNames
          : undefined,
      productNames: productNames && productNames.length > 0 ? productNames : undefined,
      phaseNames: phaseNames && phaseNames.length > 0 ? phaseNames : undefined,
    }),
    [priorityKey, globalHealthAreas, primaryDiseaseNames, secondaryDiseaseNames, productNames, phaseNames],
  );

  const cacheKey = getCacheKey('individualPriorityAnalysis', variables);
  const cachedData = priorityKey != null ? actions.getCachedData(cacheKey) : null;

  const { data, loading, error } = useQuery(GET_INDIVIDUAL_PRIORITY_ANALYSIS, {
    variables,
    skip: priorityKey == null || !!cachedData,
    fetchPolicy: 'network-only',
    onCompleted: (result) => {
      if (result?.individualPriorityAnalysis) {
        actions.setCache(cacheKey, result.individualPriorityAnalysis);
      }
    },
  });

  const payload = cachedData || data?.individualPriorityAnalysis || EMPTY;

  return {
    counts: {
      candidatesCount: payload.candidatesCount,
    },
    targetPopulation: payload.targetPopulation,
    pipelineBuildUp: payload.pipelineBuildUp,
    loading: loading && !cachedData && priorityKey != null,
    error,
    usingCache: !!cachedData,
  };
}
