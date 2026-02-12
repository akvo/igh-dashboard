/**
 * Temporal Snapshots transformation functions
 * Transforms raw API response into stacked bar chart format for temporal analysis
 */

import { PHASE_COLORS, SIMPLIFIED_PHASE_NAMES } from './constants';

/**
 * Convert phase name to a safe key for chart data
 * @param {string} phaseName - Original phase name
 * @returns {string} Safe key string
 */
function phaseNameToKey(phaseName) {
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
 * Group temporal data by year for stacked bar chart
 * @param {Array} data - Raw API response
 * @returns {Array} Chart-ready grouped data sorted by year
 */
export function groupByYear(data) {
  if (!data || data.length === 0) return [];

  const grouped = data.reduce((acc, row) => {
    const yearKey = String(row.year);
    if (!acc[yearKey]) {
      acc[yearKey] = { category: yearKey };
    }
    const key = phaseNameToKey(row.phase_name);
    acc[yearKey][key] = row.candidateCount;
    return acc;
  }, {});

  // Sort by year
  return Object.values(grouped).sort((a, b) =>
    parseInt(a.category) - parseInt(b.category)
  );
}

/**
 * Full transformation pipeline for temporal snapshots
 * @param {Array} data - Raw API response
 * @returns {{ chartData: Array, phases: Array }}
 */
export function transformTemporalSnapshots(data) {
  return {
    chartData: groupByYear(data),
    phases: extractPhases(data),
  };
}
