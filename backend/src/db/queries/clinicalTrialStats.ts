import { getDatabase } from "../connection.js";
import type {
  ClinicalTrialStatusRow,
  AgeGroupDistributionRow,
  ClinicalTrialDiseaseRow,
  ClinicalTrialProductTypeRow,
  ClinicalTrialGhaRow,
  ClinicalTrialStats,
} from "../types.js";
import { addArrayCondition } from "./filterUtils.js";

interface ClinicalTrialStatsFilters {
  global_health_areas?: string[];
  primary_disease_names?: string[];
  secondary_disease_names?: string[];
  product_names?: string[];
  phase_names?: string[];
}

const DISEASE_JOIN = "JOIN dim_disease d ON t.disease_key = d.disease_key";

// Pipeline gate: mandatory INNER JOIN ensuring only trials linked to
// candidates currently in the pipeline are counted.
const PIPELINE_JOIN =
  "JOIN fact_pipeline_snapshot fps ON t.candidate_key = fps.candidate_key AND fps.is_active_flag = 1 AND fps.include_in_pipeline = 1";

/**
 * Build shared joins/conditions for clinical trial queries.
 * Every sub-query gets the pipeline gate via PIPELINE_JOIN.
 */
function buildFilterClauses(filters?: ClinicalTrialStatsFilters) {
  const joins: string[] = [PIPELINE_JOIN];
  const conditions: string[] = [];
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

  const productCtx = { joins, join: "JOIN dim_product pr ON t.product_key = pr.product_key" };
  addArrayCondition(filters?.product_names, "pr.product_name", conditions, params, productCtx);

  // Phase filter joins dim_phase via the already-present fps join.
  const phaseCtx = {
    joins,
    join: "JOIN dim_phase p ON fps.phase_key = p.phase_key",
  };
  addArrayCondition(filters?.phase_names, "p.phase_name", conditions, params, phaseCtx);

  return { joins, conditions, params };
}

/**
 * Get clinical trial statistics for the trials tab.
 * Returns total trial count, status distribution, and age group distribution.
 */
export function getClinicalTrialStats(filters?: ClinicalTrialStatsFilters): ClinicalTrialStats {
  const db = getDatabase();

  // Total trials count (pipeline-gated, all statuses)
  const tc = buildFilterClauses(filters);
  const totalSql = `
    SELECT COUNT(DISTINCT t.trial_id) as count
    FROM fact_clinical_trial_event t
    ${tc.joins.join("\n    ")}
    ${tc.conditions.length > 0 ? "WHERE " + tc.conditions.join("\n      AND ") : ""}
  `;
  const total = db.prepare(totalSql).get(...tc.params) as { count: number };

  // Status distribution (pipeline-gated, all statuses)
  const sc = buildFilterClauses(filters);
  sc.conditions.push("t.status IS NOT NULL");
  sc.conditions.push("t.status != ''");

  const statusSql = `
    SELECT
      t.status,
      COUNT(DISTINCT t.trial_id) as trialCount
    FROM fact_clinical_trial_event t
    ${sc.joins.join("\n    ")}
    WHERE ${sc.conditions.join("\n      AND ")}
    GROUP BY t.status
    ORDER BY trialCount DESC
  `;
  const statusDistribution = db.prepare(statusSql).all(...sc.params) as ClinicalTrialStatusRow[];

  // Age group distribution (pipeline-gated, all statuses)
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
  const ageGroupDistribution = db.prepare(ageSql).all(...ac.params) as AgeGroupDistributionRow[];

  // Disease distribution — pipeline-gated trials grouped by disease, for Top 5 diseases chart
  const dc = buildFilterClauses(filters);
  if (!dc.joins.some((j) => j.startsWith("JOIN dim_disease"))) {
    dc.joins.push(DISEASE_JOIN);
  }
  dc.conditions.push("d.disease_filter IS NOT NULL");
  dc.conditions.push("d.global_health_area IS NOT NULL");
  const diseaseSql = `
    SELECT
      d.disease_filter AS disease_name,
      d.global_health_area,
      COUNT(DISTINCT t.trial_id) as trialCount
    FROM fact_clinical_trial_event t
    ${dc.joins.join("\n    ")}
    WHERE ${dc.conditions.join("\n      AND ")}
    GROUP BY d.disease_filter, d.global_health_area
    ORDER BY trialCount DESC
  `;
  const diseaseDistribution = db
    .prepare(diseaseSql)
    .all(...dc.params) as ClinicalTrialDiseaseRow[];

  // Product type distribution — pipeline-gated trials grouped by product name
  const pc = buildFilterClauses(filters);
  const productJoin = "JOIN dim_product pr ON t.product_key = pr.product_key";
  if (!pc.joins.includes(productJoin)) {
    pc.joins.push(productJoin);
  }
  pc.conditions.push("pr.product_name IS NOT NULL");
  const productSql = `
    SELECT
      pr.product_name,
      COUNT(DISTINCT t.trial_id) as trialCount
    FROM fact_clinical_trial_event t
    ${pc.joins.join("\n    ")}
    WHERE ${pc.conditions.join("\n      AND ")}
    GROUP BY pr.product_name
    ORDER BY trialCount DESC
  `;
  const productTypeDistribution = db
    .prepare(productSql)
    .all(...pc.params) as ClinicalTrialProductTypeRow[];

  // GHA distribution — pipeline-gated trial counts per global health area,
  // replacing the candidate-based GHA counts from useGlobalHealthAreaSummaries.
  const gc = buildFilterClauses(filters);
  if (!gc.joins.some((j) => j.startsWith("JOIN dim_disease"))) {
    gc.joins.push(DISEASE_JOIN);
  }
  gc.conditions.push("d.global_health_area IS NOT NULL");
  const ghaSql = `
    SELECT
      d.global_health_area,
      COUNT(DISTINCT t.trial_id) as trialCount
    FROM fact_clinical_trial_event t
    ${gc.joins.join("\n    ")}
    WHERE ${gc.conditions.join("\n      AND ")}
    GROUP BY d.global_health_area
    ORDER BY trialCount DESC
  `;
  const ghaDistribution = db
    .prepare(ghaSql)
    .all(...gc.params) as ClinicalTrialGhaRow[];

  return {
    totalTrials: total.count,
    statusDistribution,
    ageGroupDistribution,
    diseaseDistribution,
    productTypeDistribution,
    ghaDistribution,
  };
}
