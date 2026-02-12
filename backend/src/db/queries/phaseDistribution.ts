import { getDatabase } from "../connection.js";
import type { PhaseDistributionRow } from "../types.js";

interface PhaseDistributionFilters {
  global_health_area?: string;
  product_key?: number;
  candidate_type?: string;
}

/**
 * Get phase distribution for stacked bar chart visualization.
 * Returns candidate counts grouped by global health area and phase.
 */
export function getPhaseDistribution(filters?: PhaseDistributionFilters): PhaseDistributionRow[] {
  const db = getDatabase();

  // Stacked Bar Chart: Phase distribution by global health area
  // Counts candidates per phase within each global health area
  const joins = [
    "JOIN dim_disease d ON f.disease_key = d.disease_key",
    "JOIN dim_phase p ON f.phase_key = p.phase_key",
  ];
  const conditions = [
    "f.is_active_flag = 1",
    "d.global_health_area IS NOT NULL",
    "p.phase_name IS NOT NULL",
  ];
  const params: (string | number)[] = [];

  if (filters?.global_health_area) {
    conditions.push("d.global_health_area = ?");
    params.push(filters.global_health_area);
  }

  if (filters?.product_key) {
    conditions.push("f.product_key = ?");
    params.push(filters.product_key);
  }

  if (filters?.candidate_type) {
    joins.push("JOIN dim_candidate_core c ON f.candidate_key = c.candidate_key");
    conditions.push("c.candidate_type = ?");
    params.push(filters.candidate_type);
  }

  const sql = `
    SELECT
      d.global_health_area,
      p.phase_name,
      p.sort_order,
      COUNT(DISTINCT f.candidate_key) as candidateCount
    FROM fact_pipeline_snapshot f
    ${joins.join("\n    ")}
    WHERE ${conditions.join("\n      AND ")}
    GROUP BY d.global_health_area, p.phase_name, p.sort_order
    ORDER BY d.global_health_area, p.sort_order
  `;

  const rows = db.prepare(sql).all(...params) as PhaseDistributionRow[];

  return rows;
}
