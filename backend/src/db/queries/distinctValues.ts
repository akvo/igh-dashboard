// =============================================================================
// distinctValues query
// =============================================================================
//
// Returns the distinct, sorted, non-null values that appear in `column` for
// rows that match the supplied filter. Used by the DataTable category-filter
// dropdowns.
//
// `stripOwnColumnFilter` is exported for unit testing and called by the
// resolver before passing column_filters to the SQL builder. Without
// stripping, a dropdown for "technology_type" that already has a value
// selected would return only that value, hiding the others.

import { getDatabase } from "../connection.js";
import { buildColumnFilterClauses, type ColumnFilterInput } from "./columnFilters.js";
import { resolveColumn, type DataTableId } from "./columnRegistry.js";
import { PIPELINE_FILTER } from "./filterUtils.js";

// FROM + JOIN clauses per table, mirroring the corresponding list query
// so that a column expression registered against a specific alias (e.g.
// `dt.full_date`, `t.technology_type`) resolves at query time. Keep in
// sync with the per-table query files when joins change.
const PORTFOLIO_CANDIDATES_FROM = `
  dim_candidate_core c
  JOIN fact_pipeline_snapshot f ON c.candidate_key = f.candidate_key
  LEFT JOIN dim_disease d ON f.disease_key = d.disease_key
  LEFT JOIN dim_product pr ON f.product_key = pr.product_key
  LEFT JOIN dim_phase p ON f.phase_key = p.phase_key
  LEFT JOIN dim_candidate_regulatory r ON f.regulatory_key = r.regulatory_key
  LEFT JOIN dim_product sp ON f.sub_product_key = sp.product_key
  LEFT JOIN dim_candidate_tech t ON f.technology_key = t.technology_key
`;

const CLINICAL_TRIALS_FROM = `
  fact_clinical_trial_event t
  JOIN fact_pipeline_snapshot fps ON t.candidate_key = fps.candidate_key AND fps.is_active_flag = 1 AND fps.include_in_pipeline = 1
  LEFT JOIN dim_candidate_core c ON t.candidate_key = c.candidate_key
  LEFT JOIN dim_disease d ON t.disease_key = d.disease_key
  LEFT JOIN dim_product pr ON t.product_key = pr.product_key
  LEFT JOIN dim_date dt ON t.start_date_key = dt.date_key
  LEFT JOIN dim_date dt2 ON t.end_date_key = dt2.date_key
  LEFT JOIN dim_date dt3 ON t.last_updated_key = dt3.date_key
`;

const RD_PRIORITIES_FROM = `
  dim_priority p
  LEFT JOIN dim_disease d ON p.disease_key = d.disease_key
  LEFT JOIN dim_product pr ON p.product_key = pr.product_key
`;

const RD_PRIORITIES_WITH_CANDIDATES_FROM = `
  dim_priority p
  LEFT JOIN dim_disease d ON p.disease_key = d.disease_key
  LEFT JOIN dim_product pr ON p.product_key = pr.product_key
  LEFT JOIN bridge_candidate_priority bp ON p.priority_key = bp.priority_key
  LEFT JOIN dim_candidate_core c ON bp.candidate_key = c.candidate_key
`;

interface TableInfo {
  from: string;
  baseConditions: string[];
}

const TABLE_FROM: Record<DataTableId, TableInfo> = {
  PORTFOLIO_CANDIDATES: {
    from: PORTFOLIO_CANDIDATES_FROM,
    // Mirror `portfolioCandidates.ts::buildWhere` exactly. Without
    // PIPELINE_FILTER the dropdown surfaces stage / approval values
    // that only exist on rows where `include_in_pipeline = 0` (e.g.
    // "0", "Unclear", "Not applicable"); the list query filters them
    // out so selecting one yields an empty table.
    baseConditions: ["f.is_active_flag = 1", PIPELINE_FILTER],
  },
  CLINICAL_TRIALS: {
    from: CLINICAL_TRIALS_FROM,
    baseConditions: [],
  },
  RD_PRIORITIES: {
    from: RD_PRIORITIES_FROM,
    baseConditions: [],
  },
  RD_PRIORITIES_WITH_CANDIDATES: {
    from: RD_PRIORITIES_WITH_CANDIDATES_FROM,
    baseConditions: [],
  },
};

export interface DistinctValuesFilter {
  global_health_areas?: string[];
  primary_disease_names?: string[];
  secondary_disease_names?: string[];
  product_names?: string[];
  candidate_type?: string;
  phase_names?: string[];
  statuses?: string[];
  column_filters?: ColumnFilterInput[];
}

export function stripOwnColumnFilter(
  column: string,
  filters: ColumnFilterInput[] | null | undefined,
): ColumnFilterInput[] {
  if (!filters) return [];
  return filters.filter((f) => f.column !== column);
}

// Per-table array-filter emitters. Each one mutates the conditions /
// params arrays it receives. Pulled out of getDistinctValues to keep
// that function under the cyclomatic-complexity threshold.

function addArr(
  vals: string[] | undefined,
  sql: string,
  conditions: string[],
  params: (string | number)[],
): void {
  if (!vals || vals.length === 0) return;
  conditions.push(`${sql} IN (${vals.map(() => "?").join(", ")})`);
  params.push(...vals);
}

// eslint-disable-next-line complexity -- per-table filter dispatch with shared field set
function applyTableSpecificFilters(
  table: DataTableId,
  filter: DistinctValuesFilter | undefined,
  conditions: string[],
  params: (string | number)[],
): void {
  if (table === "PORTFOLIO_CANDIDATES") {
    addArr(filter?.global_health_areas, "d.global_health_area", conditions, params);
    addArr(filter?.primary_disease_names, "d.disease_filter", conditions, params);
    addArr(filter?.secondary_disease_names, "d.secondary_disease_name", conditions, params);
    addArr(filter?.product_names, "pr.product_name", conditions, params);
    addArr(filter?.phase_names, "p.phase_name", conditions, params);
    if (filter?.candidate_type) {
      conditions.push("c.candidate_type = ?");
      params.push(filter.candidate_type);
    }
    return;
  }
  if (table === "CLINICAL_TRIALS") {
    addArr(filter?.global_health_areas, "d.global_health_area", conditions, params);
    addArr(filter?.primary_disease_names, "d.disease_filter", conditions, params);
    addArr(filter?.secondary_disease_names, "d.secondary_disease_name", conditions, params);
    addArr(filter?.product_names, "pr.product_name", conditions, params);
    addArr(filter?.statuses, "t.status", conditions, params);
    return;
  }
  // RD_PRIORITIES + RD_PRIORITIES_WITH_CANDIDATES share the same set.
  addArr(filter?.global_health_areas, "d.global_health_area", conditions, params);
  addArr(filter?.primary_disease_names, "d.disease_filter", conditions, params);
  addArr(filter?.secondary_disease_names, "d.secondary_disease_name", conditions, params);
}

export function getDistinctValues(
  table: DataTableId,
  column: string,
  filter?: DistinctValuesFilter,
): string[] {
  const def = resolveColumn(table, column);
  // Only CATEGORY columns are valid distinct-value targets. Returning
  // an empty array for unknown / non-category columns avoids
  // accidentally dumping every free-text indication string into the
  // response.
  if (!def || def.filterKind !== "CATEGORY") return [];

  const tableInfo = TABLE_FROM[table];
  if (!tableInfo) return [];

  const conditions = [...tableInfo.baseConditions];
  const params: (string | number)[] = [];

  applyTableSpecificFilters(table, filter, conditions, params);

  // Apply column_filters EXCLUDING the requesting column's own entry
  // so the dropdown for an already-selected column still shows every
  // option that survives the OTHER filters.
  const stripped = stripOwnColumnFilter(column, filter?.column_filters);
  const cf = buildColumnFilterClauses(table, stripped);
  conditions.push(...cf.conditions);
  params.push(...cf.params);

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const sql = `
    SELECT DISTINCT ${def.sqlExpr} as v
    FROM ${tableInfo.from}
    ${where}
    ORDER BY v ASC
  `;

  const rows = getDatabase()
    .prepare(sql)
    .all(...params) as Array<{ v: string | null }>;
  return rows.map((r) => r.v).filter((v): v is string => typeof v === "string" && v !== "");
}
