import { getDatabase } from "../connection.js";
import type { ProductPhaseDistributionRow } from "../types.js";

interface ProductPhaseDistributionFilters {
  global_health_areas?: string[];
  disease_names?: string[];
  product_names?: string[];
  candidate_type?: string;
}

/**
 * Get phase distribution grouped by product name.
 * Returns candidate counts grouped by product and phase.
 */
export function getProductPhaseDistribution(
  filters?: ProductPhaseDistributionFilters,
): ProductPhaseDistributionRow[] {
  const db = getDatabase();

  const joins = [
    "JOIN dim_product pr ON f.product_key = pr.product_key",
    "JOIN dim_phase p ON f.phase_key = p.phase_key",
  ];
  const conditions = [
    "f.is_active_flag = 1",
    "pr.product_name IS NOT NULL",
    "p.phase_name IS NOT NULL",
  ];
  const params: (string | number)[] = [];

  const needsDiseaseJoin =
    (filters?.global_health_areas && filters.global_health_areas.length > 0) ||
    (filters?.disease_names && filters.disease_names.length > 0);

  if (needsDiseaseJoin) {
    joins.push("JOIN dim_disease d ON f.disease_key = d.disease_key");
  }

  if (filters?.global_health_areas && filters.global_health_areas.length > 0) {
    const placeholders = filters.global_health_areas.map(() => "?").join(", ");
    conditions.push(`d.global_health_area IN (${placeholders})`);
    params.push(...filters.global_health_areas);
  }

  if (filters?.disease_names && filters.disease_names.length > 0) {
    const placeholders = filters.disease_names.map(() => "?").join(", ");
    conditions.push(`d.disease_name IN (${placeholders})`);
    params.push(...filters.disease_names);
  }

  if (filters?.product_names && filters.product_names.length > 0) {
    const placeholders = filters.product_names.map(() => "?").join(", ");
    conditions.push(`pr.product_name IN (${placeholders})`);
    params.push(...filters.product_names);
  }

  if (filters?.candidate_type) {
    joins.push(
      "JOIN dim_candidate_core c ON f.candidate_key = c.candidate_key",
    );
    conditions.push("c.candidate_type = ?");
    params.push(filters.candidate_type);
  }

  const sql = `
    SELECT
      pr.product_name,
      p.phase_name,
      p.sort_order,
      COUNT(DISTINCT f.candidate_key) as candidateCount
    FROM fact_pipeline_snapshot f
    ${joins.join("\n    ")}
    WHERE ${conditions.join("\n      AND ")}
    GROUP BY pr.product_name, p.phase_name, p.sort_order
    ORDER BY pr.product_name, p.sort_order
  `;

  return db.prepare(sql).all(...params) as ProductPhaseDistributionRow[];
}
