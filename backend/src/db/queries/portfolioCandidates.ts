import { getDatabase } from "../connection.js";
import type {
  PortfolioCandidateNode,
  PortfolioCandidateFilter,
  PortfolioCandidateConnection,
} from "../types.js";

const MAX_LIMIT = 100;

function buildWhere(filter?: PortfolioCandidateFilter) {
  const conditions = ["f.is_active_flag = 1"];
  const params: (string | number)[] = [];

  if (filter?.global_health_areas && filter.global_health_areas.length > 0) {
    const placeholders = filter.global_health_areas.map(() => "?").join(", ");
    conditions.push(`d.global_health_area IN (${placeholders})`);
    params.push(...filter.global_health_areas);
  }

  if (filter?.disease_names && filter.disease_names.length > 0) {
    const placeholders = filter.disease_names.map(() => "?").join(", ");
    conditions.push(`d.disease_name IN (${placeholders})`);
    params.push(...filter.disease_names);
  }

  if (filter?.product_names && filter.product_names.length > 0) {
    const placeholders = filter.product_names.map(() => "?").join(", ");
    conditions.push(`pr.product_name IN (${placeholders})`);
    params.push(...filter.product_names);
  }

  if (filter?.candidate_type) {
    conditions.push("c.candidate_type = ?");
    params.push(filter.candidate_type);
  }

  return { whereClause: `WHERE ${conditions.join(" AND ")}`, params };
}

const JOINS = `
    JOIN fact_pipeline_snapshot f ON c.candidate_key = f.candidate_key
    LEFT JOIN dim_disease d ON f.disease_key = d.disease_key
    LEFT JOIN dim_product pr ON f.product_key = pr.product_key
    LEFT JOIN dim_phase p ON f.phase_key = p.phase_key
    LEFT JOIN dim_candidate_regulatory r ON f.regulatory_key = r.regulatory_key
`;

/**
 * Get candidates with flattened dimension data for portfolio tables.
 */
export function getPortfolioCandidates(
  filter?: PortfolioCandidateFilter,
  limit = 20,
  offset = 0,
): PortfolioCandidateConnection {
  limit = Math.min(limit, MAX_LIMIT);
  const db = getDatabase();
  const { whereClause, params } = buildWhere(filter);

  const countSql = `
    SELECT COUNT(DISTINCT c.candidate_key) as total
    FROM dim_candidate_core c
    ${JOINS}
    ${whereClause}
  `;
  const countResult = db.prepare(countSql).get(...params) as { total: number };
  const totalCount = countResult.total;

  const dataSql = `
    SELECT DISTINCT
      c.candidate_key,
      c.candidate_name,
      c.candidate_type,
      c.alternative_names,
      c.current_rd_stage,
      c.countries_approved_count,
      c.countries_approved_agg,
      d.global_health_area,
      d.disease_name,
      pr.product_name,
      p.phase_name,
      r.approval_status,
      r.who_prequalification
    FROM dim_candidate_core c
    ${JOINS}
    ${whereClause}
    ORDER BY c.candidate_name
    LIMIT ? OFFSET ?
  `;
  const nodes = db
    .prepare(dataSql)
    .all(...params, limit, offset) as PortfolioCandidateNode[];

  return {
    nodes,
    totalCount,
    hasNextPage: offset + nodes.length < totalCount,
  };
}
