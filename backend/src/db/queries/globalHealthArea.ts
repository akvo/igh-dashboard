import { getDatabase } from "../connection.js";
import type { GlobalHealthAreaSummary } from "../types.js";
import { addArrayCondition, PIPELINE_FILTER } from "./filterUtils.js";

interface GlobalHealthAreaFilters {
  candidate_types?: string[];
  global_health_areas?: string[];
  primary_disease_names?: string[];
  secondary_disease_names?: string[];
  phase_names?: string[];
  product_names?: string[];
}

/**
 * Get global health area summaries for bubble chart visualization.
 * Returns candidate count, disease count, and product count per area.
 * Optionally filters by candidate type (Candidate/Product).
 */
export function getGlobalHealthAreaSummaries(
  filters?: GlobalHealthAreaFilters,
): GlobalHealthAreaSummary[] {
  const db = getDatabase();

  const joins = [
    "JOIN dim_disease d ON f.disease_key = d.disease_key",
    "JOIN dim_candidate_core c ON f.candidate_key = c.candidate_key",
  ];
  const conditions = ["f.is_active_flag = 1", PIPELINE_FILTER, "d.global_health_area IS NOT NULL"];
  const params: (string | number)[] = [];

  if (filters?.candidate_types && filters.candidate_types.length > 0) {
    const placeholders = filters.candidate_types.map(() => "?").join(", ");
    conditions.push(`c.candidate_type IN (${placeholders})`);
    params.push(...filters.candidate_types);
  }

  addArrayCondition(filters?.global_health_areas, "d.global_health_area", conditions, params);
  addArrayCondition(filters?.primary_disease_names, "d.disease_filter", conditions, params);
  addArrayCondition(
    filters?.secondary_disease_names,
    "d.secondary_disease_name",
    conditions,
    params,
  );
  const phaseCtx = { joins, join: "JOIN dim_phase p ON f.phase_key = p.phase_key" };
  addArrayCondition(filters?.phase_names, "p.phase_name", conditions, params, phaseCtx);
  const productCtx = { joins, join: "JOIN dim_product pr ON f.product_key = pr.product_key" };
  addArrayCondition(filters?.product_names, "pr.product_name", conditions, params, productCtx);

  // `diseaseCount` counts distinct hierarchy leaves per GHA -- the
  // sub-disease name when one exists, otherwise the primary name.
  // See `kpis.ts` for the full leaf-semantic explanation.
  const sql = `
    SELECT
      d.global_health_area,
      COUNT(DISTINCT CASE WHEN c.candidate_type = 'Candidate' THEN f.candidate_key END) as candidateCount,
      COUNT(DISTINCT COALESCE(d.secondary_disease_name, d.disease_filter)) as diseaseCount,
      COUNT(DISTINCT CASE WHEN c.candidate_type = 'Product' THEN f.candidate_key END) as productCount
    FROM fact_pipeline_snapshot f
    ${joins.join("\n    ")}
    WHERE ${conditions.join("\n      AND ")}
    GROUP BY d.global_health_area
    -- Sort by combined count so the highest-count GHA comes first regardless
    -- of candidate_type filter (the irrelevant count is always 0).
    ORDER BY (candidateCount + productCount) DESC
  `;

  return db.prepare(sql).all(...params) as GlobalHealthAreaSummary[];
}
