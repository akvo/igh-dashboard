import { getDatabase } from "../connection.js";
import { PIPELINE_FILTER } from "./filterUtils.js";

// =========================================================
// Shared constants
// =========================================================

// Keywords used to classify priorities as "dedicated to women or children"
// from dim_priority.target_population. Any case-insensitive substring hit
// puts the priority in the Yes bucket. Kept as an exported constant so the
// rule is reviewable in one place.
//
// Note: `pregnan` matches pregnant/pregnancy, `paediatric`/`pediatric` cover
// both spellings, and we deliberately keep `girl`/`boy` short (they match
// "girls"/"boys"/"boyhood" etc. by substring, which is fine here).
export const WOMEN_CHILDREN_KEYWORDS = [
  "women",
  "woman",
  "maternal",
  "pregnan",
  "postpartum",
  "child",
  "paediatric",
  "pediatric",
  "infant",
  "neonatal",
  "adolescent",
  "girl",
  "boy",
  "youth",
  "young people",
];

// Priorities with a blank/stub priority_name are treated as NA ("present but
// unclassifiable") rather than Yes. Wrapped in a tiny helper so the same
// predicate is used everywhere.
const NON_EMPTY_PRIORITY = "p.priority_name IS NOT NULL AND TRIM(p.priority_name) != ''";

// Build the "is dedicated to women or children" SQL expression. Exposed as
// a function so the keyword list only exists in JS — callers pass it through
// as bind parameters, keeping SQL free of injected strings.
function womenChildrenExpression(paramsSink: (string | number)[]): string {
  const likeClauses = WOMEN_CHILDREN_KEYWORDS.map(() => "LOWER(p.target_population) LIKE ?").join(
    " OR ",
  );
  for (const kw of WOMEN_CHILDREN_KEYWORDS) {
    paramsSink.push(`%${kw.toLowerCase()}%`);
  }
  return `(d.global_health_area = 'Womens Health' OR (${likeClauses}))`;
}

// =========================================================
// Overview — drives the three cards in "Priorities overview"
// =========================================================

export interface WhoPriorityAreaShare {
  global_health_area: string;
  diseasesWithPriority: number;
  diseasesWithNaPriority: number;
  diseasesWithoutPriority: number;
  totalDiseases: number;
  sharePercentage: number;
}

export interface WhoPriorityWomenChildrenShare {
  yes: number;
  na: number;
  no: number;
  total: number;
}

export interface WhoPriorityOverview {
  totalPriorities: number;
  diseasesWithPriorityByArea: WhoPriorityAreaShare[];
  womenOrChildrenShare: WhoPriorityWomenChildrenShare;
}

/**
 * Aggregate stats for the "Priorities overview" section of the page.
 *
 * We intentionally run three small queries instead of a single megaquery:
 * the shapes are different (scalar, per-area rows, category counts) and
 * keeping them separate makes the logic for each bucket easy to read and
 * test. `dim_priority` has ~66 rows today so cost is negligible.
 */
// eslint-disable-next-line max-lines-per-function -- three small grouped queries; splitting would hide the shared NA semantics.
export function getWhoPriorityOverview(): WhoPriorityOverview {
  const db = getDatabase();

  // Total priorities — excludes stub rows (empty priority_name) so the
  // "164" card only counts real published priorities.
  const totalRow = db
    .prepare(`SELECT COUNT(*) AS total FROM dim_priority p WHERE ${NON_EMPTY_PRIORITY}`)
    .get() as { total: number };

  // Share of diseases with priority — one row per global_health_area.
  // Each disease is classified into exactly one of Yes/NA/No:
  //   Yes → at least one real priority (non-empty name)
  //   NA  → only stub priority rows exist for this disease
  //   No  → no priority row at all
  const areaRows = db
    .prepare(
      `
    SELECT
      d.global_health_area,
      SUM(CASE WHEN has_real > 0 THEN 1 ELSE 0 END) AS diseasesWithPriority,
      SUM(CASE WHEN has_real = 0 AND has_any > 0 THEN 1 ELSE 0 END) AS diseasesWithNaPriority,
      SUM(CASE WHEN has_any = 0 THEN 1 ELSE 0 END) AS diseasesWithoutPriority,
      COUNT(*) AS totalDiseases
    FROM (
      SELECT
        d.disease_key,
        d.global_health_area,
        COUNT(p.priority_key) AS has_any,
        SUM(CASE WHEN ${NON_EMPTY_PRIORITY} THEN 1 ELSE 0 END) AS has_real
      FROM dim_disease d
      LEFT JOIN dim_priority p ON p.disease_key = d.disease_key
      WHERE d.global_health_area IS NOT NULL
      GROUP BY d.disease_key, d.global_health_area
    ) d
    GROUP BY d.global_health_area
    ORDER BY d.global_health_area
  `,
    )
    .all() as Array<{
    global_health_area: string;
    diseasesWithPriority: number;
    diseasesWithNaPriority: number;
    diseasesWithoutPriority: number;
    totalDiseases: number;
  }>;

  const diseasesWithPriorityByArea: WhoPriorityAreaShare[] = areaRows.map((r) => ({
    ...r,
    sharePercentage: r.totalDiseases > 0 ? r.diseasesWithPriority / r.totalDiseases : 0,
  }));

  // Share of priorities dedicated to women or children — donut chart.
  // Only counts real (non-stub) priorities; target_population = null/empty
  // and no Women's Health disease link → NA.
  const womenParams: (string | number)[] = [];
  const wcExpr = womenChildrenExpression(womenParams);
  const womenRow = db
    .prepare(
      `
    SELECT
      SUM(CASE WHEN ${wcExpr} THEN 1 ELSE 0 END) AS yes,
      SUM(CASE
            WHEN ${wcExpr} THEN 0
            WHEN p.target_population IS NULL OR TRIM(p.target_population) = '' THEN 1
            ELSE 0
          END) AS na,
      SUM(CASE
            WHEN ${wcExpr} THEN 0
            WHEN p.target_population IS NULL OR TRIM(p.target_population) = '' THEN 0
            ELSE 1
          END) AS no,
      COUNT(*) AS total
    FROM dim_priority p
    LEFT JOIN dim_disease d ON p.disease_key = d.disease_key
    WHERE ${NON_EMPTY_PRIORITY}
  `,
    )
    // Three CASEs use the same women/children expression, so the same bind
    // list is pushed three times.
    .get(...womenParams, ...womenParams, ...womenParams) as WhoPriorityWomenChildrenShare;

  return {
    totalPriorities: totalRow.total,
    diseasesWithPriorityByArea,
    womenOrChildrenShare: womenRow,
  };
}

// =========================================================
// Detail — the three info cards for a single selected priority
// =========================================================

export interface WhoPriorityDetail {
  priority_key: number;
  rdpriorityid: string | null;
  priority_name: string | null;
  indication: string | null;
  intended_use: string | null;
  target_population: string | null;
  disease_key: number | null;
  disease_name: string | null;
  global_health_area: string | null;
  product_key: number | null;
  product_name: string | null;
}

/**
 * One-row detail payload for the "Individual priority analysis" cards.
 * Returns null when the key doesn't resolve — resolver turns that into a
 * GraphQL null without erroring.
 */
export function getWhoPriorityDetail(priority_key: number): WhoPriorityDetail | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `
    SELECT
      p.priority_key,
      p.rdpriorityid,
      p.priority_name,
      p.indication,
      p.intended_use,
      p.target_population,
      p.disease_key,
      d.disease_group_name AS disease_name,
      d.global_health_area,
      p.product_key,
      pr.product_name
    FROM dim_priority p
    LEFT JOIN dim_disease d ON p.disease_key = d.disease_key
    LEFT JOIN dim_product pr ON p.product_key = pr.product_key
    WHERE p.priority_key = ?
  `,
    )
    .get(priority_key) as WhoPriorityDetail | undefined;

  return row ?? null;
}

// =========================================================
// Pipeline chart — product × phase breakdown for a priority
// =========================================================

export interface WhoPriorityPipelineRow {
  product_name: string;
  phase_name: string;
  sort_order: number;
  candidateCount: number;
}

export interface WhoPriorityPipelineFilters {
  priority_key?: number;
  disease_key?: number;
  product_key?: number;
}

/**
 * Horizontal stacked bar — candidates grouped by product × phase for the
 * selected priority (or disease/product if only those are set).
 *
 * Mirrors the shape of `productPhaseDistribution` on purpose: same filters
 * on fact_pipeline_snapshot (`is_active_flag = 1`, `include_in_pipeline = 1`),
 * same DISTINCT candidate_key count, same raw `phase_name` + `sort_order`
 * output. That keeps legend values aligned with the Global pipeline overview
 * and Cross-pipeline analytics trend so frontend label rewriting is reusable.
 */
export function getWhoPriorityPipeline(
  filters?: WhoPriorityPipelineFilters,
): WhoPriorityPipelineRow[] {
  const db = getDatabase();

  const joins = [
    "JOIN dim_product pr ON f.product_key = pr.product_key",
    "JOIN dim_phase p ON f.phase_key = p.phase_key",
  ];
  const conditions = [
    "f.is_active_flag = 1",
    PIPELINE_FILTER,
    "pr.product_name IS NOT NULL",
    "p.phase_name IS NOT NULL",
  ];
  const params: (string | number)[] = [];

  if (filters?.priority_key !== undefined) {
    joins.push("JOIN bridge_candidate_priority bcp ON bcp.candidate_key = f.candidate_key");
    conditions.push("bcp.priority_key = ?");
    params.push(filters.priority_key);
  }

  if (filters?.disease_key !== undefined) {
    conditions.push("f.disease_key = ?");
    params.push(filters.disease_key);
  }

  if (filters?.product_key !== undefined) {
    conditions.push("f.product_key = ?");
    params.push(filters.product_key);
  }

  const sql = `
    SELECT
      pr.product_name,
      p.phase_name,
      p.sort_order,
      COUNT(DISTINCT f.candidate_key) AS candidateCount
    FROM fact_pipeline_snapshot f
    ${joins.join("\n    ")}
    WHERE ${conditions.join("\n      AND ")}
    GROUP BY pr.product_name, p.phase_name, p.sort_order
    ORDER BY pr.product_name, p.sort_order
  `;

  return db.prepare(sql).all(...params) as WhoPriorityPipelineRow[];
}

// =========================================================
// Cascading filter options — WHO Priority / Disease / Product
// =========================================================

export interface WhoPriorityOption {
  priority_key: number;
  priority_name: string;
}

export interface WhoPriorityDiseaseOption {
  disease_key: number;
  disease_name: string;
}

export interface WhoPriorityProductOption {
  product_key: number;
  product_name: string;
}

export interface WhoPriorityFilterOptions {
  priorities: WhoPriorityOption[];
  diseases: WhoPriorityDiseaseOption[];
  products: WhoPriorityProductOption[];
}

export interface WhoPriorityFilterArgs {
  priority_key?: number;
  disease_key?: number;
  product_key?: number;
}

/**
 * Backs the three cascading dropdowns. Each list answers "what values are
 * compatible with the currently-selected filters?" — so selecting one
 * narrows the other two.
 *
 * Every list is restricted to priorities with a non-empty name; stub rows
 * stay out of the dropdowns so users can't pick them and land on an empty
 * detail view.
 */
export function getWhoPriorityFilterOptions(
  args?: WhoPriorityFilterArgs,
): WhoPriorityFilterOptions {
  const db = getDatabase();

  // Build a WHERE fragment shared by all three lookups. We re-issue the
  // same conditions per query rather than precomputing a CTE — the data
  // set is small and this keeps each query understandable in isolation.
  const buildConditions = (exclude: "priority" | "disease" | "product" | null) => {
    const conds = [NON_EMPTY_PRIORITY];
    const params: (string | number)[] = [];
    if (args?.priority_key !== undefined && exclude !== "priority") {
      conds.push("p.priority_key = ?");
      params.push(args.priority_key);
    }
    if (args?.disease_key !== undefined && exclude !== "disease") {
      conds.push("p.disease_key = ?");
      params.push(args.disease_key);
    }
    if (args?.product_key !== undefined && exclude !== "product") {
      conds.push("p.product_key = ?");
      params.push(args.product_key);
    }
    return { where: conds.join(" AND "), params };
  };

  // Priority dropdown: every distinct priority compatible with the disease
  // and/or product filter. When no selection, returns all real priorities.
  const priorityC = buildConditions("priority");
  const priorities = db
    .prepare(
      `
    SELECT DISTINCT p.priority_key, p.priority_name
    FROM dim_priority p
    WHERE ${priorityC.where}
    ORDER BY p.priority_name
  `,
    )
    .all(...priorityC.params) as WhoPriorityOption[];

  // Disease dropdown: diseases that appear on at least one compatible
  // priority. Join dim_disease so the user sees the disease_group_name
  // they expect in the dropdown.
  const diseaseC = buildConditions("disease");
  const diseases = db
    .prepare(
      `
    SELECT DISTINCT d.disease_key, d.disease_group_name AS disease_name
    FROM dim_priority p
    JOIN dim_disease d ON p.disease_key = d.disease_key
    WHERE ${diseaseC.where}
      AND d.disease_group_name IS NOT NULL
    ORDER BY d.disease_group_name
  `,
    )
    .all(...diseaseC.params) as WhoPriorityDiseaseOption[];

  // Product dropdown: products that appear on at least one compatible
  // priority.
  const productC = buildConditions("product");
  const products = db
    .prepare(
      `
    SELECT DISTINCT pr.product_key, pr.product_name
    FROM dim_priority p
    JOIN dim_product pr ON p.product_key = pr.product_key
    WHERE ${productC.where}
      AND pr.product_name IS NOT NULL
    ORDER BY pr.product_name
  `,
    )
    .all(...productC.params) as WhoPriorityProductOption[];

  return { priorities, diseases, products };
}
