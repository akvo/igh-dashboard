import { getDatabase } from "../connection.js";
import type { TemporalSnapshotRow } from "../types.js";
import { addArrayCondition } from "./filterUtils.js";

interface TemporalSnapshotFilters {
  years?: number[];
  disease_group_names?: string[];
  global_health_areas?: string[];
  product_keys?: number[];
  candidate_type?: string;
}

const DISEASE_JOIN = "JOIN dim_disease d ON f.disease_key = d.disease_key";

function buildTemporalQuery(filters?: TemporalSnapshotFilters) {
  const joins = [
    "JOIN dim_date dt ON f.date_key = dt.date_key",
    "JOIN dim_phase p ON f.phase_key = p.phase_key",
  ];
  const conditions = ["f.is_active_flag = 1", "dt.year IS NOT NULL", "p.phase_name IS NOT NULL"];
  const params: (number | string)[] = [];

  addArrayCondition(filters?.years, "dt.year", conditions, params);
  const diseaseCtx = { joins, join: DISEASE_JOIN };
  addArrayCondition(
    filters?.disease_group_names,
    "d.disease_group_name",
    conditions,
    params,
    diseaseCtx,
  );
  addArrayCondition(filters?.product_keys, "f.product_key", conditions, params);
  addArrayCondition(
    filters?.global_health_areas,
    "d.global_health_area",
    conditions,
    params,
    diseaseCtx,
  );

  if (filters?.candidate_type) {
    joins.push("JOIN dim_candidate_core c ON f.candidate_key = c.candidate_key");
    conditions.push("c.candidate_type = ?");
    params.push(filters.candidate_type);
  }

  return { joins, conditions, params };
}

/**
 * Get temporal snapshots for cross-pipeline analysis.
 * Returns candidate counts by year and phase.
 */
export function getTemporalSnapshots(filters?: TemporalSnapshotFilters): TemporalSnapshotRow[] {
  const db = getDatabase();
  const { joins, conditions, params } = buildTemporalQuery(filters);

  const sql = `
    SELECT
      dt.year,
      p.phase_name,
      p.sort_order,
      COUNT(DISTINCT f.candidate_key) as candidateCount
    FROM fact_pipeline_snapshot f
    ${joins.join("\n    ")}
    WHERE ${conditions.join("\n      AND ")}
    GROUP BY dt.year, p.phase_name, p.sort_order
    ORDER BY dt.year, p.sort_order
  `;

  return db.prepare(sql).all(...params) as TemporalSnapshotRow[];
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
  `,
    )
    .all() as { year: number }[];

  return rows.map((r) => r.year);
}
