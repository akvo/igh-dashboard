// =============================================================================
// Column-filter and sort SQL fragment builders
// =============================================================================
//
// Pure functions that translate the GraphQL `column_filters` / `sort` inputs
// into SQL fragments + parameter arrays. Callers compose the conditions into
// their existing WHERE clause with AND semantics.
//
// LIKE-wildcard escaping: SQLite LIKE supports `%` and `_` as wildcards. User
// input must be sanitised so a query like "50%" doesn't match every row. We
// escape `%`, `_`, and `\` and use `ESCAPE '\\'` on the LIKE expression.
//
// Aggregated columns (developers_agg, locations, collaborator) store
// concatenated text like "GSK; Merck". Plain LIKE '%GSK%' against that string
// matches "any row containing GSK as a substring," which is the desired
// "row's developers includes GSK" semantic. CATEGORY filtering on aggregated
// columns is intentionally unsupported (would require splitting on the
// separator and matching each token); aggregated columns in the registry are
// flagged TEXT so the dropdown UI never offers them as a category filter.
//
// Unusable inputs are ignored rather than rejected, so a saved dashboard URL
// keeps working after a column is renamed or removed. Each ignored input is
// reported back (`ignored`) so an API caller can see that a filter or sort
// had no effect: an unknown column, a NUMBER/DATE filter on a column of
// another kind, CATEGORY on a number, date or aggregated column, or a sort on
// an unsortable column. On a known column, blank values (empty text, empty
// category list, no operator or no usable number or date) are the normal
// "filter cleared" state and are not reported.
//
// NUMBER and DATE operate on registered columns only. Bad input (non-finite
// numbers, malformed dates) is dropped without a report — the frontend should
// be validating before send, but the resolver defends in depth. BETWEEN with one
// bound null degrades to single-sided (>= or <= only); both null is a no-op.
// DATE EQ and BETWEEN wrap both sides in `DATE()` so a column carrying a
// timestamp still matches by calendar day.

import { resolveColumn, type ColumnDef, type DataTableId } from "./columnRegistry.js";

export type ColumnFilterOperator = "EQ" | "LT" | "GT" | "BEFORE" | "AFTER" | "BETWEEN";

export interface ColumnFilterInput {
  column: string;
  kind: "TEXT" | "CATEGORY" | "NUMBER" | "DATE";
  // TEXT
  text?: string | null;
  // CATEGORY
  values?: string[] | null;
  // NUMBER + DATE
  operator?: ColumnFilterOperator | null;
  // NUMBER
  number_value?: number | null;
  number_value_end?: number | null;
  // DATE — ISO yyyy-mm-dd
  date_value?: string | null;
  date_value_end?: string | null;
}

export interface ColumnSortInput {
  column: string;
  direction: "ASC" | "DESC";
}

export interface FilterFragment {
  conditions: string[];
  params: (string | number)[];
}

export type IgnoredReason =
  | "UNKNOWN_COLUMN"
  | "KIND_MISMATCH"
  | "NOT_SORTABLE"
  | "AGGREGATED_CATEGORY";

export interface IgnoredInput {
  input: "FILTER" | "SORT";
  column: string;
  reason: IgnoredReason;
}

export interface ColumnFilterResult extends FilterFragment {
  ignored: IgnoredInput[];
}

export interface OrderByResult {
  orderBy: string | null;
  ignored: IgnoredInput[];
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function escapeLikePattern(input: string): string {
  // Escape SQLite LIKE wildcards (% and _) and the escape character itself.
  return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

function needsLikeEscape(text: string): boolean {
  return /[\\%_]/.test(text);
}

// Per-kind clause emitters. Each returns conditions + params for a
// single filter input or `null` if the input degrades to a no-op
// (empty / invalid / unsupported on the registered column kind).

function emitText(sqlExpr: string, f: ColumnFilterInput): FilterFragment | null {
  const text = (f.text ?? "").trim();
  if (text === "") return null;
  const useEscape = needsLikeEscape(text);
  const pattern = `%${useEscape ? escapeLikePattern(text) : text}%`;
  return {
    conditions: [useEscape ? `${sqlExpr} LIKE ? ESCAPE '\\'` : `${sqlExpr} LIKE ?`],
    params: [pattern],
  };
}

function categoryValues(f: ColumnFilterInput): string[] {
  return (f.values ?? []).filter((v) => v !== null && v !== undefined);
}

function emitCategory(sqlExpr: string, f: ColumnFilterInput): FilterFragment | null {
  const values = categoryValues(f);
  if (values.length === 0) return null;
  const placeholders = values.map(() => "?").join(", ");
  return {
    conditions: [`${sqlExpr} IN (${placeholders})`],
    params: values,
  };
}

// eslint-disable-next-line complexity -- four operators × NULL-bound branches
function emitNumber(sqlExpr: string, f: ColumnFilterInput): FilterFragment | null {
  const op = f.operator ?? null;
  if (!op) return null;
  const v = Number.isFinite(f.number_value as number) ? (f.number_value as number) : null;
  const vEnd = Number.isFinite(f.number_value_end as number)
    ? (f.number_value_end as number)
    : null;
  if (op === "EQ" && v != null) {
    return { conditions: [`${sqlExpr} = ?`], params: [v] };
  }
  if (op === "LT" && v != null) {
    return { conditions: [`${sqlExpr} < ?`], params: [v] };
  }
  if (op === "GT" && v != null) {
    return { conditions: [`${sqlExpr} > ?`], params: [v] };
  }
  if (op === "BETWEEN") {
    if (v != null && vEnd != null) {
      return {
        conditions: [`${sqlExpr} >= ? AND ${sqlExpr} <= ?`],
        params: [v, vEnd],
      };
    }
    if (v != null) return { conditions: [`${sqlExpr} >= ?`], params: [v] };
    if (vEnd != null) return { conditions: [`${sqlExpr} <= ?`], params: [vEnd] };
  }
  return null;
}

// eslint-disable-next-line complexity -- four operators × NULL-bound branches
function emitDate(sqlExpr: string, f: ColumnFilterInput): FilterFragment | null {
  const op = f.operator ?? null;
  if (!op) return null;
  const d = typeof f.date_value === "string" && ISO_DATE.test(f.date_value) ? f.date_value : null;
  const dEnd =
    typeof f.date_value_end === "string" && ISO_DATE.test(f.date_value_end)
      ? f.date_value_end
      : null;
  if (op === "EQ" && d) {
    return { conditions: [`DATE(${sqlExpr}) = DATE(?)`], params: [d] };
  }
  if (op === "BEFORE" && d) {
    return { conditions: [`${sqlExpr} < ?`], params: [d] };
  }
  if (op === "AFTER" && d) {
    return { conditions: [`${sqlExpr} > ?`], params: [d] };
  }
  if (op === "BETWEEN") {
    if (d && dEnd) {
      return {
        conditions: [`DATE(${sqlExpr}) >= DATE(?) AND DATE(${sqlExpr}) <= DATE(?)`],
        params: [d, dEnd],
      };
    }
    if (d) {
      return { conditions: [`DATE(${sqlExpr}) >= DATE(?)`], params: [d] };
    }
    if (dEnd) {
      return { conditions: [`DATE(${sqlExpr}) <= DATE(?)`], params: [dEnd] };
    }
  }
  return null;
}

// A filter with no value to apply: the dashboard's "filter cleared" state.
// Checked before the kind rules so a cleared filter is never reported.
function isBlankFilter(f: ColumnFilterInput): boolean {
  if (f.kind === "TEXT") return (f.text ?? "").trim() === "";
  if (f.kind === "CATEGORY") return categoryValues(f).length === 0;
  if (!f.operator) return true;
  if (f.kind === "NUMBER") {
    return !Number.isFinite(f.number_value) && !Number.isFinite(f.number_value_end);
  }
  const isDate = (d: string | null | undefined) => typeof d === "string" && ISO_DATE.test(d);
  return !isDate(f.date_value) && !isDate(f.date_value_end);
}

const isNumberOrDate = (kind: ColumnFilterInput["kind"]) => kind === "NUMBER" || kind === "DATE";

// Why a filter on a registered column can't be applied, or null if it can.
// TEXT is allowed on any column: a substring match on a number or date
// still means something. CATEGORY on a number or date column compares
// strings with stored values and would quietly match nothing.
function filterIgnoredReason(def: ColumnDef, f: ColumnFilterInput): IgnoredReason | null {
  if (isNumberOrDate(f.kind) && def.filterKind !== f.kind) return "KIND_MISMATCH";
  if (f.kind === "CATEGORY" && isNumberOrDate(def.filterKind)) return "KIND_MISMATCH";
  // Matching a value inside a "; "-joined list needs a split, which isn't
  // built; registering these columns as TEXT keeps the dashboard off it.
  if (f.kind === "CATEGORY" && def.isAggregated) return "AGGREGATED_CATEGORY";
  return null;
}

function emitFilter(def: ColumnDef, f: ColumnFilterInput): FilterFragment | null {
  if (f.kind === "TEXT") return emitText(def.sqlExpr, f);
  if (f.kind === "CATEGORY") return emitCategory(def.sqlExpr, f);
  if (f.kind === "NUMBER") return emitNumber(def.sqlExpr, f);
  if (f.kind === "DATE") return emitDate(def.sqlExpr, f);
  return null;
}

export function buildColumnFilterClauses(
  table: DataTableId,
  filters: ColumnFilterInput[] | null | undefined,
): ColumnFilterResult {
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  const ignored: IgnoredInput[] = [];

  for (const f of filters ?? []) {
    const def = resolveColumn(table, f.column);
    // An unknown column is reported even when blank, because a caller who
    // mistypes a name should hear about it whatever the value.
    if (!def) {
      ignored.push({ input: "FILTER", column: f.column, reason: "UNKNOWN_COLUMN" });
      continue;
    }
    if (isBlankFilter(f)) continue;
    const reason = filterIgnoredReason(def, f);
    if (reason) {
      ignored.push({ input: "FILTER", column: f.column, reason });
      continue;
    }

    const frag = emitFilter(def, f);
    if (frag) {
      conditions.push(...frag.conditions);
      params.push(...frag.params);
    }
  }

  return { conditions, params, ignored };
}

export function buildOrderBy(
  table: DataTableId,
  sorts: ColumnSortInput[] | null | undefined,
): OrderByResult {
  // One term per valid level, in priority order. Unknown / unsortable
  // columns are skipped (forward-compat with stale URLs) and reported,
  // and an all-invalid list degrades to null so callers fall back to
  // their per-table default ORDER BY.
  const terms: string[] = [];
  const ignored: IgnoredInput[] = [];
  for (const sort of sorts ?? []) {
    const def = resolveColumn(table, sort.column);
    if (!def || !def.sortable) {
      ignored.push({
        input: "SORT",
        column: sort.column,
        reason: def ? "NOT_SORTABLE" : "UNKNOWN_COLUMN",
      });
      continue;
    }
    const dir = sort.direction === "DESC" ? "DESC" : "ASC";
    terms.push(`${def.sqlExpr} ${dir} NULLS LAST`);
  }
  return { orderBy: terms.length === 0 ? null : `ORDER BY ${terms.join(", ")}`, ignored };
}
