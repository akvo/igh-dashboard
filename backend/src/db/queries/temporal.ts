import { getDatabase } from "../connection.js";
import type { TemporalSnapshotRow } from "../types.js";

interface TemporalSnapshotFilters {
  years?: number[];
  disease_key?: number;
}

/**
 * Get temporal snapshots for cross-pipeline analysis.
 * Returns candidate counts by year and phase.
 */
export function getTemporalSnapshots(
  filters?: TemporalSnapshotFilters
): TemporalSnapshotRow[] {
  const db = getDatabase();

  // Cross-pipeline temporal analysis
  // Counts candidates per year and phase
  let sql = `
    SELECT
      dt.year,
      p.phase_name,
      p.sort_order,
      COUNT(DISTINCT f.candidate_key) as candidateCount
    FROM fact_pipeline_snapshot f
    JOIN dim_date dt ON f.date_key = dt.date_key
    JOIN dim_phase p ON f.phase_key = p.phase_key
    WHERE f.is_active_flag = 1
      AND dt.year IS NOT NULL
      AND p.phase_name IS NOT NULL
  `;

  const params: (number | string)[] = [];

  if (filters?.years && filters.years.length > 0) {
    const placeholders = filters.years.map(() => "?").join(", ");
    sql += ` AND dt.year IN (${placeholders})`;
    params.push(...filters.years);
  }

  if (filters?.disease_key) {
    sql += ` AND f.disease_key = ?`;
    params.push(filters.disease_key);
  }

  sql += `
    GROUP BY dt.year, p.phase_name, p.sort_order
    ORDER BY dt.year, p.sort_order
  `;

  const rows = db.prepare(sql).all(...params) as TemporalSnapshotRow[];

  return rows;
}

/**
 * Get available years in the dataset.
 */
export function getAvailableYears(): number[] {
  const db = getDatabase();

  const rows = db
    .prepare(
      `
    SELECT DISTINCT dt.year
    FROM fact_pipeline_snapshot f
    JOIN dim_date dt ON f.date_key = dt.date_key
    WHERE f.is_active_flag = 1
      AND dt.year IS NOT NULL
    ORDER BY dt.year
  `
    )
    .all() as { year: number }[];

  return rows.map((r) => r.year);
}
