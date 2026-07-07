import { getDatabase } from "../connection.js";
import { addArrayCondition, PIPELINE_FILTER } from "./filterUtils.js";
import type {
  PriorityAlignmentAreaShare,
  PriorityAlignmentDiseaseOption,
  PriorityAlignmentInput,
  PriorityAlignmentOverview,
  PriorityAlignmentProductType,
  PriorityAlignmentWomenChildrenShare,
} from "../types.js";

// =========================================================
// Fixed GHA order
// =========================================================
// `byArea` must always return these three GHAs in this exact order so
// the frontend can index positionally. The resolver pads missing rows
// with zeros after the SQL.

const FIXED_GHA_ORDER = [
  "Neglected disease",
  "Emerging infectious disease",
  "Womens Health",
] as const;

// =========================================================
// Non-stub priority predicate
// =========================================================
// Stub priorities (null / empty priority_name) are excluded from every
// aggregate: totalPriorities, byArea numerator, product types donut,
// the priorities list, and diseaseOptions.

const NON_EMPTY_PRIORITY =
  "p.priority_name IS NOT NULL AND TRIM(p.priority_name) != '' AND p.priority_name != 'Test_TO'";

/**
 * Single consolidated query for the WHO Priority Alignment section.
 *
 * Filtering: every sub-query honours the four-arg filter set
 * (global_health_areas, primary_disease_names, secondary_disease_names,
 * product_names) via the shared `addArrayCondition` helper. The
 * `diseaseOptions` sub-query is the lone exception — it always returns
 * every priority-bearing disease so the dropdown isn't self-trimming.
 *
 * Stub priorities (priority_name null/empty) are excluded everywhere.
 */
export function getPriorityAlignmentOverview(
  input: PriorityAlignmentInput,
): PriorityAlignmentOverview {
  const db = getDatabase();
  const filters = {
    global_health_areas: input.global_health_areas ?? undefined,
    primary_disease_names: input.primary_disease_names ?? undefined,
    secondary_disease_names: input.secondary_disease_names ?? undefined,
    product_names: input.product_names ?? undefined,
    phase_names: input.phase_names ?? undefined,
  };

  // ---------------------------------------------------------------------
  // 1. totalPriorities — single scalar.
  //
  // Uses the same conditional-join pattern as womenOrChildrenShare and
  // runPriorities: dim_disease is joined only when a GHA/disease filter
  // is active, and the pipeline bridge tables are joined only when a
  // product or phase filter is active. The unfiltered case is a bare COUNT(DISTINCT)
  // on dim_priority so that priorities with a NULL disease_key are
  // correctly included, keeping totalPriorities at 65.
  // ---------------------------------------------------------------------
  const totalRow = runTotalPriorities(db, filters);

  // ---------------------------------------------------------------------
  // 2. byArea — per-GHA candidate-level alignment, padded to fixed order.
  // Counts active-pipeline candidates whose disease falls under each of
  // the three WHO global health areas. Numerator is the subset of those
  // candidates that have at least one bridge row to a non-stub priority.
  // COUNT(DISTINCT f.candidate_key) is required on both numerator and
  // denominator because the LEFT JOINs fan out.
  // ---------------------------------------------------------------------
  const byArea = runByArea(db, filters);

  // ---------------------------------------------------------------------
  // 3. productTypeBreakdown — candidates linked to a published priority
  //    via bridge_candidate_priority, grouped by product_name. We also
  //    project per-GHA buckets so the post-processing step can compute
  //    applicableProductNames for each visible GHA card.
  // ---------------------------------------------------------------------
  const { flat: productTypeBreakdown, byGha: productTypeByGha } = runProductTypeBreakdown(
    db,
    filters,
  );

  // ---------------------------------------------------------------------
  // 4. diseaseOptions — ALWAYS unfiltered so the dropdown isn't
  //    self-trimming. Same SQL as before.
  // ---------------------------------------------------------------------
  const diseaseOptions = db
    .prepare(
      `SELECT DISTINCT
         d.disease_key,
         d.disease_name,
         d.disease_filter,
         d.global_health_area
       FROM dim_disease d
       INNER JOIN dim_priority p ON p.disease_key = d.disease_key
       WHERE ${NON_EMPTY_PRIORITY}
         AND d.disease_name IS NOT NULL
         AND TRIM(d.disease_name) != ''
       ORDER BY d.disease_name`,
    )
    .all() as PriorityAlignmentDiseaseOption[];

  // ---------------------------------------------------------------------
  // 5. womenOrChildrenShare — Yes/No/unknown bucket counts.
  // ---------------------------------------------------------------------
  const womenOrChildrenShare = runWomenOrChildrenShare(db, filters);

  // ---------------------------------------------------------------------
  // 6. priorities — alphabetical, filtered, non-stub priority list.
  //    Drives PriorityListCard + PriorityListPanel.
  // ---------------------------------------------------------------------
  const priorities = runPriorities(db, filters);

  // ---------------------------------------------------------------------
  // 7. Post-processing: per-GHA applicable* arrays.
  // ---------------------------------------------------------------------
  const applicableDiseasesByGha = computeApplicableDiseases(db, filters);
  const applicableProductNamesByGha = computeApplicableProductNames(filters, productTypeByGha);

  // ---------------------------------------------------------------------
  // 8. Pad byArea to the fixed GHA order and attach applicable arrays.
  // ---------------------------------------------------------------------
  const byAreaMap = new Map(byArea.map((r) => [r.global_health_area, r]));
  const paddedByArea: PriorityAlignmentAreaShare[] = FIXED_GHA_ORDER.map((gha) => {
    const row = byAreaMap.get(gha) ?? {
      global_health_area: gha,
      candidatesWithPriority: 0,
      totalCandidates: 0,
    };
    return {
      ...row,
      sharePercentage:
        row.totalCandidates > 0 ? row.candidatesWithPriority / row.totalCandidates : 0,
      applicableDiseases: applicableDiseasesByGha[gha] ?? [],
      applicableProductNames: applicableProductNamesByGha[gha] ?? [],
    };
  });

  return {
    totalPriorities: totalRow.total,
    byArea: paddedByArea,
    productTypeBreakdown,
    diseaseOptions,
    womenOrChildrenShare,
    priorities,
  };
}

// =====================================================================
// Sub-query helpers
// =====================================================================

interface ResolvedFilters {
  global_health_areas?: string[];
  primary_disease_names?: string[];
  secondary_disease_names?: string[];
  product_names?: string[];
  phase_names?: string[];
}

// Returns true when at least one disease-side filter axis is active.
function hasAnyDiseaseFilter(filters: ResolvedFilters): boolean {
  return (
    (filters.global_health_areas?.length ?? 0) > 0 ||
    (filters.primary_disease_names?.length ?? 0) > 0 ||
    (filters.secondary_disease_names?.length ?? 0) > 0
  );
}

// True when at least one candidate-side filter (product or phase) is active.
// These are the filters that force the priority-catalog sub-queries to route
// through the pipeline (bridge -> fact) instead of counting dim_priority directly.
function hasAnyPipelineFilter(filters: ResolvedFilters): boolean {
  return (filters.product_names?.length ?? 0) > 0 || (filters.phase_names?.length ?? 0) > 0;
}

// Priority-side disease rows have `disease_filter = NULL` for 17 of 19
// priority-bearing diseases (only Mpox is non-null). The OR clause matches
// on `disease_filter` (candidate-side rows) OR trimmed `disease_name`
// (priority-side rows), passing the selected names twice for placeholders.
function applyPrimaryDiseaseCondition(
  filters: ResolvedFilters,
  conditions: string[],
  params: (string | number)[],
): void {
  if (filters.primary_disease_names && filters.primary_disease_names.length > 0) {
    const placeholders = filters.primary_disease_names.map(() => "?").join(", ");
    conditions.push(
      `(d.disease_filter IN (${placeholders}) OR TRIM(d.disease_name) IN (${placeholders}))`,
    );
    params.push(...filters.primary_disease_names, ...filters.primary_disease_names);
  }
}

// Count distinct non-stub priorities. When no product filter is active the
// count comes straight from dim_priority (no pipeline join) so that
// priorities without any pipeline candidate are included, keeping the
// unfiltered total at 66. When a product filter is active the bridge →
// pipeline path is used to narrow to matching candidates.
function runTotalPriorities(
  db: ReturnType<typeof getDatabase>,
  filters: ResolvedFilters,
): { total: number } {
  const joins: string[] = [];
  const conditions = [NON_EMPTY_PRIORITY];
  const params: (string | number)[] = [];

  if (hasAnyDiseaseFilter(filters)) {
    joins.push("JOIN dim_disease d ON d.disease_key = p.disease_key");
    addArrayCondition(filters.global_health_areas, "d.global_health_area", conditions, params);
    applyPrimaryDiseaseCondition(filters, conditions, params);
    addArrayCondition(
      filters.secondary_disease_names,
      "d.secondary_disease_name",
      conditions,
      params,
    );
  }
  if (hasAnyPipelineFilter(filters)) {
    joins.push("JOIN bridge_candidate_priority bp ON bp.priority_key = p.priority_key");
    joins.push("JOIN fact_pipeline_snapshot f ON f.candidate_key = bp.candidate_key");
    conditions.push("f.is_active_flag = 1");
    joins.push("JOIN dim_product pr ON pr.product_key = f.product_key");
    addArrayCondition(filters.product_names, "pr.product_name", conditions, params);
    if (filters.phase_names && filters.phase_names.length > 0) {
      joins.push("JOIN dim_phase ph ON ph.phase_key = f.phase_key");
      addArrayCondition(filters.phase_names, "ph.phase_name", conditions, params);
    }
  }

  const sql = `SELECT COUNT(DISTINCT p.priority_key) AS total
               FROM dim_priority p
               ${joins.join("\n               ")}
               WHERE ${conditions.join("\n                 AND ")}`;
  return db.prepare(sql).get(...params) as { total: number };
}

function runByArea(
  db: ReturnType<typeof getDatabase>,
  filters: ResolvedFilters,
): Array<{
  global_health_area: string;
  candidatesWithPriority: number;
  totalCandidates: number;
}> {
  const joins: string[] = [
    "JOIN dim_disease d ON d.disease_key = f.disease_key",
    "LEFT JOIN bridge_candidate_priority bp ON bp.candidate_key = f.candidate_key",
    "LEFT JOIN dim_priority p ON p.priority_key = bp.priority_key",
  ];
  const conditions = [
    "f.is_active_flag = 1",
    PIPELINE_FILTER,
    "d.global_health_area IN ('Neglected disease','Emerging infectious disease','Womens Health')",
  ];
  const params: (string | number)[] = [];

  addArrayCondition(filters.global_health_areas, "d.global_health_area", conditions, params);
  addArrayCondition(filters.primary_disease_names, "d.disease_filter", conditions, params);
  addArrayCondition(
    filters.secondary_disease_names,
    "d.secondary_disease_name",
    conditions,
    params,
  );
  if (filters.product_names && filters.product_names.length > 0) {
    // Inline the product join here (rather than delegating to
    // applyProductFilters) because runByArea already includes
    // `f.is_active_flag = 1` and PIPELINE_FILTER in its base conditions —
    // calling applyProductFilters would duplicate them.
    joins.push("JOIN dim_product pr ON pr.product_key = f.product_key");
    addArrayCondition(filters.product_names, "pr.product_name", conditions, params);
  }
  if (filters.phase_names && filters.phase_names.length > 0) {
    joins.push("JOIN dim_phase ph ON ph.phase_key = f.phase_key");
    addArrayCondition(filters.phase_names, "ph.phase_name", conditions, params);
  }

  const sql = `SELECT
                 d.global_health_area,
                 COUNT(DISTINCT f.candidate_key) AS totalCandidates,
                 COUNT(DISTINCT CASE WHEN ${NON_EMPTY_PRIORITY} THEN f.candidate_key END) AS candidatesWithPriority
               FROM fact_pipeline_snapshot f
               ${joins.join("\n               ")}
               WHERE ${conditions.join("\n                 AND ")}
               GROUP BY d.global_health_area`;
  return db.prepare(sql).all(...params) as Array<{
    global_health_area: string;
    candidatesWithPriority: number;
    totalCandidates: number;
  }>;
}

function runProductTypeBreakdown(
  db: ReturnType<typeof getDatabase>,
  filters: ResolvedFilters,
): {
  flat: PriorityAlignmentProductType[];
  byGha: Map<string, Map<string, number>>;
} {
  const joins: string[] = [
    "JOIN bridge_candidate_priority bp ON bp.candidate_key = f.candidate_key",
    "JOIN dim_priority p ON p.priority_key = bp.priority_key",
    "JOIN dim_product pr ON pr.product_key = f.product_key",
    "JOIN dim_disease d ON d.disease_key = f.disease_key",
  ];
  const conditions = ["f.is_active_flag = 1", PIPELINE_FILTER, NON_EMPTY_PRIORITY];
  const params: (string | number)[] = [];

  addArrayCondition(filters.global_health_areas, "d.global_health_area", conditions, params);
  addArrayCondition(filters.primary_disease_names, "d.disease_filter", conditions, params);
  addArrayCondition(
    filters.secondary_disease_names,
    "d.secondary_disease_name",
    conditions,
    params,
  );
  addArrayCondition(filters.product_names, "pr.product_name", conditions, params);
  if (filters.phase_names && filters.phase_names.length > 0) {
    joins.push("JOIN dim_phase ph ON ph.phase_key = f.phase_key");
    addArrayCondition(filters.phase_names, "ph.phase_name", conditions, params);
  }

  // Group by GHA + product_name so we can both project the flat donut
  // shape and compute applicableProductNames per GHA in post-processing.
  // COALESCE handles candidates with a NULL product_name so they appear
  // as "Other" rather than being silently excluded (the old IS NOT NULL
  // guard dropped them, causing the donut total to undershoot byArea's
  // candidatesWithPriority).
  const sql = `SELECT
                 d.global_health_area,
                 COALESCE(pr.product_name, 'Other') AS product_name,
                 COUNT(DISTINCT f.candidate_key) AS candidateCount
               FROM fact_pipeline_snapshot f
               ${joins.join("\n               ")}
               WHERE ${conditions.join("\n                 AND ")}
               GROUP BY d.global_health_area, COALESCE(pr.product_name, 'Other')`;
  const rows = db.prepare(sql).all(...params) as Array<{
    global_health_area: string | null;
    product_name: string;
    candidateCount: number;
  }>;

  // Project: flat donut shape (sum across GHAs) + per-GHA bucket map.
  const flatMap = new Map<string, number>();
  const byGha = new Map<string, Map<string, number>>();
  for (const row of rows) {
    flatMap.set(row.product_name, (flatMap.get(row.product_name) ?? 0) + row.candidateCount);
    const gha = row.global_health_area ?? "";
    if (!byGha.has(gha)) byGha.set(gha, new Map());
    byGha.get(gha)!.set(row.product_name, row.candidateCount);
  }
  const flat: PriorityAlignmentProductType[] = Array.from(flatMap.entries())
    .map(([product_name, candidateCount]) => ({ product_name, candidateCount }))
    .sort((a, b) => b.candidateCount - a.candidateCount);

  return { flat, byGha };
}

// Build the womens/children share SQL — two variants differ only in their
// aggregate expressions. The fanout variant uses COUNT(DISTINCT) to guard
// against duplicate rows that arise when the product join is active.

const WC_SQL_FANOUT = (joins: string[], conditions: string[]) =>
  `SELECT
     COUNT(DISTINCT CASE WHEN p.dedicated_to_women_or_children = 'Yes' THEN p.priority_key END) AS yes,
     COUNT(DISTINCT CASE WHEN p.dedicated_to_women_or_children = 'No' THEN p.priority_key END) AS no,
     COUNT(DISTINCT CASE WHEN p.dedicated_to_women_or_children IS NULL
                          OR p.dedicated_to_women_or_children NOT IN ('Yes','No')
                          THEN p.priority_key END) AS unknown
   FROM dim_priority p
   ${joins.join("\n   ")}
   WHERE ${conditions.join("\n     AND ")}`;

function runWomenOrChildrenShare(
  db: ReturnType<typeof getDatabase>,
  filters: ResolvedFilters,
): PriorityAlignmentWomenChildrenShare {
  const joins: string[] = [];
  const conditions = [NON_EMPTY_PRIORITY];
  const params: (string | number)[] = [];

  if (hasAnyDiseaseFilter(filters)) {
    joins.push("JOIN dim_disease d ON d.disease_key = p.disease_key");
    addArrayCondition(filters.global_health_areas, "d.global_health_area", conditions, params);
    applyPrimaryDiseaseCondition(filters, conditions, params);
    addArrayCondition(
      filters.secondary_disease_names,
      "d.secondary_disease_name",
      conditions,
      params,
    );
  }
  if (hasAnyPipelineFilter(filters)) {
    joins.push("JOIN bridge_candidate_priority bp ON bp.priority_key = p.priority_key");
    joins.push("JOIN fact_pipeline_snapshot f ON f.candidate_key = bp.candidate_key");
    conditions.push("f.is_active_flag = 1");
    joins.push("JOIN dim_product pr ON pr.product_key = f.product_key");
    addArrayCondition(filters.product_names, "pr.product_name", conditions, params);
    if (filters.phase_names && filters.phase_names.length > 0) {
      joins.push("JOIN dim_phase ph ON ph.phase_key = f.phase_key");
      addArrayCondition(filters.phase_names, "ph.phase_name", conditions, params);
    }
  }

  // When product or phase filter is active the bridge join fans out (one priority →
  // many candidates), so always use COUNT(DISTINCT) to avoid double-counting.
  const sql = WC_SQL_FANOUT(joins, conditions);

  const row = db.prepare(sql).get(...params) as {
    yes: number | null;
    no: number | null;
    unknown: number | null;
  };
  return { yes: row.yes ?? 0, no: row.no ?? 0, unknown: row.unknown ?? 0 };
}

function runPriorities(
  db: ReturnType<typeof getDatabase>,
  filters: ResolvedFilters,
): Array<{ priority_key: number; priority_name: string }> {
  const joins: string[] = [];
  const conditions = [NON_EMPTY_PRIORITY];
  const params: (string | number)[] = [];

  if (hasAnyDiseaseFilter(filters)) {
    joins.push("JOIN dim_disease d ON d.disease_key = p.disease_key");
    addArrayCondition(filters.global_health_areas, "d.global_health_area", conditions, params);
    applyPrimaryDiseaseCondition(filters, conditions, params);
    addArrayCondition(
      filters.secondary_disease_names,
      "d.secondary_disease_name",
      conditions,
      params,
    );
  }
  if (hasAnyPipelineFilter(filters)) {
    joins.push("JOIN bridge_candidate_priority bp ON bp.priority_key = p.priority_key");
    joins.push("JOIN fact_pipeline_snapshot f ON f.candidate_key = bp.candidate_key");
    conditions.push("f.is_active_flag = 1");
    joins.push("JOIN dim_product pr ON pr.product_key = f.product_key");
    addArrayCondition(filters.product_names, "pr.product_name", conditions, params);
    if (filters.phase_names && filters.phase_names.length > 0) {
      joins.push("JOIN dim_phase ph ON ph.phase_key = f.phase_key");
      addArrayCondition(filters.phase_names, "ph.phase_name", conditions, params);
    }
  }

  const sql = `SELECT DISTINCT p.priority_key, p.priority_name
               FROM dim_priority p
               ${joins.join("\n               ")}
               WHERE ${conditions.join("\n                 AND ")}
               ORDER BY p.priority_name`;
  return db.prepare(sql).all(...params) as Array<{
    priority_key: number;
    priority_name: string;
  }>;
}

// =====================================================================
// Per-GHA applicable arrays — derived from selections + dim_disease.
// =====================================================================

// Resolve which disease column + value list to use for the applicable-
// diseases query. Returns null when no disease filter is active.
function resolveApplicableDiseaseSelection(
  filters: ResolvedFilters,
): { column: string; values: string[]; useOrClause?: boolean } | null {
  if (filters.secondary_disease_names && filters.secondary_disease_names.length > 0) {
    return { column: "d.secondary_disease_name", values: filters.secondary_disease_names };
  }
  if (filters.primary_disease_names && filters.primary_disease_names.length > 0) {
    // Primary diseases may match via disease_filter OR disease_name (some
    // priority-side rows have NULL/empty disease_filter).
    return { column: "d.disease_filter", values: filters.primary_disease_names, useOrClause: true };
  }
  // GHA-only selection intentionally returns null here (→ empty arrays).
  // The title pill on a GHA card only appears when a Disease or Product
  // filter is active; GHA filtering alone keeps the plain `<GHA name>`
  // title per the spec's filter-mode rules.
  return null;
}

// Group disease-name rows into a per-GHA record, deduplicating and sorting.
function groupRowsByGha(
  rows: Array<{ name: string; global_health_area: string }>,
  seed: Record<string, string[]>,
): Record<string, string[]> {
  const result: Record<string, string[]> = { ...seed };
  // Initialise any GHA key that isn't already present in the seed so that
  // the push below never needs to check for undefined — keeps this O(n)
  // rather than the O(n²) spread-concatenation pattern it replaced.
  for (const row of rows) {
    if (!result[row.global_health_area]) result[row.global_health_area] = [];
    result[row.global_health_area].push(row.name);
  }
  return Object.fromEntries(
    Object.entries(result).map(([gha, names]) => [gha, Array.from(new Set(names)).sort()]),
  );
}

function computeApplicableDiseases(
  db: ReturnType<typeof getDatabase>,
  filters: ResolvedFilters,
): Record<string, string[]> {
  const empty: Record<string, string[]> = Object.fromEntries(FIXED_GHA_ORDER.map((g) => [g, []]));

  // Spec rule: secondaries take precedence over primaries; no selection → empty.
  const sel = resolveApplicableDiseaseSelection(filters);
  if (!sel) return empty;

  const placeholders = sel.values.map(() => "?").join(", ");
  let whereClause: string;
  let params: string[];
  if (sel.useOrClause) {
    // Match on disease_filter OR disease_name for primary diseases.
    whereClause = `(d.disease_filter IN (${placeholders}) OR TRIM(d.disease_name) IN (${placeholders}))`;
    params = [...sel.values, ...sel.values];
  } else {
    whereClause = `${sel.column} IN (${placeholders})`;
    params = [...sel.values];
  }
  // When using the OR clause, return disease_name as the display label
  // (disease_filter may be NULL/empty for some rows).
  const nameExpr = sel.useOrClause ? "TRIM(d.disease_name)" : sel.column;
  const sql = `SELECT DISTINCT ${nameExpr} AS name, d.global_health_area
               FROM dim_disease d
               WHERE ${whereClause}
                 AND d.global_health_area IS NOT NULL`;
  const rows = db.prepare(sql).all(...params) as Array<{
    name: string;
    global_health_area: string;
  }>;

  return groupRowsByGha(rows, empty);
}

function computeApplicableProductNames(
  filters: ResolvedFilters,
  productTypeByGha: Map<string, Map<string, number>>,
): Record<string, string[]> {
  const empty: Record<string, string[]> = {};
  for (const gha of FIXED_GHA_ORDER) empty[gha] = [];
  if (!filters.product_names || filters.product_names.length === 0) return empty;

  const selection = new Set(filters.product_names);
  const result: Record<string, string[]> = { ...empty };
  for (const gha of FIXED_GHA_ORDER) {
    const bucket = productTypeByGha.get(gha);
    if (!bucket) continue;
    const applicable: string[] = [];
    for (const [productName, count] of bucket.entries()) {
      if (count > 0 && selection.has(productName)) applicable.push(productName);
    }
    result[gha] = applicable.sort();
  }
  return result;
}
