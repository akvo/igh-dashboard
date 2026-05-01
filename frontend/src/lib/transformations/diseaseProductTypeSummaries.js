import { HEALTH_AREA_DISPLAY_NAMES } from './constants';

export function transformDiseaseProductTypeSummaries(data) {
  if (!data || data.length === 0) return [];

  return data.map((item) => ({
    key: `${item.disease_group_name}|${item.product_type}`,
    name: `${item.disease_group_name} · ${item.product_type}`,
    label: `${item.disease_group_name} · ${item.product_type}`,
    group: HEALTH_AREA_DISPLAY_NAMES[item.global_health_area] || item.global_health_area,
    disease: item.disease_group_name,
    productType: item.product_type,
    value: item.candidateCount + item.productCount,
    candidateCount: item.candidateCount,
    productCount: item.productCount,
  }));
}
