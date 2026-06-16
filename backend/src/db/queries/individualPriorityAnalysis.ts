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
//                                candidate_type = 'Candidate' with
//                                new_include_in_pipeline_2025 = 1,
//                                bridged to the selected priority.
//   - targetPopulation        — dim_priority.target_population, read
//                                verbatim. Not narrowed by page filters.
//   - pipelineBuildUp         — one row per (product_name × phase_name)
//                                for candidate_type = 'Candidate' only
//                                (no approved-product "Approved" phase).
//                                Distinct candidates per cell under the
//                                active-pipeline + strict-2025 guard.
//
// The four page-level filters (GHA / primary disease / secondary disease /
// product type) narrow the counts and the chart but do NOT narrow
// target_population — that's a property of the priority itself, not of
// the candidates linked to it.

const COMMON_JOINS = `
  JOIN dim_candidate_core c         ON c.candidate_key  = f.candidate_key
  JOIN dim_disease d                ON d.disease_key    = f.disease_key
  JOIN dim_product pr               ON pr.product_key   = f.product_key
  JOIN bridge_candidate_priority bp ON bp.candidate_key = f.candidate_key
`;

function buildPipelineWhere(input: IndividualPriorityAnalysisInput) {
  const conditions = [
    "f.is_active_flag = 1",
    PIPELINE_FILTER,
    // Strict 2025 rule: only candidates whose actual 2025
    // new_includeinpipeline is Yes (not the forward-filled flag).
    "c.new_include_in_pipeline_2025 = 1",
    // The WHO drill-down counts/charts true candidates only; approved
    // products are excluded from the count, chart, and table.
    "c.candidate_type = 'Candidate'",
    "bp.priority_key = ?",
  ];
  const params: (string | number)[] = [input.priority_key];

  addArrayCondition(
    input.global_health_areas ?? undefined,
    "d.global_health_area",
    conditions,
    params,
  );
  addArrayCondition(
    input.primary_disease_names ?? undefined,
    "d.disease_filter",
    conditions,
    params,
  );
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
  // Counts — candidate_type = 'Candidate' is pinned in the WHERE, so
  // no conditional aggregation needed.
  // ---------------------------------------------------------------------
  const countsSql = `
    SELECT COUNT(DISTINCT f.candidate_key) AS candidatesCount
    FROM fact_pipeline_snapshot f
    ${COMMON_JOINS}
    ${whereClause}
  `;
  const counts = db.prepare(countsSql).get(...params) as {
    candidatesCount: number;
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
  // Pipeline build-up — one row per (product_name, phase) for
  // candidate_type = 'Candidate' only (no approved-product rows).
  // Rows with zero candidates are naturally absent.
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
    targetPopulation,
    pipelineBuildUp,
  };
}
