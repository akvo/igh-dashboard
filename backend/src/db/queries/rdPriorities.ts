import { getDatabase } from "../connection.js";
import type {
  RdPriorityNode,
  RdPriorityFilter,
  RdPriorityConnection,
} from "../types.js";
import { addArrayCondition } from "./filterUtils.js";

const MAX_LIMIT = 100;

// =========================================================
// Shared filter builder
// =========================================================

function buildWhere(filter?: RdPriorityFilter) {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  addArrayCondition(filter?.global_health_areas, "d.global_health_area", conditions, params);
  addArrayCondition(filter?.disease_names, "d.disease_group_name", conditions, params);

  if (filter?.search) {
    conditions.push("(p.priority_name LIKE ? OR p.rdpriorityid LIKE ?)");
    params.push(`%${filter.search}%`, `%${filter.search}%`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  return { whereClause, params };
}

// =========================================================
// R&D Priorities with Candidates (Tab 2)
// =========================================================

/**
 * Priorities joined with candidates via `bridge_candidate_priority`.
 * Each row is a priority–candidate pair so a single priority may
 * appear multiple times if it has several linked candidates.
 */
export function getRdPrioritiesWithCandidates(
  filter?: RdPriorityFilter,
  limit = 20,
  offset = 0,
): RdPriorityConnection {
  limit = Math.min(limit, MAX_LIMIT);
  const db = getDatabase();
  const { whereClause, params } = buildWhere(filter);

  const joins = `
    LEFT JOIN dim_disease d ON p.disease_key = d.disease_key
    LEFT JOIN dim_product pr ON p.product_key = pr.product_key
    LEFT JOIN bridge_candidate_priority bp ON p.priority_key = bp.priority_key
    LEFT JOIN dim_candidate_core c ON bp.candidate_key = c.candidate_key
  `;

  const countSql = `
    SELECT COUNT(*) as total
    FROM dim_priority p
    ${joins}
    ${whereClause}
  `;
  const countResult = db.prepare(countSql).get(...params) as { total: number };
  const totalCount = countResult.total;

  const dataSql = `
    SELECT
      p.priority_key,
      p.rdpriorityid,
      p.priority_name,
      p.indication,
      p.intended_use,
      d.disease_group_name AS disease_name,
      d.global_health_area,
      p.type_of_guidance,
      p.author,
      p.publication_date,
      p.target_population,
      p.efficacy,
      p.safety,
      p.source,
      pr.product_name,
      c.candidate_name,
      c.current_rd_stage
    FROM dim_priority p
    ${joins}
    ${whereClause}
    ORDER BY p.priority_name NULLS LAST
    LIMIT ? OFFSET ?
  `;
  const nodes = db.prepare(dataSql).all(...params, limit, offset) as RdPriorityNode[];

  return {
    nodes,
    totalCount,
    hasNextPage: offset + nodes.length < totalCount,
  };
}

// =========================================================
// R&D Priorities only (Tab 4)
// =========================================================

/**
 * Priorities without candidate joins — one row per priority.
 */
export function getRdPriorities(
  filter?: RdPriorityFilter,
  limit = 20,
  offset = 0,
): RdPriorityConnection {
  limit = Math.min(limit, MAX_LIMIT);
  const db = getDatabase();
  const { whereClause, params } = buildWhere(filter);

  const joins = `
    LEFT JOIN dim_disease d ON p.disease_key = d.disease_key
    LEFT JOIN dim_product pr ON p.product_key = pr.product_key
  `;

  const countSql = `
    SELECT COUNT(*) as total
    FROM dim_priority p
    ${joins}
    ${whereClause}
  `;
  const countResult = db.prepare(countSql).get(...params) as { total: number };
  const totalCount = countResult.total;

  const dataSql = `
    SELECT
      p.priority_key,
      p.rdpriorityid,
      p.priority_name,
      p.indication,
      p.intended_use,
      d.disease_group_name AS disease_name,
      d.global_health_area,
      p.type_of_guidance,
      p.author,
      p.publication_date,
      p.target_population,
      p.efficacy,
      p.safety,
      p.source,
      pr.product_name
    FROM dim_priority p
    ${joins}
    ${whereClause}
    ORDER BY p.priority_name NULLS LAST
    LIMIT ? OFFSET ?
  `;
  const nodes = db.prepare(dataSql).all(...params, limit, offset) as RdPriorityNode[];

  return {
    nodes,
    totalCount,
    hasNextPage: offset + nodes.length < totalCount,
  };
}
