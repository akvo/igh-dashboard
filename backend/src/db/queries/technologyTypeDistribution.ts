import { getDatabase } from "../connection.js";
import type { TechnologyTypeDistributionRow } from "../types.js";
import { addArrayCondition } from "./filterUtils.js";

interface TechnologyTypeDistributionFilters {
  global_health_areas?: string[];
  disease_names?: string[];
  product_names?: string[];
  candidate_type?: string;
}

/**
 * Get phase distribution grouped by technology type.
 * Returns candidate counts grouped by technology type and phase.
 */
export function getTechnologyTypeDistribution(
  filters?: TechnologyTypeDistributionFilters,
): TechnologyTypeDistributionRow[] {
  const db = getDatabase();

  const joins = [
    "JOIN dim_candidate_tech t ON f.technology_key = t.technology_key",
    "JOIN dim_phase p ON f.phase_key = p.phase_key",
  ];
  const conditions = [
    "f.is_active_flag = 1",
    "t.technology_type IS NOT NULL",
    "p.phase_name IS NOT NULL",
  ];
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

  const productCtx = { joins, join: "JOIN dim_product pr ON f.product_key = pr.product_key" };
  addArrayCondition(filters?.product_names, "pr.product_name", conditions, params, productCtx);

  if (filters?.candidate_type) {
    joins.push("JOIN dim_candidate_core c ON f.candidate_key = c.candidate_key");
    conditions.push("c.candidate_type = ?");
    params.push(filters.candidate_type);
  }

  const sql = `
    SELECT
      t.technology_type,
      p.phase_name,
      p.sort_order,
      COUNT(DISTINCT f.candidate_key) as candidateCount
    FROM fact_pipeline_snapshot f
    ${joins.join("\n    ")}
    WHERE ${conditions.join("\n      AND ")}
    GROUP BY t.technology_type, p.phase_name, p.sort_order
    ORDER BY t.technology_type, p.sort_order
  `;

  return db.prepare(sql).all(...params) as TechnologyTypeDistributionRow[];
}
