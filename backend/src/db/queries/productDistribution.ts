import { getDatabase } from "../connection.js";
import type { ProductDistributionRow } from "../types.js";
import { addArrayCondition, PIPELINE_FILTER } from "./filterUtils.js";

interface ProductDistributionFilters {
  global_health_areas?: string[];
  disease_names?: string[];
  product_names?: string[];
  candidate_type?: string;
  phase_names?: string[];
}

/**
 * Get candidate count grouped by product name.
 * Returns data suitable for donut chart.
 */
export function getProductDistribution(
  filters?: ProductDistributionFilters,
): ProductDistributionRow[] {
  const db = getDatabase();

  const joins = ["JOIN dim_product pr ON f.product_key = pr.product_key"];
  const conditions = ["f.is_active_flag = 1", PIPELINE_FILTER, "pr.product_name IS NOT NULL"];
  const params: (string | number)[] = [];

  const diseaseCtx = { joins, join: "JOIN dim_disease d ON f.disease_key = d.disease_key" };
  addArrayCondition(
    filters?.global_health_areas,
    "d.global_health_area",
    conditions,
    params,
    diseaseCtx,
  );
  addArrayCondition(filters?.disease_names, "d.disease_group_name", conditions, params, diseaseCtx);
  addArrayCondition(filters?.product_names, "pr.product_name", conditions, params);

  const phaseCtx = { joins, join: "JOIN dim_phase p ON f.phase_key = p.phase_key" };
  addArrayCondition(filters?.phase_names, "p.phase_name", conditions, params, phaseCtx);

  if (filters?.candidate_type) {
    joins.push("JOIN dim_candidate_core c ON f.candidate_key = c.candidate_key");
    conditions.push("c.candidate_type = ?");
    params.push(filters.candidate_type);
  }

  const sql = `
    SELECT
      pr.product_name,
      COUNT(DISTINCT f.candidate_key) as candidateCount
    FROM fact_pipeline_snapshot f
    ${joins.join("\n    ")}
    WHERE ${conditions.join("\n      AND ")}
    GROUP BY pr.product_name
    ORDER BY candidateCount DESC
  `;

  return db.prepare(sql).all(...params) as ProductDistributionRow[];
}
