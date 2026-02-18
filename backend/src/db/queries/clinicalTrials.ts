import { getDatabase } from "../connection.js";
import type {
  ClinicalTrialNode,
  ClinicalTrialFilter,
  ClinicalTrialConnection,
} from "../types.js";

const MAX_LIMIT = 100;

function buildWhere(filter?: ClinicalTrialFilter) {
  const joins = [
    "LEFT JOIN dim_candidate_core c ON t.candidate_key = c.candidate_key",
    "LEFT JOIN dim_disease d ON t.disease_key = d.disease_key",
    "LEFT JOIN dim_product pr ON t.product_key = pr.product_key",
    "LEFT JOIN dim_date dt ON t.start_date_key = dt.date_key",
  ];
  const conditions: string[] = [];
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

  if (filter?.status) {
    conditions.push("t.status = ?");
    params.push(filter.status);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  return { joins, whereClause, params };
}

/**
 * Get clinical trials with filtering and pagination.
 */
export function getClinicalTrials(
  filter?: ClinicalTrialFilter,
  limit = 20,
  offset = 0,
): ClinicalTrialConnection {
  limit = Math.min(limit, MAX_LIMIT);
  const db = getDatabase();
  const { joins, whereClause, params } = buildWhere(filter);

  const countSql = `
    SELECT COUNT(*) as total
    FROM fact_clinical_trial_event t
    ${joins.join("\n    ")}
    ${whereClause}
  `;
  const countResult = db.prepare(countSql).get(...params) as { total: number };
  const totalCount = countResult.total;

  const dataSql = `
    SELECT
      t.trial_id,
      t.vin_clinicaltrialid,
      t.trial_name,
      t.trial_title,
      t.trial_phase,
      t.status,
      c.candidate_name,
      d.disease_name,
      pr.product_name,
      dt.full_date as start_date
    FROM fact_clinical_trial_event t
    ${joins.join("\n    ")}
    ${whereClause}
    ORDER BY t.trial_id DESC
    LIMIT ? OFFSET ?
  `;
  const nodes = db
    .prepare(dataSql)
    .all(...params, limit, offset) as ClinicalTrialNode[];

  return {
    nodes,
    totalCount,
    hasNextPage: offset + nodes.length < totalCount,
  };
}
