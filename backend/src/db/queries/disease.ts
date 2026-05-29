import { getDatabase } from "../connection.js";
import type { DiseaseSummary } from "../types.js";
import { addArrayCondition, PIPELINE_FILTER } from "./filterUtils.js";

interface DiseaseFilters {
  candidate_types?: string[];
  product_names?: string[];
  technology_types?: string[];
}

/**
 * Bubble-chart view: scale of R&D by primary disease (disease_filter).
 * One row per primary disease, counting distinct candidates and products.
 * Aggregates sub-types (e.g. P. falciparum, P. vivax) under their parent
 * primary disease (e.g. Malaria) so each primary appears as a single bubble.
 * global_health_area is preserved so the frontend can group or style
 * by GHA if ever needed.
 */
export function getDiseaseSummaries(filters?: DiseaseFilters): DiseaseSummary[] {
  const db = getDatabase();

  const joins = [
    "JOIN dim_disease d ON f.disease_key = d.disease_key",
    "JOIN dim_candidate_core c ON f.candidate_key = c.candidate_key",
  ];
  const conditions = [
    "f.is_active_flag = 1",
    PIPELINE_FILTER,
    "d.disease_filter IS NOT NULL",
    "d.disease_filter <> ''",
    "d.global_health_area IS NOT NULL",
  ];
  const params: (string | number)[] = [];

  if (filters?.candidate_types && filters.candidate_types.length > 0) {
    const placeholders = filters.candidate_types.map(() => "?").join(", ");
    conditions.push(`c.candidate_type IN (${placeholders})`);
    params.push(...filters.candidate_types);
  }

  const productCtx = { joins, join: "JOIN dim_product pr ON f.product_key = pr.product_key" };
  addArrayCondition(filters?.product_names, "pr.product_name", conditions, params, productCtx);

  const techCtx = {
    joins,
    join: "JOIN dim_candidate_tech t ON f.technology_key = t.technology_key",
  };
  addArrayCondition(filters?.technology_types, "t.technology_type", conditions, params, techCtx);

  const sql = `
    SELECT
      d.disease_filter AS disease_group_name,
      d.global_health_area,
      COUNT(DISTINCT CASE WHEN c.candidate_type = 'Candidate' THEN f.candidate_key END) as candidateCount,
      COUNT(DISTINCT CASE WHEN c.candidate_type = 'Product' THEN f.candidate_key END) as productCount
    FROM fact_pipeline_snapshot f
    ${joins.join("\n    ")}
    WHERE ${conditions.join("\n      AND ")}
    GROUP BY d.disease_filter, d.global_health_area
    ORDER BY candidateCount DESC, productCount DESC
  `;

  return db.prepare(sql).all(...params) as DiseaseSummary[];
}
