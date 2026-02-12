import { getDatabase } from "../connection.js";
import type { TemporalSnapshotRow } from "../types.js";

interface TemporalSnapshotFilters {
  years?: number[];
  disease_key?: number;
  global_health_area?: string;
  product_key?: number;
  candidate_type?: string;
}

// Maps scalar filter keys to their SQL condition and optional JOIN clause
const SCALAR_FILTER_MAP: Array<{
  key: keyof TemporalSnapshotFilters;
  condition: string;
  join?: string;
}> = [
  { key: "disease_key", condition: "f.disease_key = ?" },
  {
    key: "global_health_area",
    condition: "d.global_health_area = ?",
    join: "JOIN dim_disease d ON f.disease_key = d.disease_key",
  },
  { key: "product_key", condition: "f.product_key = ?" },
  {
    key: "candidate_type",
    condition: "c.candidate_type = ?",
    join: "JOIN dim_candidate_core c ON f.candidate_key = c.candidate_key",
  },
];

function buildTemporalQuery(filters?: TemporalSnapshotFilters) {
  const joins = [
    "JOIN dim_date dt ON f.date_key = dt.date_key",
    "JOIN dim_phase p ON f.phase_key = p.phase_key",
  ];
  const conditions = ["f.is_active_flag = 1", "dt.year IS NOT NULL", "p.phase_name IS NOT NULL"];
  const params: (number | string)[] = [];

  if (filters?.years && filters.years.length > 0) {
    const placeholders = filters.years.map(() => "?").join(", ");
    conditions.push(`dt.year IN (${placeholders})`);
    params.push(...filters.years);
  }

  for (const { key, condition, join } of SCALAR_FILTER_MAP) {
    const value = filters?.[key];
    if (value != null) {
      if (join) joins.push(join);
      conditions.push(condition);
      params.push(value as number | string);
    }
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
