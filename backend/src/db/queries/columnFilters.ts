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
// NUMBER and DATE operate on registered columns only. Bad input (non-finite
// numbers, malformed dates) is dropped silently — the frontend should be
// validating before send, but the resolver defends in depth. BETWEEN with one
// bound null degrades to single-sided (>= or <= only); both null is a no-op.
// DATE EQ and BETWEEN wrap both sides in `DATE()` so a column carrying a
// timestamp still matches by calendar day.

import { resolveColumn, type ColumnDef, type DataTableId } from "./columnRegistry.js";

export type ColumnFilterOperator = "EQ" | "LT" | "GT" | "BEFORE" | "AFTER" | "BETWEEN";

export interface ColumnFilterInput {
  column: string;
  kind: "TEXT" | "CATEGORY" | "NUMBER" | "DATE" | "HIERARCHICAL";
  // TEXT
  text?: string | null;
  // CATEGORY
  values?: string[] | null;
  // HIERARCHICAL (two-level category, e.g. disease parent/child)
  primary_values?: string[] | null;
  secondary_values?: string[] | null;
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

function emitCategory(
  sqlExpr: string,
  isAggregated: boolean,
  f: ColumnFilterInput,
): FilterFragment | null {
  const values = (f.values ?? []).filter((v) => v !== null && v !== undefined);
  if (values.length === 0) return null;
  // CATEGORY on aggregated columns is unsupported (the dropdown
  // registry never offers it). Treat as no-op rather than emit
  // broken SQL.
  if (isAggregated) return null;
  const placeholders = values.map(() => "?").join(", ");
  return {
    conditions: [`${sqlExpr} IN (${placeholders})`],
    params: values,
  };
}

// HIERARCHICAL: a two-level category filter. The selected parents and
// children are ORed so a mixed selection (a whole parent PLUS a child
// of a different parent) returns the union, which is what the picker
// implies. Each side is included only when non-empty; all-empty is a
// no-op. The whole thing is wrapped in one parenthesised group so it
// AND-combines safely with the rest of the WHERE clause.
function emitHierarchical(def: ColumnDef, f: ColumnFilterInput): FilterFragment | null {
  if (!def.hierarchy) return null;
  const primaries = (f.primary_values ?? []).filter((v) => v != null && v !== "");
  const secondaries = (f.secondary_values ?? []).filter((v) => v != null && v !== "");
  const ors: string[] = [];
  const params: (string | number)[] = [];
  if (primaries.length > 0) {
    ors.push(`${def.hierarchy.primaryExpr} IN (${primaries.map(() => "?").join(", ")})`);
    params.push(...primaries);
  }
  if (secondaries.length > 0) {
    ors.push(`${def.hierarchy.secondaryExpr} IN (${secondaries.map(() => "?").join(", ")})`);
    params.push(...secondaries);
  }
  if (ors.length === 0) return null;
  return { conditions: [`(${ors.join(" OR ")})`], params };
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

// eslint-disable-next-line complexity -- four kinds × kind-mismatch guards
export function buildColumnFilterClauses(
  table: DataTableId,
  filters: ColumnFilterInput[] | null | undefined,
): FilterFragment {
  if (!filters || filters.length === 0) return { conditions: [], params: [] };

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  for (const f of filters) {
    const def = resolveColumn(table, f.column);
    if (!def) continue; // Forward-compat: drop unknown columns silently.

    let frag: FilterFragment | null = null;
    if (f.kind === "TEXT") {
      frag = emitText(def.sqlExpr, f);
    } else if (f.kind === "CATEGORY") {
      frag = emitCategory(def.sqlExpr, def.isAggregated, f);
    } else if (f.kind === "HIERARCHICAL" && def.filterKind === "HIERARCHICAL") {
      frag = emitHierarchical(def, f);
    } else if (f.kind === "NUMBER" && def.filterKind === "NUMBER") {
      frag = emitNumber(def.sqlExpr, f);
    } else if (f.kind === "DATE" && def.filterKind === "DATE") {
      frag = emitDate(def.sqlExpr, f);
    }

    if (frag) {
      conditions.push(...frag.conditions);
      params.push(...frag.params);
    }
  }

  return { conditions, params };
}

export function buildOrderBy(
  table: DataTableId,
  sort: ColumnSortInput | null | undefined,
): string | null {
  if (!sort) return null;
  const def = resolveColumn(table, sort.column);
  if (!def || !def.sortable) return null;
  const dir = sort.direction === "DESC" ? "DESC" : "ASC";
  return `ORDER BY ${def.sqlExpr} ${dir} NULLS LAST`;
}
