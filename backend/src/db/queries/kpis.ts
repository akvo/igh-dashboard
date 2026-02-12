import { getDatabase } from "../connection.js";
import type { PortfolioKPIs } from "../types.js";

/**
 * Get portfolio KPIs for the dashboard homepage cards.
 */
export function getPortfolioKPIs(): PortfolioKPIs {
  const db = getDatabase();

  // KPI Card: "Number of diseases"
  // Count distinct diseases with active candidates
  const diseases = db
    .prepare(
      `
    SELECT COUNT(DISTINCT d.disease_key) as count
    FROM fact_pipeline_snapshot f
    JOIN dim_disease d ON f.disease_key = d.disease_key
    WHERE f.is_active_flag = 1
  `,
    )
    .get() as { count: number };

  // KPI Card: "Total candidates"
  // Count distinct active candidates with candidate_type = 'Candidate'
  const candidates = db
    .prepare(
      `
    SELECT COUNT(DISTINCT f.candidate_key) as count
    FROM fact_pipeline_snapshot f
    JOIN dim_candidate_core c ON f.candidate_key = c.candidate_key
    WHERE f.is_active_flag = 1
      AND c.candidate_type = 'Candidate'
  `,
    )
    .get() as { count: number };

  // KPI Card: "Approved products"
  // Count distinct candidates with candidate_type = 'Product'
  const approved = db
    .prepare(
      `
    SELECT COUNT(DISTINCT f.candidate_key) as count
    FROM fact_pipeline_snapshot f
    JOIN dim_candidate_core c ON f.candidate_key = c.candidate_key
    WHERE f.is_active_flag = 1
      AND c.candidate_type = 'Product'
  `,
    )
    .get() as { count: number };

  return {
    totalDiseases: diseases.count,
    totalCandidates: candidates.count,
    approvedProducts: approved.count,
  };
}
