import { getDatabase } from "../connection.js";
import type { DiseaseProductTypeSummary } from "../types.js";
import { addArrayCondition, PIPELINE_FILTER } from "./filterUtils.js";

interface DiseaseProductTypeFilters {
  candidate_types?: string[];
  global_health_areas?: string[];
  primary_disease_names?: string[];
  secondary_disease_names?: string[];
  product_names?: string[];
  phase_names?: string[];
}

/**
 * Bubble-chart view: scale of R&D by (disease × product type).
 * One row per (disease_group_name, product_type) bucket — the finest
 * grouping surfaced in the bubble chart. Candidate/product counts are
 * kept separate so the frontend's dropdown filter can choose either
 * (or both) without refetching.
 */
export function getDiseaseProductTypeSummaries(
  filters?: DiseaseProductTypeFilters,
): DiseaseProductTypeSummary[] {
  const db = getDatabase();

  const joins = [
    "JOIN dim_disease d ON f.disease_key = d.disease_key",
    "JOIN dim_candidate_core c ON f.candidate_key = c.candidate_key",
    "JOIN dim_product p ON f.product_key = p.product_key",
  ];
  const conditions = [
    "f.is_active_flag = 1",
    PIPELINE_FILTER,
    "d.disease_group_name IS NOT NULL",
    "d.global_health_area IS NOT NULL",
    "p.product_type IS NOT NULL",
  ];
  const params: (string | number)[] = [];

  if (filters?.candidate_types && filters.candidate_types.length > 0) {
    const placeholders = filters.candidate_types.map(() => "?").join(", ");
    conditions.push(`c.candidate_type IN (${placeholders})`);
    params.push(...filters.candidate_types);
  }

  // Global page filters. dim_disease (d) and dim_product (p) are already
  // joined for grouping; only phase adds a join, aliased `ph` because `p`
  // is taken by dim_product here.
  addArrayCondition(filters?.global_health_areas, "d.global_health_area", conditions, params);
  addArrayCondition(filters?.primary_disease_names, "d.disease_filter", conditions, params);
  addArrayCondition(
    filters?.secondary_disease_names,
    "d.secondary_disease_name",
    conditions,
    params,
  );
  addArrayCondition(filters?.product_names, "p.product_name", conditions, params);
  const phaseCtx = { joins, join: "JOIN dim_phase ph ON f.phase_key = ph.phase_key" };
  addArrayCondition(filters?.phase_names, "ph.phase_name", conditions, params, phaseCtx);

  const sql = `
    SELECT
      d.disease_group_name,
      d.global_health_area,
      p.product_type,
      COUNT(DISTINCT CASE WHEN c.candidate_type = 'Candidate' THEN f.candidate_key END) as candidateCount,
      COUNT(DISTINCT CASE WHEN c.candidate_type = 'Product' THEN f.candidate_key END) as productCount
    FROM fact_pipeline_snapshot f
    ${joins.join("\n    ")}
    WHERE ${conditions.join("\n      AND ")}
    GROUP BY d.disease_group_name, d.global_health_area, p.product_type
    ORDER BY candidateCount DESC, productCount DESC
  `;

  return db.prepare(sql).all(...params) as DiseaseProductTypeSummary[];
}
