import { getDatabase } from "../connection.js";
import type { GeographicDistributionRow } from "../types.js";
import { addArrayCondition, PIPELINE_FILTER } from "./filterUtils.js";

interface GeographicFilters {
  global_health_areas?: string[];
  disease_names?: string[];
  product_names?: string[];
  phase_names?: string[];
}

/**
 * Get geographic distribution for map visualization.
 * Returns candidate counts grouped by country for a specific location scope.
 *
 * @param location_scope - "Trial Location", "Target Country", or "Developer Location"
 * @param statuses - Optional clinical trial statuses to filter by (e.g. "Active", "Completed")
 * @param filters - Optional global filters (health area, disease, product)
 */
export function getGeographicDistribution(
  location_scope: string,
  statuses?: string[],
  filters?: GeographicFilters,
): GeographicDistributionRow[] {
  if (location_scope === "Trial Location") {
    return getTrialLocationDistribution(statuses, filters);
  }
  return getCandidateLocationDistribution(location_scope, statuses, filters);
}

/**
 * Trial Location scope: count trials (not candidates) via bridge_trial_geography.
 * Status filter is correlated — a trial's status is checked on the same row
 * that determines its country, fixing the uncorrelated join issue.
 */
function getTrialLocationDistribution(
  statuses?: string[],
  filters?: GeographicFilters,
): GeographicDistributionRow[] {
  const db = getDatabase();

  const joins: string[] = [];
  const conditions: string[] = [
    "f.is_active_flag = 1",
    PIPELINE_FILTER,
    "g.country_name IS NOT NULL",
  ];
  const params: (string | number)[] = [];

  addArrayCondition(statuses, "t.status", conditions, params);

  const diseaseCtx = { joins, join: "JOIN dim_disease d ON f.disease_key = d.disease_key" };
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

  const phaseCtx = { joins, join: "JOIN dim_phase p ON f.phase_key = p.phase_key" };
  addArrayCondition(filters?.phase_names, "p.phase_name", conditions, params, phaseCtx);

  const joinClause = joins.length > 0 ? joins.join("\n    ") + "\n    " : "";

  const rows = db
    .prepare(
      `
    SELECT
      g.country_key,
      g.country_name,
      g.iso_code,
      'Trial Location' as location_scope,
      COUNT(DISTINCT t.trial_id) as candidateCount
    FROM bridge_trial_geography btg
    JOIN fact_clinical_trial_event t ON btg.trial_key = t.trial_id
    JOIN dim_geography g ON btg.country_key = g.country_key
    JOIN fact_pipeline_snapshot f ON t.candidate_key = f.candidate_key
    ${joinClause}WHERE ${conditions.join("\n      AND ")}
    GROUP BY g.country_key, g.country_name, g.iso_code
    ORDER BY candidateCount DESC
  `,
    )
    .all(...params) as GeographicDistributionRow[];

  return rows;
}

/**
 * Target Country / Developer Location scopes: count candidates via bridge_candidate_geography.
 */
function getCandidateLocationDistribution(
  location_scope: string,
  statuses?: string[],
  filters?: GeographicFilters,
): GeographicDistributionRow[] {
  const db = getDatabase();

  const joins: string[] = [];
  const conditions: string[] = [
    "bg.location_scope = ?",
    "f.is_active_flag = 1",
    PIPELINE_FILTER,
    "g.country_name IS NOT NULL",
  ];
  const params: (string | number)[] = [location_scope];

  addArrayCondition(statuses, "t.status", conditions, params, {
    joins,
    join: "JOIN fact_clinical_trial_event t ON bg.candidate_key = t.candidate_key",
  });

  // Global filters: health area and disease filter through dim_disease,
  // product filter through dim_product — both joined via fact_pipeline_snapshot.
  const diseaseCtx = { joins, join: "JOIN dim_disease d ON f.disease_key = d.disease_key" };
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

  const phaseCtx = { joins, join: "JOIN dim_phase p ON f.phase_key = p.phase_key" };
  addArrayCondition(filters?.phase_names, "p.phase_name", conditions, params, phaseCtx);

  const joinClause = joins.length > 0 ? joins.join("\n    ") + "\n    " : "";

  const rows = db
    .prepare(
      `
    SELECT
      g.country_key,
      g.country_name,
      g.iso_code,
      bg.location_scope,
      COUNT(DISTINCT bg.candidate_key) as candidateCount
    FROM bridge_candidate_geography bg
    JOIN dim_geography g ON bg.country_key = g.country_key
    JOIN fact_pipeline_snapshot f ON bg.candidate_key = f.candidate_key
    ${joinClause}WHERE ${conditions.join("\n      AND ")}
    GROUP BY g.country_key, g.country_name, g.iso_code, bg.location_scope
    ORDER BY candidateCount DESC
  `,
    )
    .all(...params) as GeographicDistributionRow[];

  return rows;
}

/**
 * Get distinct location scopes available in the data.
 */
export function getLocationScopes(): string[] {
  const db = getDatabase();

  const rows = db
    .prepare(
      `
    SELECT DISTINCT location_scope
    FROM bridge_candidate_geography
    WHERE location_scope IS NOT NULL
    UNION
    SELECT 'Trial Location'
    WHERE EXISTS (SELECT 1 FROM bridge_trial_geography LIMIT 1)
    ORDER BY location_scope
  `,
    )
    .all() as { location_scope: string }[];

  return rows.map((r) => r.location_scope);
}
