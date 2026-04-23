import { HEALTH_AREA_DISPLAY_NAMES } from './constants';

/**
 * Normalize ghaProductTypeSummaries rows into the shape BubbleChart consumes.
 * value = candidateCount + productCount when both are returned. When the
 * backend zeroes one side via the candidate_types filter, value naturally
 * narrows to whatever the filter exposed.
 */
export function transformGhaProductTypeSummaries(data) {
  if (!data || data.length === 0) return [];

  return data.map((item) => {
    const area = HEALTH_AREA_DISPLAY_NAMES[item.global_health_area] || item.global_health_area;
    return {
      key: `${item.global_health_area}|${item.product_type}`,
      name: `${area} · ${item.product_type}`,
      label: `${area} · ${item.product_type}`,
      group: area,
      productType: item.product_type,
      value: item.candidateCount + item.productCount,
      candidateCount: item.candidateCount,
      productCount: item.productCount,
    };
  });
}
