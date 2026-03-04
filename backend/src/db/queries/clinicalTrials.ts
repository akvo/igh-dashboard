import { getDatabase } from "../connection.js";
import type { ClinicalTrialNode, ClinicalTrialFilter, ClinicalTrialConnection } from "../types.js";
import { addArrayCondition } from "./filterUtils.js";

const MAX_LIMIT = 100;

function buildWhere(filter?: ClinicalTrialFilter) {
  const joins = [
    "LEFT JOIN dim_candidate_core c ON t.candidate_key = c.candidate_key",
    "LEFT JOIN dim_disease d ON t.disease_key = d.disease_key",
    "LEFT JOIN dim_product pr ON t.product_key = pr.product_key",
    "LEFT JOIN dim_date dt ON t.start_date_key = dt.date_key",
    "LEFT JOIN dim_date dt2 ON t.end_date_key = dt2.date_key",
  ];
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  addArrayCondition(filter?.global_health_areas, "d.global_health_area", conditions, params);
  addArrayCondition(filter?.disease_names, "d.disease_group_name", conditions, params);
  addArrayCondition(filter?.product_names, "pr.product_name", conditions, params);

  if (filter?.status) {
    conditions.push("t.status = ?");
    params.push(filter.status);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

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
      t.clinicaltrialid,
      t.trial_name,
      t.trial_title,
      t.trial_phase,
      t.status,
      c.candidate_name,
      d.disease_group_name AS disease_name,
      pr.product_name,
      dt.full_date as start_date,
      dt2.full_date as end_date,
      t.description,
      t.ct_results_status,
      t.collaborator,
      t.locations,
      t.sponsor,
      t.source_text,
      t.age_groups,
      t.enrollment_count,
      t.study_type
    FROM fact_clinical_trial_event t
    ${joins.join("\n    ")}
    ${whereClause}
    ORDER BY t.trial_id DESC
    LIMIT ? OFFSET ?
  `;
  const nodes = db.prepare(dataSql).all(...params, limit, offset) as ClinicalTrialNode[];

  return {
    nodes,
    totalCount,
    hasNextPage: offset + nodes.length < totalCount,
  };
}
