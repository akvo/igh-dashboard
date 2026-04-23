import { HEALTH_AREA_DISPLAY_NAMES } from './constants';

export function transformDiseaseSummaries(data) {
  if (!data || data.length === 0) return [];

  return data.map((item) => ({
    key: item.disease_group_name,
    name: item.disease_group_name,
    label: item.disease_group_name,
    group: HEALTH_AREA_DISPLAY_NAMES[item.global_health_area] || item.global_health_area,
    value: item.candidateCount + item.productCount,
    candidateCount: item.candidateCount,
    productCount: item.productCount,
  }));
}
