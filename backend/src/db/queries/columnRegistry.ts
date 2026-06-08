// =============================================================================
// Column registry
// =============================================================================
//
// Maps frontend column accessors to qualified SQL column expressions and to
// per-column filter / sort metadata. The list-query SQL builders use this
// registry so that a column rename touches one place.
//
// `sqlExpr` is the SQL fragment substituted into WHERE / ORDER BY clauses.
// For aggregated columns (developers_agg, locations, etc.) the expression
// references the already-aggregated string column on the joined dimension —
// callers compose array-element predicates differently (see columnFilters.ts).
//
// `filterKind`:
//   - TEXT      => filter by case-insensitive substring (LIKE '%q%')
//   - CATEGORY  => filter by IN (...values)
//   - NUMBER    => operator-driven scalar comparison (= / < / > / between)
//   - DATE      => operator-driven date comparison; EQ/BETWEEN wrap in DATE()
//
// `sortable: false` disables ORDER BY for columns where the SQL expression
// doesn't yield a deterministic sort (mostly aggregated columns).
//
// `isAggregated: true` is a hint that filter / sort semantics need to handle
// concatenated text like "GSK; Merck" (see columnFilters.ts).

export type DataTableId =
  | "PORTFOLIO_CANDIDATES"
  | "CLINICAL_TRIALS"
  | "RD_PRIORITIES"
  | "RD_PRIORITIES_WITH_CANDIDATES";

export type FilterKind = "TEXT" | "CATEGORY" | "NUMBER" | "DATE";

export interface ColumnDef {
  sqlExpr: string;
  sortable: boolean;
  filterKind: FilterKind;
  isAggregated: boolean;
}

// Portfolio candidates columns (Candidates, Approved, Extract — same shape).
const PORTFOLIO_CANDIDATES: Record<string, ColumnDef> = {
  // Identity
  candidate_name: {
    sqlExpr: "c.candidate_name",
    sortable: true,
    filterKind: "TEXT",
    isAggregated: false,
  },
  alternative_names: {
    sqlExpr: "c.alternative_names",
    sortable: true,
    filterKind: "TEXT",
    isAggregated: false,
  },
  candidate_type: {
    sqlExpr: "c.candidate_type",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  // Stage
  current_rd_stage: {
    sqlExpr: "c.current_rd_stage",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  phase_name: {
    sqlExpr: "p.phase_name",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  // Dimensions
  global_health_area: {
    sqlExpr: "d.global_health_area",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  // The Disease column displays the specific disease (child, else parent).
  // Filter/sort/distinct-values run on the same coalesced value so the
  // flat dropdown's options and the sort order match the cells. Kept a
  // plain CATEGORY column, so distinctValues still applies the global +
  // other-column filters (contextual narrowing) and the dropdown stays compact.
  disease_name: {
    sqlExpr: "COALESCE(d.secondary_disease_name, d.disease_filter)",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  product_name: {
    sqlExpr: "pr.product_name",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  sub_product_name: {
    sqlExpr: "sp.product_name",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  technology_type: {
    sqlExpr: "t.technology_type",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  indication_type: {
    sqlExpr: "c.indication_type",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  healthcare_facility_level: {
    sqlExpr: "c.healthcare_facility_level",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  test_format: {
    sqlExpr: "c.test_format",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  // Additional dimension columns
  route_of_administration: {
    sqlExpr: "c.route_of_administration",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  technology_principle: {
    sqlExpr: "c.technology_principle",
    sortable: true,
    filterKind: "TEXT",
    isAggregated: false,
  },
  target_population: {
    sqlExpr: "c.target_population",
    sortable: false,
    filterKind: "TEXT",
    isAggregated: false,
  },
  platform: {
    sqlExpr: "c.platform",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  chim_study: {
    sqlExpr: "c.chim_study",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  key_clinical_trial: {
    sqlExpr: "c.key_clinical_trial",
    sortable: false,
    filterKind: "TEXT",
    isAggregated: false,
  },
  known_funders_agg: {
    sqlExpr: "c.known_funders_agg",
    sortable: false,
    filterKind: "TEXT",
    isAggregated: true,
  },
  // Historical R&D stage snapshots (correlated subqueries)
  rd_stage_2023: {
    sqlExpr:
      "(SELECT p23.phase_name FROM fact_pipeline_snapshot f23 " +
      "JOIN dim_date dt23 ON f23.date_key = dt23.date_key " +
      "LEFT JOIN dim_phase p23 ON f23.phase_key = p23.phase_key " +
      "WHERE f23.candidate_key = c.candidate_key AND dt23.year <= 2023 " +
      "ORDER BY dt23.year DESC LIMIT 1)",
    sortable: false,
    filterKind: "TEXT",
    isAggregated: false,
  },
  rd_stage_2019: {
    sqlExpr:
      "(SELECT p19.phase_name FROM fact_pipeline_snapshot f19 " +
      "JOIN dim_date dt19 ON f19.date_key = dt19.date_key " +
      "LEFT JOIN dim_phase p19 ON f19.phase_key = p19.phase_key " +
      "WHERE f19.candidate_key = c.candidate_key AND dt19.year <= 2019 " +
      "ORDER BY dt19.year DESC LIMIT 1)",
    sortable: false,
    filterKind: "TEXT",
    isAggregated: false,
  },
  // Free text
  indication: { sqlExpr: "c.indication", sortable: false, filterKind: "TEXT", isAggregated: false },
  target: { sqlExpr: "c.target", sortable: false, filterKind: "TEXT", isAggregated: false },
  mechanism_of_action: {
    sqlExpr: "c.mechanism_of_action",
    sortable: false,
    filterKind: "TEXT",
    isAggregated: false,
  },
  key_features: {
    sqlExpr: "c.key_features",
    sortable: false,
    filterKind: "TEXT",
    isAggregated: false,
  },
  recent_updates: {
    sqlExpr: "c.recent_updates",
    sortable: false,
    filterKind: "TEXT",
    isAggregated: false,
  },
  preclinical_results_status: {
    sqlExpr: "c.preclinical_results_status",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  type_of_preclinical_results: {
    sqlExpr: "c.type_of_preclinical_results",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  preclinical_results_source: {
    sqlExpr: "c.preclinical_results_source",
    sortable: false,
    filterKind: "TEXT",
    isAggregated: false,
  },
  // Aggregated
  developers_agg: {
    sqlExpr: "c.developers_agg",
    sortable: false,
    filterKind: "TEXT",
    isAggregated: true,
  },
  // Unlike developers_agg this column is not pre-aggregated on
  // dim_candidate_core; the list query computes it via correlated
  // GROUP_CONCAT in the SELECT (see portfolioCandidates.ts). To make
  // it filterable we inline the same subquery as sqlExpr so a TEXT
  // filter emits `(GROUP_CONCAT subquery) LIKE '%foo%'`. The bridge
  // table has an index on candidate_key (`idx_bcaa_candidate`), so
  // per-row evaluation in WHERE is cheap.
  approving_authorities_agg: {
    sqlExpr:
      "(SELECT GROUP_CONCAT(da.authority_name, '; ') " +
      "FROM bridge_candidate_approving_authority baa " +
      "JOIN dim_approving_authority da ON baa.authority_key = da.authority_key " +
      "WHERE baa.candidate_key = c.candidate_key)",
    sortable: false,
    filterKind: "TEXT",
    isAggregated: true,
  },
  // Regulatory
  approval_status: {
    sqlExpr: "r.approval_status",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  nra_approval_status: {
    sqlExpr: "r.nra_approval_status",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  sra_approval_status: {
    sqlExpr: "r.sra_approval_status",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  ema_approval_status: {
    sqlExpr: "r.ema_approval_status",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  japanese_mhlw_approval_status: {
    sqlExpr: "r.japanese_mhlw_approval_status",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  us_fda_approval_status: {
    sqlExpr: "r.us_fda_approval_status",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
};

// Clinical trials.
//
// NUMBER columns: register here when a story or page first surfaces them as
// filterable. The obvious candidate is `enrollment_count` (already on
// ClinicalTrialNode); add when wired.
const CLINICAL_TRIALS: Record<string, ColumnDef> = {
  trial_name: { sqlExpr: "t.trial_name", sortable: true, filterKind: "TEXT", isAggregated: false },
  trial_title: {
    sqlExpr: "t.trial_title",
    sortable: false,
    filterKind: "TEXT",
    isAggregated: false,
  },
  description: {
    sqlExpr: "t.description",
    sortable: false,
    filterKind: "TEXT",
    isAggregated: false,
  },
  trial_phase: {
    sqlExpr: "t.trial_phase",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  status: { sqlExpr: "t.status", sortable: true, filterKind: "CATEGORY", isAggregated: false },
  ct_results_status: {
    sqlExpr: "t.ct_results_status",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  candidate_name: {
    sqlExpr: "c.candidate_name",
    sortable: true,
    filterKind: "TEXT",
    isAggregated: false,
  },
  enrollment_count: {
    sqlExpr: "t.enrollment_count",
    sortable: true,
    filterKind: "NUMBER",
    isAggregated: false,
  },
  // Date columns are joined from dim_date — fact_clinical_trial_event
  // carries `*_date_key` foreign keys, the human-readable yyyy-mm-dd is
  // on `dim_date.full_date` aliased per column in clinicalTrials.ts:
  //   dt  → start_date,  dt2 → end_date,  dt3 → last_updated.
  start_date: { sqlExpr: "dt.full_date", sortable: true, filterKind: "DATE", isAggregated: false },
  end_date: { sqlExpr: "dt2.full_date", sortable: true, filterKind: "DATE", isAggregated: false },
  last_updated: {
    sqlExpr: "dt3.full_date",
    sortable: true,
    filterKind: "DATE",
    isAggregated: false,
  },
  sponsor: { sqlExpr: "t.sponsor", sortable: true, filterKind: "TEXT", isAggregated: false },
  collaborator: {
    sqlExpr: "t.collaborator",
    sortable: false,
    filterKind: "TEXT",
    isAggregated: true,
  },
  locations: { sqlExpr: "t.locations", sortable: false, filterKind: "TEXT", isAggregated: true },
  source_text: {
    sqlExpr: "t.source_text",
    sortable: false,
    filterKind: "TEXT",
    isAggregated: false,
  },
  age_groups: { sqlExpr: "t.age_groups", sortable: false, filterKind: "TEXT", isAggregated: false },
  disease_name: {
    sqlExpr: "d.disease_filter",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  funder_type: {
    sqlExpr: "t.funder_type",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  interventions: {
    sqlExpr: "t.interventions",
    sortable: false,
    filterKind: "TEXT",
    isAggregated: false,
  },
  outcome_measure: {
    sqlExpr: "t.outcome_measure",
    sortable: false,
    filterKind: "TEXT",
    isAggregated: false,
  },
  sex: { sqlExpr: "t.sex", sortable: true, filterKind: "CATEGORY", isAggregated: false },
  study_design: {
    sqlExpr: "t.study_design",
    sortable: false,
    filterKind: "TEXT",
    isAggregated: false,
  },
  study_type: {
    sqlExpr: "t.study_type",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  ct_results_type: {
    sqlExpr: "t.ct_results_type",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  ct_terminated_reason: {
    sqlExpr: "t.ct_terminated_reason",
    sortable: false,
    filterKind: "TEXT",
    isAggregated: false,
  },
};

// R&D priorities (no candidate join). The priority table is aliased
// as `p` and dim_disease as `d` in rdPriorities.ts. Disease names live
// on `d.disease_filter` in this resolver (not `disease_group_name`,
// which is the candidate-side label).
const RD_PRIORITIES: Record<string, ColumnDef> = {
  priority_name: {
    sqlExpr: "p.priority_name",
    sortable: true,
    filterKind: "TEXT",
    isAggregated: false,
  },
  indication: { sqlExpr: "p.indication", sortable: false, filterKind: "TEXT", isAggregated: false },
  intended_use: {
    sqlExpr: "p.intended_use",
    sortable: false,
    filterKind: "TEXT",
    isAggregated: false,
  },
  global_health_area: {
    sqlExpr: "d.global_health_area",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  disease_name: {
    sqlExpr: "d.disease_filter",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  product_name: {
    sqlExpr: "pr.product_name",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
  author: { sqlExpr: "p.author", sortable: true, filterKind: "TEXT", isAggregated: false },
  publication_date: {
    sqlExpr: "p.publication_date",
    sortable: true,
    filterKind: "TEXT",
    isAggregated: false,
  },
  target_population: {
    sqlExpr: "p.target_population",
    sortable: false,
    filterKind: "TEXT",
    isAggregated: false,
  },
  efficacy: { sqlExpr: "p.efficacy", sortable: false, filterKind: "TEXT", isAggregated: false },
  safety: { sqlExpr: "p.safety", sortable: false, filterKind: "TEXT", isAggregated: false },
  source: { sqlExpr: "p.source", sortable: false, filterKind: "TEXT", isAggregated: false },
};

// R&D priorities WITH candidates (inherits scalar columns + candidate cols).
const RD_PRIORITIES_WITH_CANDIDATES: Record<string, ColumnDef> = {
  ...RD_PRIORITIES,
  candidate_name: {
    sqlExpr: "c.candidate_name",
    sortable: true,
    filterKind: "TEXT",
    isAggregated: false,
  },
  current_rd_stage: {
    sqlExpr: "c.current_rd_stage",
    sortable: true,
    filterKind: "CATEGORY",
    isAggregated: false,
  },
};

export const TABLE_COLUMNS: Record<DataTableId, Record<string, ColumnDef>> = {
  PORTFOLIO_CANDIDATES,
  CLINICAL_TRIALS,
  RD_PRIORITIES,
  RD_PRIORITIES_WITH_CANDIDATES,
};

export function resolveColumn(table: DataTableId, accessor: string): ColumnDef | null {
  return TABLE_COLUMNS[table]?.[accessor] ?? null;
}

export function isCategoryColumn(table: DataTableId, accessor: string): boolean {
  return resolveColumn(table, accessor)?.filterKind === "CATEGORY";
}
