import { getDatabase } from "../connection.js";
import type {
  ApprovalStatusRow,
  WHOPrequalRow,
  RegulatoryDistribution,
} from "../types.js";

interface RegulatoryDistributionFilters {
  global_health_areas?: string[];
  disease_names?: string[];
  product_names?: string[];
}

/**
 * Build shared joins/conditions for regulatory queries.
 */
function buildFilterClauses(filters?: RegulatoryDistributionFilters) {
  const joins = [
    "JOIN dim_candidate_regulatory r ON f.regulatory_key = r.regulatory_key",
  ];
  const conditions = ["f.is_active_flag = 1"];
  const params: (string | number)[] = [];

  const needsDiseaseJoin =
    (filters?.global_health_areas && filters.global_health_areas.length > 0) ||
    (filters?.disease_names && filters.disease_names.length > 0);

  if (needsDiseaseJoin) {
    joins.push("JOIN dim_disease d ON f.disease_key = d.disease_key");
  }

  if (filters?.global_health_areas && filters.global_health_areas.length > 0) {
    const placeholders = filters.global_health_areas.map(() => "?").join(", ");
    conditions.push(`d.global_health_area IN (${placeholders})`);
    params.push(...filters.global_health_areas);
  }

  if (filters?.disease_names && filters.disease_names.length > 0) {
    const placeholders = filters.disease_names.map(() => "?").join(", ");
    conditions.push(`d.disease_name IN (${placeholders})`);
    params.push(...filters.disease_names);
  }

  if (filters?.product_names && filters.product_names.length > 0) {
    joins.push("JOIN dim_product pr ON f.product_key = pr.product_key");
    const placeholders = filters.product_names.map(() => "?").join(", ");
    conditions.push(`pr.product_name IN (${placeholders})`);
    params.push(...filters.product_names);
  }

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

  const approvalStatus = db
    .prepare(approvalSql)
    .all(...as.params) as ApprovalStatusRow[];

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

  const whoPrequalification = db
    .prepare(whoSql)
    .all(...wq.params) as WHOPrequalRow[];

  return { approvalStatus, whoPrequalification };
}
