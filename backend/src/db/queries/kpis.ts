import { getDatabase } from "../connection.js";
import type { PortfolioKPIs } from "../types.js";
import { addArrayCondition, PIPELINE_FILTER } from "./filterUtils.js";

interface KPIFilters {
  global_health_areas?: string[];
  primary_disease_names?: string[];
  secondary_disease_names?: string[];
  product_names?: string[];
  phase_names?: string[];
}

const DISEASE_JOIN = "JOIN dim_disease d ON f.disease_key = d.disease_key";

/**
 * Build shared filter joins and conditions for KPI queries.
 */
function buildKPIFilter(filters?: KPIFilters) {
  const joins: string[] = [];
  const conditions: string[] = ["f.is_active_flag = 1", PIPELINE_FILTER];
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

  const productJoin = { joins, join: "JOIN dim_product pr ON f.product_key = pr.product_key" };
  addArrayCondition(filters?.product_names, "pr.product_name", conditions, params, productJoin);

  const phaseCtx = { joins, join: "JOIN dim_phase p ON f.phase_key = p.phase_key" };
  addArrayCondition(filters?.phase_names, "p.phase_name", conditions, params, phaseCtx);

  return { joins, conditions, params };
}

/**
 * Get portfolio KPIs for the dashboard homepage cards.
 * Optionally filtered by global health area, disease, and product.
 */
export function getPortfolioKPIs(filters?: KPIFilters): PortfolioKPIs {
  const db = getDatabase();
  const {
    joins: baseJoins,
    conditions: baseConditions,
    params: baseParams,
  } = buildKPIFilter(filters);

  // KPI Card: "Number of diseases"
  const needsDiseaseJoinForCount = !baseJoins.some((j) => j.includes("dim_disease"));
  const diseaseJoins = needsDiseaseJoinForCount ? [...baseJoins, DISEASE_JOIN] : baseJoins;

  const diseases = db
    .prepare(
      `SELECT COUNT(DISTINCT d.disease_filter) as count
    FROM fact_pipeline_snapshot f
    ${diseaseJoins.join("\n    ")}
    WHERE ${baseConditions.join("\n      AND ")}`,
    )
    .get(...baseParams) as { count: number };

  // KPI Card: "Total candidates"
  const candidateJoins = [
    ...baseJoins,
    "JOIN dim_candidate_core c ON f.candidate_key = c.candidate_key",
  ];
  const candidateConditions = [...baseConditions, "c.candidate_type = 'Candidate'"];

  const candidates = db
    .prepare(
      `SELECT COUNT(DISTINCT f.candidate_key) as count
    FROM fact_pipeline_snapshot f
    ${candidateJoins.join("\n    ")}
    WHERE ${candidateConditions.join("\n      AND ")}`,
    )
    .get(...baseParams) as { count: number };

  // KPI Card: "Approved products"
  const approvedConditions = [...baseConditions, "c.candidate_type = 'Product'"];

  const approved = db
    .prepare(
      `SELECT COUNT(DISTINCT f.candidate_key) as count
    FROM fact_pipeline_snapshot f
    ${candidateJoins.join("\n    ")}
    WHERE ${approvedConditions.join("\n      AND ")}`,
    )
    .get(...baseParams) as { count: number };

  return {
    totalDiseases: diseases.count,
    totalCandidates: candidates.count,
    approvedProducts: approved.count,
  };
}
