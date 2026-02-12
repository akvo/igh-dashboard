/**
 * Global Health Area Summaries transformation functions
 * Transforms raw API response into bubble chart format
 */

import { HEALTH_AREA_DISPLAY_NAMES } from './constants';

/**
 * Transform raw health area summaries into bubble chart format
 * @param {Array} data - Raw API response array
 * @returns {Array} Bubble chart data array
 */
export function transformGlobalHealthAreaSummaries(data) {
  if (!data || data.length === 0) return [];

  return data.map((item) => ({
    name: HEALTH_AREA_DISPLAY_NAMES[item.global_health_area] || item.global_health_area,
    value: item.candidateCount,
    diseaseCount: item.diseaseCount,
    productCount: item.productCount,
    originalName: item.global_health_area,
  }));
}
