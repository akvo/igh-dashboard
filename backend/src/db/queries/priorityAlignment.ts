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

const NON_EMPTY_PRIORITY = "p.priority_name IS NOT NULL AND TRIM(p.priority_name) != ''";

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
  };

  // ---------------------------------------------------------------------
  // 1. totalPriorities — single scalar.
  //
  // Uses the same conditional-join pattern as womenOrChildrenShare and
  // runPriorities: dim_disease is joined only when a GHA/disease filter
  // is active, and the pipeline bridge tables are joined only when a
  // product filter is active. The unfiltered case is a bare COUNT(DISTINCT)
  // on dim_priority so that priorities with a NULL disease_key (e.g. key 5
  // "Test_TO") are correctly included, keeping totalPriorities at 66.
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
}

// Returns true when at least one disease-side filter axis is active.
// Extracted to a named helper so it counts as one complexity unit in
// callers rather than three (one per `||` branch).
function hasAnyDiseaseFilter(filters: ResolvedFilters): boolean {
  return (
    (filters.global_health_areas?.length ?? 0) > 0 ||
    (filters.primary_disease_names?.length ?? 0) > 0 ||
    (filters.secondary_disease_names?.length ?? 0) > 0
  );
}

// Append disease-side conditions (GHA + primary + secondary) to the
// provided mutable joins/conditions/params arrays.
function applyDiseaseFilters(
  filters: ResolvedFilters,
  joins: string[],
  conditions: string[],
  params: (string | number)[],
): void {
  joins.push("JOIN dim_disease d ON d.disease_key = p.disease_key");
  addArrayCondition(filters.global_health_areas, "d.global_health_area", conditions, params);
  addArrayCondition(filters.primary_disease_names, "d.disease_filter", conditions, params);
  addArrayCondition(
    filters.secondary_disease_names,
    "d.secondary_disease_name",
    conditions,
    params,
  );
}

// Append product-side conditions via the candidate bridge to the
// provided mutable joins/conditions/params arrays.
function applyProductFilters(
  filters: ResolvedFilters,
  joins: string[],
  conditions: string[],
  params: (string | number)[],
): void {
  joins.push("JOIN bridge_candidate_priority bp ON bp.priority_key = p.priority_key");
  joins.push("JOIN fact_pipeline_snapshot f ON f.candidate_key = bp.candidate_key");
  joins.push("JOIN dim_product pr ON pr.product_key = f.product_key");
  conditions.push("f.is_active_flag = 1");
  conditions.push(PIPELINE_FILTER);
  addArrayCondition(filters.product_names, "pr.product_name", conditions, params);
}

// Count distinct non-stub priorities, mirroring the conditional-join pattern
// used by `runWomenOrChildrenShare` and `runPriorities`. The dim_disease join
// is added only when a disease-side or GHA filter is active; without it, the
// query is a plain COUNT(DISTINCT) on dim_priority, which correctly includes
// priority key 5 ("Test_TO") whose disease_key is NULL. An unconditional join
// would silently exclude that row and shift the unfiltered total from 66 → 65.
function runTotalPriorities(
  db: ReturnType<typeof getDatabase>,
  filters: ResolvedFilters,
): { total: number } {
  const needsDisease = hasAnyDiseaseFilter(filters);
  const needsProduct = (filters.product_names?.length ?? 0) > 0;

  const joins: string[] = [];
  const conditions = [NON_EMPTY_PRIORITY];
  const params: (string | number)[] = [];

  if (needsDisease) applyDiseaseFilters(filters, joins, conditions, params);
  if (needsProduct) applyProductFilters(filters, joins, conditions, params);

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
  const conditions = [
    "f.is_active_flag = 1",
    PIPELINE_FILTER,
    NON_EMPTY_PRIORITY,
    "pr.product_name IS NOT NULL",
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
  addArrayCondition(filters.product_names, "pr.product_name", conditions, params);

  // Group by GHA + product_name so we can both project the flat donut
  // shape and compute applicableProductNames per GHA in post-processing.
  const sql = `SELECT
                 d.global_health_area,
                 pr.product_name,
                 COUNT(DISTINCT f.candidate_key) AS candidateCount
               FROM fact_pipeline_snapshot f
               ${joins.join("\n               ")}
               WHERE ${conditions.join("\n                 AND ")}
               GROUP BY d.global_health_area, pr.product_name`;
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

const WC_SQL_SIMPLE = (joins: string[], conditions: string[]) =>
  `SELECT
     SUM(CASE WHEN p.dedicated_to_women_or_children = 'Yes' THEN 1 ELSE 0 END) AS yes,
     SUM(CASE WHEN p.dedicated_to_women_or_children = 'No' THEN 1 ELSE 0 END) AS no,
     SUM(CASE WHEN p.dedicated_to_women_or_children IS NULL
                OR p.dedicated_to_women_or_children NOT IN ('Yes','No') THEN 1 ELSE 0 END) AS unknown
   FROM dim_priority p
   ${joins.join("\n   ")}
   WHERE ${conditions.join("\n     AND ")}`;

function runWomenOrChildrenShare(
  db: ReturnType<typeof getDatabase>,
  filters: ResolvedFilters,
): PriorityAlignmentWomenChildrenShare {
  const needsDisease = hasAnyDiseaseFilter(filters);
  const needsProduct = (filters.product_names?.length ?? 0) > 0;

  const joins: string[] = [];
  const conditions = [NON_EMPTY_PRIORITY];
  const params: (string | number)[] = [];

  if (needsDisease) applyDiseaseFilters(filters, joins, conditions, params);
  if (needsProduct) applyProductFilters(filters, joins, conditions, params);

  // Use COUNT(DISTINCT) only when the product join is active, because the
  // bridge_candidate_priority → fact_pipeline_snapshot → dim_product chain
  // can produce multiple rows per priority (one per matching candidate).
  // The dim_disease join added by applyDiseaseFilters does NOT fan out —
  // dim_priority has exactly one disease_key per row (a 1:1 relationship
  // through to dim_disease), so a plain SUM is safe there and avoids the
  // overhead of deduplication.
  const sql = needsProduct ? WC_SQL_FANOUT(joins, conditions) : WC_SQL_SIMPLE(joins, conditions);

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
  const needsDisease = hasAnyDiseaseFilter(filters);
  const needsProduct = (filters.product_names?.length ?? 0) > 0;

  const joins: string[] = [];
  const conditions = [NON_EMPTY_PRIORITY];
  const params: (string | number)[] = [];

  if (needsDisease) applyDiseaseFilters(filters, joins, conditions, params);
  if (needsProduct) applyProductFilters(filters, joins, conditions, params);

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
): { column: string; values: string[] } | null {
  if (filters.secondary_disease_names && filters.secondary_disease_names.length > 0) {
    return { column: "d.secondary_disease_name", values: filters.secondary_disease_names };
  }
  if (filters.primary_disease_names && filters.primary_disease_names.length > 0) {
    return { column: "d.disease_filter", values: filters.primary_disease_names };
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

  const sql = `SELECT DISTINCT ${sel.column} AS name, d.global_health_area
               FROM dim_disease d
               WHERE ${sel.column} IN (${sel.values.map(() => "?").join(", ")})
                 AND d.global_health_area IS NOT NULL`;
  const rows = db.prepare(sql).all(...sel.values) as Array<{
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
