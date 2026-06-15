/**
 * Product Phase Distribution transformation functions
 * Transforms raw API response into stacked bar chart format grouped by product name
 */

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

  // Sort by total count descending
  return Object.values(grouped).sort((a, b) => {
    const totalA = Object.entries(a).reduce((sum, [k, v]) => k !== 'category' ? sum + (v || 0) : sum, 0);
    const totalB = Object.entries(b).reduce((sum, [k, v]) => k !== 'category' ? sum + (v || 0) : sum, 0);
    return totalB - totalA;
  });
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
