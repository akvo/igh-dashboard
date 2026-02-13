import { getDatabase } from "../connection.js";
import type { GlobalHealthAreaSummary } from "../types.js";

interface GlobalHealthAreaFilters {
  candidate_types?: string[];
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

  const joins = ["JOIN dim_disease d ON f.disease_key = d.disease_key"];
  const conditions = ["f.is_active_flag = 1", "d.global_health_area IS NOT NULL"];
  const params: (string | number)[] = [];

  if (filters?.candidate_types && filters.candidate_types.length > 0) {
    joins.push("JOIN dim_candidate_core c ON f.candidate_key = c.candidate_key");
    const placeholders = filters.candidate_types.map(() => "?").join(", ");
    conditions.push(`c.candidate_type IN (${placeholders})`);
    params.push(...filters.candidate_types);
  }

  const sql = `
    SELECT
      d.global_health_area,
      COUNT(DISTINCT f.candidate_key) as candidateCount,
      COUNT(DISTINCT d.disease_key) as diseaseCount,
      COUNT(DISTINCT f.product_key) as productCount
    FROM fact_pipeline_snapshot f
    ${joins.join("\n    ")}
    WHERE ${conditions.join("\n      AND ")}
    GROUP BY d.global_health_area
    ORDER BY candidateCount DESC
  `;

  return db.prepare(sql).all(...params) as GlobalHealthAreaSummary[];
}
