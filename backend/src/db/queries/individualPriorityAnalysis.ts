import { getDatabase } from "../connection.js";
import { addArrayCondition, PIPELINE_FILTER } from "./filterUtils.js";
import type {
  IndividualPriorityAnalysis,
  IndividualPriorityAnalysisInput,
  PipelineBuildUpRow,
} from "../types.js";

// =========================================================
// Individual Priority Analysis (WHO page drill-down)
// =========================================================
// One resolver returns three pipeline aggregates for a single priority:
//   - candidatesCount         — distinct active-pipeline candidates of
//                                candidate_type = 'Candidate' bridged to
//                                the selected priority (Q1).
//   - approvedProductsCount   — same shape but candidate_type = 'Product' (Q2).
//                                Disjoint from candidatesCount by
//                                construction (Q3).
//   - targetPopulation        — dim_priority.target_population, read
//                                verbatim (Q8). Not narrowed by page filters.
//   - pipelineBuildUp         — one row per (product_name × phase_name)
//                                including BOTH candidate_types so approved
//                                products surface in the Approved phase (Q6).
//                                Distinct candidates per cell (Q5a) under the
//                                active-pipeline guard (Q5b).
//
// The four page-level filters (GHA / primary disease / secondary disease /
// product type) narrow the counts and the chart but do NOT narrow
// target_population — that's a property of the priority itself, not of
// the candidates linked to it (Q7).

const COMMON_JOINS = `
  JOIN dim_candidate_core c         ON c.candidate_key  = f.candidate_key
  JOIN dim_disease d                ON d.disease_key    = f.disease_key
  JOIN dim_product pr               ON pr.product_key   = f.product_key
  JOIN bridge_candidate_priority bp ON bp.candidate_key = f.candidate_key
`;

function buildPipelineWhere(input: IndividualPriorityAnalysisInput) {
  const conditions = ["f.is_active_flag = 1", PIPELINE_FILTER, "bp.priority_key = ?"];
  const params: (string | number)[] = [input.priority_key];

  addArrayCondition(input.global_health_areas ?? undefined, "d.global_health_area", conditions, params);
  addArrayCondition(input.primary_disease_names ?? undefined, "d.disease_filter", conditions, params);
  addArrayCondition(
    input.secondary_disease_names ?? undefined,
    "d.secondary_disease_name",
    conditions,
    params,
  );
  addArrayCondition(input.product_names ?? undefined, "pr.product_name", conditions, params);

  return { whereClause: `WHERE ${conditions.join(" AND ")}`, params };
}

export function getIndividualPriorityAnalysis(
  input: IndividualPriorityAnalysisInput,
): IndividualPriorityAnalysis {
  const db = getDatabase();
  const { whereClause, params } = buildPipelineWhere(input);

  // ---------------------------------------------------------------------
  // Counts — one query, conditional aggregation on candidate_type.
  // ---------------------------------------------------------------------
  const countsSql = `
    SELECT
      COUNT(DISTINCT CASE WHEN c.candidate_type = 'Candidate' THEN f.candidate_key END) AS candidatesCount,
      COUNT(DISTINCT CASE WHEN c.candidate_type = 'Product'   THEN f.candidate_key END) AS approvedProductsCount
    FROM fact_pipeline_snapshot f
    ${COMMON_JOINS}
    ${whereClause}
  `;
  const counts = db.prepare(countsSql).get(...params) as {
    candidatesCount: number;
    approvedProductsCount: number;
  };

  // ---------------------------------------------------------------------
  // Target population — direct read from dim_priority. Page filters do
  // not apply: this is the priority's own description text.
  // ---------------------------------------------------------------------
  const targetRow = db
    .prepare(`SELECT target_population FROM dim_priority WHERE priority_key = ?`)
    .get(input.priority_key) as { target_population: string | null } | undefined;
  const rawTarget = targetRow?.target_population ?? null;
  // The silver→gold transformation stores COALESCE(target_population, '')
  // for some columns; normalise empty string back to null so the frontend
  // can fall back to the "Not specified" copy cleanly.
  const targetPopulation = rawTarget === "" ? null : rawTarget;

  // ---------------------------------------------------------------------
  // Pipeline build-up — one row per (product_name, phase) including BOTH
  // candidate_type values (Q6). Rows with zero candidates in every phase
  // are naturally absent.
  // ---------------------------------------------------------------------
  const buildUpSql = `
    SELECT pr.product_name,
           p.phase_name,
           p.sort_order,
           COUNT(DISTINCT f.candidate_key) AS candidateCount
    FROM fact_pipeline_snapshot f
    ${COMMON_JOINS}
    JOIN dim_phase p ON p.phase_key = f.phase_key
    ${whereClause}
    GROUP BY pr.product_name, p.phase_name, p.sort_order
    ORDER BY pr.product_name, p.sort_order
  `;
  const pipelineBuildUp = db.prepare(buildUpSql).all(...params) as PipelineBuildUpRow[];

  return {
    candidatesCount: counts.candidatesCount,
    approvedProductsCount: counts.approvedProductsCount,
    targetPopulation,
    pipelineBuildUp,
  };
}
