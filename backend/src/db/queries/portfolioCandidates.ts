import { getDatabase } from "../connection.js";
import type {
  PortfolioCandidateNode,
  PortfolioCandidateFilter,
  PortfolioCandidateConnection,
} from "../types.js";
import { addArrayCondition, PIPELINE_FILTER } from "./filterUtils.js";

const MAX_LIMIT = 100;

function buildWhere(filter?: PortfolioCandidateFilter) {
  const conditions = ["f.is_active_flag = 1", PIPELINE_FILTER];
  const params: (string | number)[] = [];

  addArrayCondition(filter?.global_health_areas, "d.global_health_area", conditions, params);
  addArrayCondition(filter?.disease_names, "d.disease_group_name", conditions, params);
  addArrayCondition(filter?.product_names, "pr.product_name", conditions, params);
  addArrayCondition(filter?.phase_names, "p.phase_name", conditions, params);

  if (filter?.candidate_type) {
    conditions.push("c.candidate_type = ?");
    params.push(filter.candidate_type);
  }

  if (filter?.search) {
    conditions.push("(c.candidate_name LIKE ? OR c.alternative_names LIKE ?)");
    params.push(`%${filter.search}%`, `%${filter.search}%`);
  }

  return { whereClause: `WHERE ${conditions.join(" AND ")}`, params };
}

const JOINS = `
    JOIN fact_pipeline_snapshot f ON c.candidate_key = f.candidate_key
    LEFT JOIN dim_disease d ON f.disease_key = d.disease_key
    LEFT JOIN dim_product pr ON f.product_key = pr.product_key
    LEFT JOIN dim_phase p ON f.phase_key = p.phase_key
    LEFT JOIN dim_candidate_regulatory r ON f.regulatory_key = r.regulatory_key
    LEFT JOIN dim_disease sd ON f.secondary_disease_key = sd.disease_key
    LEFT JOIN dim_product sp ON f.sub_product_key = sp.product_key
    LEFT JOIN dim_candidate_tech t ON f.technology_key = t.technology_key
`;

/**
 * Get candidates with flattened dimension data for portfolio tables.
 */
// eslint-disable-next-line max-lines-per-function -- single query builder with count + data
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
    WITH ranked AS (
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
        t.technology_type,
        d.global_health_area,
        d.disease_group_name AS disease_name,
        sd.disease_group_name AS secondary_disease_name,
        pr.product_name,
        sp.product_name AS sub_product_name,
        p.phase_name,
        r.approval_status,
        r.who_prequalification,
        r.nra_approval_status,
        r.sra_approval_status,
        r.ema_approval_status,
        r.japanese_mhlw_approval_status,
        r.us_fda_approval_status,
        (SELECT GROUP_CONCAT(da.authority_name, '; ')
         FROM bridge_candidate_approving_authority baa
         JOIN dim_approving_authority da ON baa.authority_key = da.authority_key
         WHERE baa.candidate_key = c.candidate_key) AS approving_authorities_agg,
        ROW_NUMBER() OVER (
          PARTITION BY c.candidate_key
          ORDER BY COALESCE(p.sort_order, -1) DESC, f.snapshot_id DESC
        ) as rn
      FROM dim_candidate_core c
      ${JOINS}
      ${whereClause}
    )
    SELECT candidate_key, candidate_name, candidate_type, candidateid,
           alternative_names, current_rd_stage, countries_approved_count,
           countries_approved_agg, indication, target,
           developers_agg, mechanism_of_action, key_features,
           indication_type, healthcare_facility_level,
           preclinical_results_status, type_of_preclinical_results,
           preclinical_results_source, recent_updates, test_format,
           known_funders_agg, technology_type,
           global_health_area, disease_name, secondary_disease_name,
           product_name, sub_product_name, phase_name,
           approval_status, who_prequalification,
           nra_approval_status, sra_approval_status,
           ema_approval_status, japanese_mhlw_approval_status,
           us_fda_approval_status, approving_authorities_agg
    FROM ranked
    WHERE rn = 1
    ORDER BY candidate_name
    LIMIT ? OFFSET ?
  `;
  const nodes = db.prepare(dataSql).all(...params, limit, offset) as PortfolioCandidateNode[];

  return {
    nodes,
    totalCount,
    hasNextPage: offset + nodes.length < totalCount,
  };
}
