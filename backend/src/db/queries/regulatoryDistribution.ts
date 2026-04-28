import { getDatabase } from "../connection.js";
import type {
  ApprovalStatusRow,
  WHOPrequalRow,
  ApprovingAuthorityRow,
  RegulatoryDistribution,
} from "../types.js";
import { addArrayCondition, PIPELINE_FILTER } from "./filterUtils.js";

interface RegulatoryDistributionFilters {
  global_health_areas?: string[];
  primary_disease_names?: string[];
  secondary_disease_names?: string[];
  product_names?: string[];
  phase_names?: string[];
}

const DISEASE_JOIN = "JOIN dim_disease d ON f.disease_key = d.disease_key";

/**
 * Build shared joins/conditions for regulatory queries.
 */
function buildFilterClauses(filters?: RegulatoryDistributionFilters) {
  const joins = [
    "JOIN dim_candidate_regulatory r ON f.regulatory_key = r.regulatory_key",
    "JOIN dim_candidate_core c ON f.candidate_key = c.candidate_key",
  ];
  const conditions = ["f.is_active_flag = 1", PIPELINE_FILTER, "c.candidate_type = 'Product'"];
  const params: (string | number)[] = [];

  const diseaseCtx = { joins, join: DISEASE_JOIN };
  addArrayCondition(
    filters?.global_health_areas,
    "d.global_health_area",
    conditions,
    params,
    diseaseCtx,
  );
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

  const productCtx = { joins, join: "JOIN dim_product pr ON f.product_key = pr.product_key" };
  addArrayCondition(filters?.product_names, "pr.product_name", conditions, params, productCtx);

  const phaseCtx = { joins, join: "JOIN dim_phase p ON f.phase_key = p.phase_key" };
  addArrayCondition(filters?.phase_names, "p.phase_name", conditions, params, phaseCtx);

  return { joins, conditions, params };
}

/**
 * Get regulatory distribution for approved products tab.
 * Returns approval status breakdown and WHO prequalification breakdown.
 */
export function getRegulatoryDistribution(
  filters?: RegulatoryDistributionFilters,
): RegulatoryDistribution {
  const db = getDatabase();

  // Approval status distribution
  const as = buildFilterClauses(filters);
  const approvalSql = `
    SELECT
      COALESCE(r.approval_status, 'Unknown') as approval_status,
      COUNT(DISTINCT f.candidate_key) as candidateCount
    FROM fact_pipeline_snapshot f
    ${as.joins.join("\n    ")}
    WHERE ${as.conditions.join("\n      AND ")}
    GROUP BY COALESCE(r.approval_status, 'Unknown')
    ORDER BY candidateCount DESC
  `;

  const approvalStatus = db.prepare(approvalSql).all(...as.params) as ApprovalStatusRow[];

  // WHO prequalification distribution
  const wq = buildFilterClauses(filters);
  const whoSql = `
    SELECT
      COALESCE(r.who_prequalification, 'Unknown') as who_prequalification,
      COUNT(DISTINCT f.candidate_key) as candidateCount
    FROM fact_pipeline_snapshot f
    ${wq.joins.join("\n    ")}
    WHERE ${wq.conditions.join("\n      AND ")}
    GROUP BY COALESCE(r.who_prequalification, 'Unknown')
    ORDER BY candidateCount DESC
  `;

  const whoPrequalification = db.prepare(whoSql).all(...wq.params) as WHOPrequalRow[];

  // Approving authorities: SRA vs NRA split by WHO prequalification
  const sra = buildFilterClauses(filters);
  sra.conditions.push("r.sra_approval_status = 'Yes'");

  const nra = buildFilterClauses(filters);
  nra.conditions.push("r.nra_approval_status = 'Granted'");

  const authoritySql = `
    SELECT 'Stringent Regulatory Authority' as authority_type,
      COUNT(DISTINCT CASE WHEN r.who_prequalification = 'Yes'
        THEN f.candidate_key END) as who_prequalified,
      COUNT(DISTINCT CASE WHEN COALESCE(r.who_prequalification, 'Unknown')
        IN ('No', 'Unknown') THEN f.candidate_key END) as no_who_listing
    FROM fact_pipeline_snapshot f
    ${sra.joins.join("\n    ")}
    WHERE ${sra.conditions.join("\n      AND ")}
    UNION ALL
    SELECT 'National Regulatory Authority' as authority_type,
      COUNT(DISTINCT CASE WHEN r.who_prequalification = 'Yes'
        THEN f.candidate_key END) as who_prequalified,
      COUNT(DISTINCT CASE WHEN COALESCE(r.who_prequalification, 'Unknown')
        IN ('No', 'Unknown') THEN f.candidate_key END) as no_who_listing
    FROM fact_pipeline_snapshot f
    ${nra.joins.join("\n    ")}
    WHERE ${nra.conditions.join("\n      AND ")}
  `;

  const approvingAuthorities = db
    .prepare(authoritySql)
    .all(...sra.params, ...nra.params) as ApprovingAuthorityRow[];

  return { approvalStatus, whoPrequalification, approvingAuthorities };
}
