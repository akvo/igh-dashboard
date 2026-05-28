import { getDatabase } from "../connection.js";
import type { ProductDistributionRow } from "../types.js";
import { addArrayCondition, PIPELINE_FILTER } from "./filterUtils.js";

interface ProductDistributionFilters {
  global_health_areas?: string[];
  primary_disease_names?: string[];
  secondary_disease_names?: string[];
  product_names?: string[];
  candidate_type?: string;
  phase_names?: string[];
}

/**
 * Get candidate count grouped by product name.
 * Returns data suitable for donut chart.
 */
export function getProductDistribution(
  filters?: ProductDistributionFilters,
): ProductDistributionRow[] {
  const db = getDatabase();

  const joins = ["JOIN dim_product pr ON f.product_key = pr.product_key"];
  const conditions = ["f.is_active_flag = 1", PIPELINE_FILTER, "pr.product_name IS NOT NULL"];
  const params: (string | number)[] = [];

  const diseaseCtx = { joins, join: "JOIN dim_disease d ON f.disease_key = d.disease_key" };
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
  addArrayCondition(filters?.product_names, "pr.product_name", conditions, params);

  const phaseCtx = { joins, join: "JOIN dim_phase p ON f.phase_key = p.phase_key" };
  addArrayCondition(filters?.phase_names, "p.phase_name", conditions, params, phaseCtx);

  // Snapshot the joins/conditions BEFORE the candidate_type filter so we
  // can build an approved-products subquery that is not restricted to a
  // single candidate_type.
  const preTypeJoins = [...joins];
  const preTypeConditions = [...conditions];
  const preTypeParams = [...params];

  if (filters?.candidate_type) {
    joins.push("JOIN dim_candidate_core c ON f.candidate_key = c.candidate_key");
    conditions.push("c.candidate_type = ?");
    params.push(filters.candidate_type);
  }

  joins.push("LEFT JOIN dim_candidate_tech ct ON f.technology_key = ct.technology_key");

  // Approved-products subquery: counts Products per product_name using
  // the same base filters (GHA, disease, phase) but without the
  // candidate_type restriction.
  const apJoins = [
    ...preTypeJoins,
    "JOIN dim_candidate_core ap_c ON ap.candidate_key = ap_c.candidate_key",
  ].map((j) => j.replace(/\bf\./g, "ap."));

  const apConditions = [
    ...preTypeConditions.map((c) => c.replace(/\bf\./g, "ap.")),
    "ap_c.candidate_type = 'Product'",
    "ap.product_key = f.product_key",
  ];

  const sql = `
    SELECT
      pr.product_name,
      COUNT(DISTINCT f.candidate_key) as candidateCount,
      COUNT(DISTINCT ct.technology_type) as techTypeCount,
      (
        SELECT COUNT(DISTINCT ap.candidate_key)
        FROM fact_pipeline_snapshot ap
        ${apJoins.join("\n        ")}
        WHERE ${apConditions.join("\n          AND ")}
      ) as approvedProductCount
    FROM fact_pipeline_snapshot f
    ${joins.join("\n    ")}
    WHERE ${conditions.join("\n      AND ")}
    GROUP BY pr.product_name
    ORDER BY candidateCount DESC
  `;

  // The subquery's ? placeholders come first in the SQL, then the main
  // query's. preTypeParams covers the subquery; params covers the main.
  const allParams = [...preTypeParams, ...params];
  return db.prepare(sql).all(...allParams) as ProductDistributionRow[];
}
