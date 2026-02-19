import { getDatabase } from "../connection.js";
import type { ApprovalStatusRow, WHOPrequalRow, RegulatoryDistribution } from "../types.js";
import { addArrayCondition } from "./filterUtils.js";

interface RegulatoryDistributionFilters {
  global_health_areas?: string[];
  disease_names?: string[];
  product_names?: string[];
}

const DISEASE_JOIN = "JOIN dim_disease d ON f.disease_key = d.disease_key";

/**
 * Build shared joins/conditions for regulatory queries.
 */
function buildFilterClauses(filters?: RegulatoryDistributionFilters) {
  const joins = ["JOIN dim_candidate_regulatory r ON f.regulatory_key = r.regulatory_key"];
  const conditions = ["f.is_active_flag = 1"];
  const params: (string | number)[] = [];

  const diseaseCtx = { joins, join: DISEASE_JOIN };
  addArrayCondition(
    filters?.global_health_areas,
    "d.global_health_area",
    conditions,
    params,
    diseaseCtx,
  );
  addArrayCondition(filters?.disease_names, "d.disease_group_name", conditions, params, diseaseCtx);

  const productCtx = { joins, join: "JOIN dim_product pr ON f.product_key = pr.product_key" };
  addArrayCondition(filters?.product_names, "pr.product_name", conditions, params, productCtx);

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
  as.conditions.push("r.approval_status IS NOT NULL");

  const approvalSql = `
    SELECT
      r.approval_status,
      COUNT(DISTINCT f.candidate_key) as candidateCount
    FROM fact_pipeline_snapshot f
    ${as.joins.join("\n    ")}
    WHERE ${as.conditions.join("\n      AND ")}
    GROUP BY r.approval_status
    ORDER BY candidateCount DESC
  `;

  const approvalStatus = db.prepare(approvalSql).all(...as.params) as ApprovalStatusRow[];

  // WHO prequalification distribution
  const wq = buildFilterClauses(filters);
  wq.conditions.push("r.who_prequalification IS NOT NULL");

  const whoSql = `
    SELECT
      r.who_prequalification,
      COUNT(DISTINCT f.candidate_key) as candidateCount
    FROM fact_pipeline_snapshot f
    ${wq.joins.join("\n    ")}
    WHERE ${wq.conditions.join("\n      AND ")}
    GROUP BY r.who_prequalification
    ORDER BY candidateCount DESC
  `;

  const whoPrequalification = db.prepare(whoSql).all(...wq.params) as WHOPrequalRow[];

  return { approvalStatus, whoPrequalification };
}
