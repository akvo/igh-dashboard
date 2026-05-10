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
  disease_name: {
    sqlExpr: "d.disease_group_name",
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
