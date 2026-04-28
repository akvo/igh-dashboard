import { getDatabase } from "../connection.js";
import type { TemporalSnapshotRow, PipelineFilterPair } from "../types.js";
import { addArrayCondition, PIPELINE_FILTER } from "./filterUtils.js";

interface TemporalSnapshotFilters {
  years?: number[];
  primary_disease_names?: string[];
  secondary_disease_names?: string[];
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
  const conditions = [PIPELINE_FILTER, "dt.year IS NOT NULL", "p.phase_name IS NOT NULL"];
  const params: (number | string)[] = [];

  addArrayCondition(filters?.years, "dt.year", conditions, params);
  const diseaseCtx = { joins, join: DISEASE_JOIN };
  addArrayCondition(
    filters?.primary_disease_names,
    "d.disease_filter",
    conditions,
    params,
    diseaseCtx,
  );
  addArrayCondition(
    filters?.secondary_disease_names,
    "d.secondary_disease_name",
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
 * Get distinct (disease_group_name, product_key, product_name) tuples present
 * in the pipeline.  Used app-wide for client-side disease↔product cross-filtering.
 */
export function getPipelineFilterPairs(): PipelineFilterPair[] {
  const db = getDatabase();

  return db
    .prepare(
      `
    SELECT DISTINCT
      dd.disease_group_name,
      dd.disease_filter,
      dd.secondary_disease_name,
      f.product_key,
      dp.product_name,
      ph.phase_name
    FROM fact_pipeline_snapshot f
    JOIN dim_disease dd ON f.disease_key = dd.disease_key
    JOIN dim_product dp ON f.product_key = dp.product_key
    LEFT JOIN dim_phase ph ON f.phase_key = ph.phase_key
    WHERE ${PIPELINE_FILTER}
      AND dd.disease_group_name IS NOT NULL
      AND f.product_key IS NOT NULL
  `,
    )
    .all() as PipelineFilterPair[];
}

/**
 * Like `getPipelineFilterPairs`, but additionally restricts to rows the
 * active-pipeline chart aggregations actually count: `is_active_flag = 1`
 * and `candidate_type IN ('Candidate', 'Product')`.  Used by Portfolio
 * Overview / Portfolio Analysis dropdowns so that every option offered
 * to the user resolves to a non-empty chart.
 *
 * Schema parity with `getPipelineFilterPairs`: same columns, same
 * `PipelineFilterPair` row shape — only the WHERE clause differs.
 * If a column is added to one, add it to the other.
 */
export function getActivePipelineFilterPairs(): PipelineFilterPair[] {
  const db = getDatabase();

  return db
    .prepare(
      `
    SELECT DISTINCT dd.disease_group_name, f.product_key, dp.product_name, ph.phase_name
    FROM fact_pipeline_snapshot f
    JOIN dim_disease dd ON f.disease_key = dd.disease_key
    JOIN dim_product dp ON f.product_key = dp.product_key
    JOIN dim_candidate_core c ON f.candidate_key = c.candidate_key
    LEFT JOIN dim_phase ph ON f.phase_key = ph.phase_key
    WHERE ${PIPELINE_FILTER}
      AND f.is_active_flag = 1
      AND c.candidate_type IN ('Candidate', 'Product')
      AND dd.disease_group_name IS NOT NULL
      AND f.product_key IS NOT NULL
  `,
    )
    .all() as PipelineFilterPair[];
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
    WHERE f.include_in_pipeline = 1
      AND dt.year IS NOT NULL
    ORDER BY dt.year
  `,
    )
    .all() as { year: number }[];

  return rows.map((r) => r.year);
}
