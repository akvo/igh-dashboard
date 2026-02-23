import { getDatabase } from "../connection.js";
import type { GeographicDistributionRow } from "../types.js";
import { addArrayCondition } from "./filterUtils.js";

/**
 * Get geographic distribution for map visualization.
 * Returns candidate counts grouped by country for a specific location scope.
 *
 * @param location_scope - "Trial Location", "Target Country", or "Developer Location"
 * @param statuses - Optional clinical trial statuses to filter by (e.g. "Active", "Completed")
 */
export function getGeographicDistribution(
  location_scope: string,
  statuses?: string[],
): GeographicDistributionRow[] {
  const db = getDatabase();

  // Map Visualization: Geographic distribution of candidates
  // Counts candidates per country for the given location scope.
  // When statuses are provided, restrict to candidates that have at least
  // one clinical trial event matching one of the requested statuses.
  const joins: string[] = [];
  const conditions: string[] = [
    "bg.location_scope = ?",
    "f.is_active_flag = 1",
    "g.country_name IS NOT NULL",
  ];
  const params: (string | number)[] = [location_scope];

  addArrayCondition(statuses, "t.status", conditions, params, {
    joins,
    join: "JOIN fact_clinical_trial_event t ON bg.candidate_key = t.candidate_key",
  });

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
    ORDER BY location_scope
  `,
    )
    .all() as { location_scope: string }[];

  return rows.map((r) => r.location_scope);
}
