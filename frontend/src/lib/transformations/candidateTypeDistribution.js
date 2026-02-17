/**
 * Candidate Type Distribution transformation functions
 * Transforms raw API response into stacked bar chart format
 * with Products and Candidates segments per health area.
 */

import { HEALTH_AREA_DISPLAY_NAMES } from './constants';

/**
 * Return the fixed segment config for candidate type chart.
 * @returns {Array} Segment configuration for charts
 */
export function extractCandidateTypes() {
  return [
    { key: 'candidates', label: 'Candidates', color: '#fe7449' },
    { key: 'products', label: 'Products', color: '#f9a78d' },
  ];
}

/**
 * Group candidate type distribution data by health area for stacked bar chart.
 * Pivots candidate_type values into keys (candidates, products).
 * @param {Array} data - Raw API response
 * @returns {Array} Chart-ready grouped data
 */
export function groupByHealthArea(data) {
  if (!data || data.length === 0) return [];

  const grouped = data.reduce((acc, row) => {
    const displayName =
      HEALTH_AREA_DISPLAY_NAMES[row.global_health_area] ||
      row.global_health_area;

    if (!acc[row.global_health_area]) {
      acc[row.global_health_area] = { category: displayName };
    }

    const key = row.candidate_type === 'Candidate' ? 'candidates' : 'products';
    acc[row.global_health_area][key] = row.candidateCount;
    return acc;
  }, {});

  return Object.values(grouped);
}

/**
 * Full transformation pipeline for candidate type distribution
 * @param {Array} data - Raw API response
 * @returns {{ chartData: Array, segments: Array }}
 */
export function transformCandidateTypeDistribution(data) {
  return {
    chartData: groupByHealthArea(data),
    segments: extractCandidateTypes(),
  };
}
