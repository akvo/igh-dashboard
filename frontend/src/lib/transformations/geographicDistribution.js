/**
 * Geographic Distribution transformation functions
 * Transforms raw API response into map-ready format
 */

/**
 * Transform raw geographic distribution into map data format
 * @param {Array} data - Raw API response array
 * @returns {Object} Map data object { iso_code: candidateCount }
 */
export function transformToMapData(data) {
  if (!data || data.length === 0) return {};

  return data.reduce((acc, item) => {
    if (item.iso_code) {
      acc[item.iso_code] = item.candidateCount;
    }
    return acc;
  }, {});
}

/**
 * Full transformation pipeline for geographic distribution
 * Returns both map format and list format
 * @param {Array} data - Raw API response
 * @returns {{ mapData: Object, distributionList: Array }}
 */
export function transformGeographicDistribution(data) {
  return {
    mapData: transformToMapData(data),
    distributionList: data || [],
  };
}
