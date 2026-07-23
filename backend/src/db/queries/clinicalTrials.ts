import { getDatabase } from "../connection.js";
import type { ClinicalTrialNode, ClinicalTrialFilter, ClinicalTrialConnection } from "../types.js";
import { addArrayCondition } from "./filterUtils.js";
import { buildColumnFilterClauses, buildOrderBy, type ColumnSortInput } from "./columnFilters.js";

const MAX_LIMIT = 100;

function buildWhere(filter?: ClinicalTrialFilter) {
  const joins = [
    "JOIN fact_pipeline_snapshot fps ON t.candidate_key = fps.candidate_key AND fps.is_active_flag = 1 AND fps.include_in_pipeline = 1",
    "LEFT JOIN dim_candidate_core c ON t.candidate_key = c.candidate_key",
    "LEFT JOIN dim_disease d ON t.disease_key = d.disease_key",
    "LEFT JOIN dim_product pr ON t.product_key = pr.product_key",
    "LEFT JOIN dim_date dt ON t.start_date_key = dt.date_key",
    "LEFT JOIN dim_date dt2 ON t.end_date_key = dt2.date_key",
    "LEFT JOIN dim_date dt3 ON t.last_updated_key = dt3.date_key",
  ];
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  addArrayCondition(filter?.global_health_areas, "d.global_health_area", conditions, params);
  addArrayCondition(filter?.primary_disease_names, "d.disease_filter", conditions, params);
  addArrayCondition(
    filter?.secondary_disease_names,
    "d.secondary_disease_name",
    conditions,
    params,
  );
  addArrayCondition(filter?.product_names, "pr.product_name", conditions, params);

  addArrayCondition(filter?.statuses, "t.status", conditions, params);

  if (filter?.column_filters) {
    const cf = buildColumnFilterClauses("CLINICAL_TRIALS", filter.column_filters);
    conditions.push(...cf.conditions);
    params.push(...cf.params);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  return { joins, whereClause, params };
}

/**
 * Get clinical trials with filtering and pagination.
 */
export function getClinicalTrials(
  filter?: ClinicalTrialFilter,
  sort: ColumnSortInput[] | null = null,
  limit = 20,
  offset = 0,
): ClinicalTrialConnection {
  limit = Math.min(limit, MAX_LIMIT);
  const db = getDatabase();
  const { joins, whereClause, params } = buildWhere(filter);

  const orderBy = buildOrderBy("CLINICAL_TRIALS", sort) ?? "ORDER BY t.trial_id DESC NULLS LAST";

  const countSql = `
    SELECT COUNT(DISTINCT t.trial_id) as total
    FROM fact_clinical_trial_event t
    ${joins.join("\n    ")}
    ${whereClause}
  `;
  const countResult = db.prepare(countSql).get(...params) as { total: number };
  const totalCount = countResult.total;

  const dataSql = `
    SELECT DISTINCT
      t.trial_id,
      t.clinicaltrialid,
      t.trial_name,
      t.trial_title,
      t.trial_phase,
      t.status,
      c.candidate_name,
      d.disease_label AS disease_name,
      pr.product_name,
      dt.full_date as start_date,
      dt2.full_date as end_date,
      dt3.full_date as last_updated,
      t.description,
      t.ct_results_status,
      t.collaborator,
      t.locations,
      t.sponsor,
      t.source_text,
      t.age_groups,
      t.enrollment_count,
      t.study_type,
      t.funder_type,
      t.interventions,
      t.outcome_measure,
      t.sex,
      t.study_design,
      t.ct_results_type,
      t.ct_terminated_reason
    FROM fact_clinical_trial_event t
    ${joins.join("\n    ")}
    ${whereClause}
    ${orderBy}
    LIMIT ? OFFSET ?
  `;
  const nodes = db.prepare(dataSql).all(...params, limit, offset) as ClinicalTrialNode[];

  return {
    nodes,
    totalCount,
    hasNextPage: offset + nodes.length < totalCount,
  };
}
