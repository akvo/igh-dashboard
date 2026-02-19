/**
 * Product Phase Distribution transformation functions
 * Transforms raw API response into stacked bar chart format grouped by product name
 */

import { PHASE_COLORS, SIMPLIFIED_PHASE_NAMES } from './constants';
import { phaseNameToKey, extractPhases } from './phaseDistribution';

/**
 * Group phase distribution data by product name for stacked bar chart
 * @param {Array} data - Raw API response
 * @returns {Array} Chart-ready grouped data
 */
export function groupByProductName(data) {
  if (!data || data.length === 0) return [];

  const grouped = data.reduce((acc, row) => {
    if (!acc[row.product_name]) {
      acc[row.product_name] = { category: row.product_name };
    }
    const key = phaseNameToKey(row.phase_name);
    acc[row.product_name][key] = row.candidateCount;
    return acc;
  }, {});

  return Object.values(grouped);
}

/**
 * Full transformation pipeline for product phase distribution
 * @param {Array} data - Raw API response
 * @returns {{ chartData: Array, phases: Array }}
 */
export function transformProductPhaseDistribution(data) {
  return {
    chartData: groupByProductName(data),
    phases: extractPhases(data),
  };
}
