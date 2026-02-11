import { getDatabase } from "../connection.js";
import type {
  DimCandidateCore,
  CandidateConnection,
  CandidateFilter,
  FactPipelineSnapshot,
} from "../types.js";

const MAX_LIMIT = 100;

/**
 * Get candidates with filtering and pagination.
 */
export function getCandidates(
  filter?: CandidateFilter,
  limit = 20,
  offset = 0,
): CandidateConnection {
  limit = Math.min(limit, MAX_LIMIT);
  const db = getDatabase();

  // Build WHERE conditions based on filters
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filter?.is_active !== undefined) {
    conditions.push("f.is_active_flag = ?");
    params.push(filter.is_active ? 1 : 0);
  } else {
    // Default to active candidates
    conditions.push("f.is_active_flag = 1");
  }

  if (filter?.global_health_area) {
    conditions.push("d.global_health_area = ?");
    params.push(filter.global_health_area);
  }

  if (filter?.disease_key) {
    conditions.push("f.disease_key = ?");
    params.push(filter.disease_key);
  }

  if (filter?.product_key) {
    conditions.push("f.product_key = ?");
    params.push(filter.product_key);
  }

  if (filter?.phase_key) {
    conditions.push("f.phase_key = ?");
    params.push(filter.phase_key);
  }

  if (filter?.year) {
    conditions.push("dt.year = ?");
    params.push(filter.year);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Count total matching candidates
  const countSql = `
    SELECT COUNT(DISTINCT c.candidate_key) as total
    FROM dim_candidate_core c
    JOIN fact_pipeline_snapshot f ON c.candidate_key = f.candidate_key
    LEFT JOIN dim_disease d ON f.disease_key = d.disease_key
    LEFT JOIN dim_date dt ON f.date_key = dt.date_key
    ${whereClause}
  `;

  const countResult = db.prepare(countSql).get(...params) as { total: number };
  const totalCount = countResult.total;

  // Fetch paginated candidates
  const dataSql = `
    SELECT DISTINCT
      c.candidate_key,
      c.vin_candidateid,
      c.candidate_name,
      c.vin_candidate_code,
      c.developers_agg
    FROM dim_candidate_core c
    JOIN fact_pipeline_snapshot f ON c.candidate_key = f.candidate_key
    LEFT JOIN dim_disease d ON f.disease_key = d.disease_key
    LEFT JOIN dim_date dt ON f.date_key = dt.date_key
    ${whereClause}
    ORDER BY c.candidate_name
    LIMIT ? OFFSET ?
  `;

  const nodes = db.prepare(dataSql).all(...params, limit, offset) as DimCandidateCore[];

  return {
    nodes,
    totalCount,
    hasNextPage: offset + nodes.length < totalCount,
  };
}

/**
 * Get a single candidate by key.
 */
export function getCandidateByKey(candidate_key: number): DimCandidateCore | null {
  const db = getDatabase();

  const candidate = db
    .prepare(
      `
    SELECT
      candidate_key,
      vin_candidateid,
      candidate_name,
      vin_candidate_code,
      developers_agg
    FROM dim_candidate_core
    WHERE candidate_key = ?
  `,
    )
    .get(candidate_key) as DimCandidateCore | undefined;

  return candidate || null;
}

/**
 * Get the pipeline snapshot for a candidate (for joining related dimensions).
 */
export function getCandidateSnapshot(candidate_key: number): FactPipelineSnapshot | null {
  const db = getDatabase();

  const snapshot = db
    .prepare(
      `
    SELECT snapshot_id, candidate_key, product_key, disease_key,
           technology_key, regulatory_key, phase_key, date_key, is_active_flag
    FROM fact_pipeline_snapshot
    WHERE candidate_key = ?
      AND is_active_flag = 1
    LIMIT 1
  `,
    )
    .get(candidate_key) as FactPipelineSnapshot | undefined;

  return snapshot || null;
}
