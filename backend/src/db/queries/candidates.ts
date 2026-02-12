import { getDatabase } from "../connection.js";
import type {
  DimCandidateCore,
  CandidateConnection,
  CandidateFilter,
  FactPipelineSnapshot,
} from "../types.js";

const MAX_LIMIT = 100;

const FILTER_COLUMN_MAP: Array<[keyof CandidateFilter, string]> = [
  ["global_health_area", "d.global_health_area = ?"],
  ["disease_key", "f.disease_key = ?"],
  ["product_key", "f.product_key = ?"],
  ["phase_key", "f.phase_key = ?"],
  ["year", "dt.year = ?"],
];

function buildCandidateWhereClause(filter?: CandidateFilter): {
  whereClause: string;
  params: (string | number)[];
} {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  // is_active has special default-to-true logic
  if (filter?.is_active !== undefined) {
    conditions.push("f.is_active_flag = ?");
    params.push(filter.is_active ? 1 : 0);
  } else {
    conditions.push("f.is_active_flag = 1");
  }

  for (const [key, sql] of FILTER_COLUMN_MAP) {
    if (filter?.[key] != null) {
      conditions.push(sql);
      params.push(filter[key] as string | number);
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return { whereClause, params };
}

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
  const { whereClause, params } = buildCandidateWhereClause(filter);

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
    ORDER BY snapshot_id DESC
    LIMIT 1
  `,
    )
    .get(candidate_key) as FactPipelineSnapshot | undefined;

  return snapshot || null;
}
