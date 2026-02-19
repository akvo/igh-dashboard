import { getDatabase } from "../connection.js";
import type {
  ClinicalTrialStatusRow,
  AgeGroupDistributionRow,
  ClinicalTrialStats,
} from "../types.js";

interface ClinicalTrialStatsFilters {
  global_health_areas?: string[];
  disease_names?: string[];
  product_names?: string[];
}

/**
 * Build shared joins/conditions for clinical trial queries.
 */
function buildFilterClauses(filters?: ClinicalTrialStatsFilters) {
  const joins: string[] = [];
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  const needsDiseaseJoin =
    (filters?.global_health_areas && filters.global_health_areas.length > 0) ||
    (filters?.disease_names && filters.disease_names.length > 0);

  if (needsDiseaseJoin) {
    joins.push("JOIN dim_disease d ON t.disease_key = d.disease_key");
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
    joins.push("JOIN dim_product pr ON t.product_key = pr.product_key");
    const placeholders = filters.product_names.map(() => "?").join(", ");
    conditions.push(`pr.product_name IN (${placeholders})`);
    params.push(...filters.product_names);
  }

  return { joins, conditions, params };
}

/**
 * Get clinical trial statistics for the trials tab.
 * Returns total trial count, status distribution, and age group distribution.
 */
export function getClinicalTrialStats(
  filters?: ClinicalTrialStatsFilters,
): ClinicalTrialStats {
  const db = getDatabase();

  // Total trials count
  const tc = buildFilterClauses(filters);
  const totalSql = `
    SELECT COUNT(*) as count
    FROM fact_clinical_trial_event t
    ${tc.joins.length > 0 ? tc.joins.join("\n    ") : ""}
    ${tc.conditions.length > 0 ? "WHERE " + tc.conditions.join("\n      AND ") : ""}
  `;
  const total = db.prepare(totalSql).get(...tc.params) as { count: number };

  // Status distribution
  const sc = buildFilterClauses(filters);
  sc.conditions.push("t.status IS NOT NULL");
  sc.conditions.push("t.status != ''");

  const statusSql = `
    SELECT
      t.status,
      COUNT(*) as trialCount
    FROM fact_clinical_trial_event t
    ${sc.joins.length > 0 ? sc.joins.join("\n    ") : ""}
    WHERE ${sc.conditions.join("\n      AND ")}
    GROUP BY t.status
    ORDER BY trialCount DESC
  `;
  const statusDistribution = db
    .prepare(statusSql)
    .all(...sc.params) as ClinicalTrialStatusRow[];

  // Age group distribution (via bridge_candidate_age_group + dim_age_group)
  const ac = buildFilterClauses(filters);
  const ageJoins = [
    "JOIN bridge_candidate_age_group bag ON t.candidate_key = bag.candidate_key",
    "JOIN dim_age_group ag ON bag.age_group_key = ag.age_group_key",
    ...ac.joins,
  ];

  const ageSql = `
    SELECT
      ag.age_group_name,
      COUNT(DISTINCT t.candidate_key) as candidateCount
    FROM fact_clinical_trial_event t
    ${ageJoins.join("\n    ")}
    ${ac.conditions.length > 0 ? "WHERE " + ac.conditions.join("\n      AND ") : ""}
    GROUP BY ag.age_group_name
    ORDER BY candidateCount DESC
  `;
  const ageGroupDistribution = db
    .prepare(ageSql)
    .all(...ac.params) as AgeGroupDistributionRow[];

  return {
    totalTrials: total.count,
    statusDistribution,
    ageGroupDistribution,
  };
}
