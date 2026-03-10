/**
 * Technology Type Distribution transformation functions
 * Transforms raw API response into pivot table format grouped by technology type
 */

import { phaseNameToKey, extractPhases } from './phaseDistribution';

/**
 * Group phase distribution data by technology type for pivot table
 * @param {Array} data - Raw API response
 * @returns {Array} Table-ready grouped data
 */
export function groupByTechnologyType(data) {
  if (!data || data.length === 0) return [];

  const grouped = data.reduce((acc, row) => {
    if (!acc[row.technology_type]) {
      acc[row.technology_type] = { technology_type: row.technology_type };
    }
    acc[row.technology_type][phaseNameToKey(row.phase_name)] = row.candidateCount;
    return acc;
  }, {});

  return Object.values(grouped).sort((a, b) => {
    const sumRow = (row) =>
      Object.entries(row).reduce(
        (sum, [key, val]) => (key !== 'technology_type' ? sum + (val || 0) : sum),
        0,
      );
    return sumRow(b) - sumRow(a);
  });
}

/**
 * Full transformation pipeline for technology type distribution
 * @param {Array} data - Raw API response
 * @returns {{ tableData: Array, phases: Array }}
 */
export function transformTechnologyTypeDistribution(data) {
  return {
    tableData: groupByTechnologyType(data),
    phases: extractPhases(data),
  };
}
