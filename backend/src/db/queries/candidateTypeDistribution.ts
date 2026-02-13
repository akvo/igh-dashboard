import { getDatabase } from "../connection.js";
import type { CandidateTypeDistributionRow } from "../types.js";

interface CandidateTypeDistributionFilters {
  product_key?: number;
  phase_names?: string[];
}

/**
 * Get candidate type distribution for stacked bar chart visualization.
 * Returns candidate counts grouped by global health area and candidate type (Product/Candidate).
 */
export function getCandidateTypeDistribution(
  filters?: CandidateTypeDistributionFilters,
): CandidateTypeDistributionRow[] {
  const db = getDatabase();

  const joins = [
    "JOIN dim_disease d ON f.disease_key = d.disease_key",
    "JOIN dim_candidate_core c ON f.candidate_key = c.candidate_key",
  ];
  const conditions = [
    "f.is_active_flag = 1",
    "d.global_health_area IS NOT NULL",
    "c.candidate_type IS NOT NULL",
    "c.candidate_type IN ('Candidate', 'Product')",
  ];
  const params: (string | number)[] = [];

  if (filters?.product_key) {
    conditions.push("f.product_key = ?");
    params.push(filters.product_key);
  }

  if (filters?.phase_names && filters.phase_names.length > 0) {
    joins.push("JOIN dim_phase p ON f.phase_key = p.phase_key");
    const placeholders = filters.phase_names.map(() => "?").join(", ");
    conditions.push(`p.phase_name IN (${placeholders})`);
    params.push(...filters.phase_names);
  }

  const sql = `
    SELECT
      d.global_health_area,
      c.candidate_type,
      COUNT(DISTINCT f.candidate_key) as candidateCount
    FROM fact_pipeline_snapshot f
    ${joins.join("\n    ")}
    WHERE ${conditions.join("\n      AND ")}
    GROUP BY d.global_health_area, c.candidate_type
    ORDER BY d.global_health_area, c.candidate_type
  `;

  const rows = db.prepare(sql).all(...params) as CandidateTypeDistributionRow[];

  return rows;
}
