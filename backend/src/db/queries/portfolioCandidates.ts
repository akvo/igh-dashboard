import { getDatabase } from "../connection.js";
import type {
  PortfolioCandidateNode,
  PortfolioCandidateFilter,
  PortfolioCandidateConnection,
} from "../types.js";
import { addArrayCondition, PIPELINE_FILTER } from "./filterUtils.js";
import { buildColumnFilterClauses, buildOrderBy, type ColumnSortInput } from "./columnFilters.js";

const MAX_LIMIT = 100;

function buildWhere(filter?: PortfolioCandidateFilter) {
  const conditions = ["f.is_active_flag = 1", PIPELINE_FILTER];
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
  addArrayCondition(filter?.phase_names, "p.phase_name", conditions, params);

  if (filter?.candidate_type) {
    conditions.push("c.candidate_type = ?");
    params.push(filter.candidate_type);
  }

  if (filter?.column_filters) {
    const cf = buildColumnFilterClauses("PORTFOLIO_CANDIDATES", filter.column_filters);
    conditions.push(...cf.conditions);
    params.push(...cf.params);
  }

  return { whereClause: `WHERE ${conditions.join(" AND ")}`, params };
}

const JOINS = `
    JOIN fact_pipeline_snapshot f ON c.candidate_key = f.candidate_key
    LEFT JOIN dim_disease d ON f.disease_key = d.disease_key
    LEFT JOIN dim_product pr ON f.product_key = pr.product_key
    LEFT JOIN dim_phase p ON f.phase_key = p.phase_key
    LEFT JOIN dim_candidate_regulatory r ON f.regulatory_key = r.regulatory_key
    LEFT JOIN dim_product sp ON f.sub_product_key = sp.product_key
    LEFT JOIN dim_candidate_tech t ON f.technology_key = t.technology_key
`;

/**
 * Get candidates with flattened dimension data for portfolio tables.
 */
// eslint-disable-next-line max-lines-per-function -- single query builder with count + data
export function getPortfolioCandidates(
  filter?: PortfolioCandidateFilter,
  sort: ColumnSortInput | null = null,
  limit = 20,
  offset = 0,
): PortfolioCandidateConnection {
  limit = Math.min(limit, MAX_LIMIT);
  const db = getDatabase();
  const { whereClause, params } = buildWhere(filter);

  const orderBy =
    buildOrderBy("PORTFOLIO_CANDIDATES", sort) ?? "ORDER BY c.candidate_name NULLS LAST";

  const countSql = `
    SELECT COUNT(DISTINCT c.candidate_key) as total
    FROM dim_candidate_core c
    ${JOINS}
    ${whereClause}
  `;
  const countResult = db.prepare(countSql).get(...params) as { total: number };
  const totalCount = countResult.total;

  const dataSql = `
    WITH page AS (
      SELECT
        c.candidate_key,
        c.candidate_name,
        c.candidate_type,
        c.candidateid,
        c.alternative_names,
        c.current_rd_stage,
        c.countries_approved_count,
        c.countries_approved_agg,
        c.indication,
        c.target,
        c.developers_agg,
        c.mechanism_of_action,
        c.key_features,
        c.indication_type,
        c.healthcare_facility_level,
        c.preclinical_results_status,
        c.type_of_preclinical_results,
        c.preclinical_results_source,
        c.recent_updates,
        c.test_format,
        c.known_funders_agg,
        c.technology_principle,
        c.target_population,
        c.route_of_administration,
        c.platform,
        c.chim_study,
        c.key_clinical_trial,
        t.technology_type,
        d.global_health_area,
        d.disease_filter AS disease_name,
        d.secondary_disease_name AS secondary_disease_name,
        pr.product_name,
        sp.product_name AS sub_product_name,
        p.phase_name,
        r.approval_status,
        r.who_prequalification,
        r.nra_approval_status,
        r.sra_approval_status,
        r.ema_approval_status,
        r.japanese_mhlw_approval_status,
        r.us_fda_approval_status
      FROM dim_candidate_core c
      ${JOINS}
      ${whereClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    )
    SELECT page.*,
      (SELECT GROUP_CONCAT(da.authority_name, '; ')
       FROM bridge_candidate_approving_authority baa
       JOIN dim_approving_authority da ON baa.authority_key = da.authority_key
       WHERE baa.candidate_key = page.candidate_key) AS approving_authorities_agg,
      (SELECT p23.phase_name
       FROM fact_pipeline_snapshot f23
       JOIN dim_date dt23 ON f23.date_key = dt23.date_key
       LEFT JOIN dim_phase p23 ON f23.phase_key = p23.phase_key
       WHERE f23.candidate_key = page.candidate_key AND dt23.year <= 2023
       ORDER BY dt23.year DESC LIMIT 1) AS rd_stage_2023,
      (SELECT p19.phase_name
       FROM fact_pipeline_snapshot f19
       JOIN dim_date dt19 ON f19.date_key = dt19.date_key
       LEFT JOIN dim_phase p19 ON f19.phase_key = p19.phase_key
       WHERE f19.candidate_key = page.candidate_key AND dt19.year <= 2019
       ORDER BY dt19.year DESC LIMIT 1) AS rd_stage_2019
    FROM page
  `;
  const nodes = db.prepare(dataSql).all(...params, limit, offset) as PortfolioCandidateNode[];

  return {
    nodes,
    totalCount,
    hasNextPage: offset + nodes.length < totalCount,
  };
}
