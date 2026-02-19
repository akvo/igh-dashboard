import { getDatabase } from "../connection.js";
import type { PortfolioKPIs } from "../types.js";

interface KPIFilters {
  global_health_areas?: string[];
  disease_names?: string[];
  product_names?: string[];
}

/**
 * Build shared filter joins and conditions for KPI queries.
 */
function buildKPIFilter(filters?: KPIFilters) {
  const joins: string[] = [];
  const conditions: string[] = ["f.is_active_flag = 1"];
  const params: string[] = [];

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
    conditions.push(`d.disease_group_name IN (${placeholders})`);
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
 * Get portfolio KPIs for the dashboard homepage cards.
 * Optionally filtered by global health area, disease, and product.
 */
export function getPortfolioKPIs(filters?: KPIFilters): PortfolioKPIs {
  const db = getDatabase();
  const { joins: baseJoins, conditions: baseConditions, params: baseParams } = buildKPIFilter(filters);

  // KPI Card: "Number of diseases"
  const needsDiseaseJoinForCount = !baseJoins.some((j) => j.includes("dim_disease"));
  const diseaseJoins = needsDiseaseJoinForCount
    ? [...baseJoins, "JOIN dim_disease d ON f.disease_key = d.disease_key"]
    : baseJoins;

  const diseases = db
    .prepare(
      `SELECT COUNT(DISTINCT d.disease_key) as count
    FROM fact_pipeline_snapshot f
    ${diseaseJoins.join("\n    ")}
    WHERE ${baseConditions.join("\n      AND ")}`,
    )
    .get(...baseParams) as { count: number };

  // KPI Card: "Total candidates"
  const candidateJoins = [...baseJoins, "JOIN dim_candidate_core c ON f.candidate_key = c.candidate_key"];
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
