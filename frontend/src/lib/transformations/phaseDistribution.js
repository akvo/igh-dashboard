/**
 * Phase Distribution transformation functions
 * Transforms raw API response into stacked bar chart format
 */

import { PHASE_COLORS, SIMPLIFIED_PHASE_NAMES } from './constants';

/**
 * Convert phase name to a safe key for chart data
 * @param {string} phaseName - Original phase name
 * @returns {string} Safe key string
 */
export function phaseNameToKey(phaseName) {
  return phaseName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
}

/**
 * Extract unique phases sorted by sort_order
 * @param {Array} data - Raw API response
 * @returns {Array} Phase configuration for charts
 */
export function extractPhases(data) {
  if (!data || data.length === 0) return [];

  const uniquePhases = [...new Map(
    [...data]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(r => [r.phase_name, r])
  ).values()];

  return uniquePhases.map(phase => ({
    key: phaseNameToKey(phase.phase_name),
    label: SIMPLIFIED_PHASE_NAMES[phase.phase_name] || phase.phase_name,
    fullLabel: phase.phase_name,
    color: PHASE_COLORS[phase.phase_name] || '#cccccc',
    sortOrder: phase.sort_order,
  }));
}

/**
 * Group phase distribution data by health area for stacked bar chart
 * @param {Array} data - Raw API response
 * @returns {Array} Chart-ready grouped data
 */
export function groupByHealthArea(data) {
  if (!data || data.length === 0) return [];

  const grouped = data.reduce((acc, row) => {
    if (!acc[row.global_health_area]) {
      acc[row.global_health_area] = { category: row.global_health_area };
    }
    const key = phaseNameToKey(row.phase_name);
    acc[row.global_health_area][key] = row.candidateCount;
    return acc;
  }, {});

  return Object.values(grouped);
}

/**
 * Full transformation pipeline for phase distribution
 * @param {Array} data - Raw API response
 * @returns {{ chartData: Array, phases: Array }}
 */
export function transformPhaseDistribution(data) {
  return {
    chartData: groupByHealthArea(data),
    phases: extractPhases(data),
  };
}
