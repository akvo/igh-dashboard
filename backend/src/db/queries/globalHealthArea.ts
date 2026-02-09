import { getDatabase } from "../connection.js";
import type { GlobalHealthAreaSummary } from "../types.js";

/**
 * Get global health area summaries for bubble chart visualization.
 * Returns candidate count, disease count, and product count per area.
 */
export function getGlobalHealthAreaSummaries(): GlobalHealthAreaSummary[] {
  const db = getDatabase();

  // Bubble Chart: Global health area summary
  // Groups by global_health_area and counts unique candidates, diseases, and products
  const rows = db
    .prepare(
      `
    SELECT
      d.global_health_area,
      COUNT(DISTINCT f.candidate_key) as candidateCount,
      COUNT(DISTINCT d.disease_key) as diseaseCount,
      COUNT(DISTINCT f.product_key) as productCount
    FROM fact_pipeline_snapshot f
    JOIN dim_disease d ON f.disease_key = d.disease_key
    WHERE f.is_active_flag = 1
      AND d.global_health_area IS NOT NULL
    GROUP BY d.global_health_area
    ORDER BY candidateCount DESC
  `,
    )
    .all() as GlobalHealthAreaSummary[];

  return rows;
}
