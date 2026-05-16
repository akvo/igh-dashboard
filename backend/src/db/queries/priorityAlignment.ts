import { getDatabase } from "../connection.js";
import { PIPELINE_FILTER } from "./filterUtils.js";
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
// `byArea` must always return these three GHAs in this exact order so the
// frontend can index positionally. The resolver pads missing rows with
// zeros after the SQL.

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
// and diseaseOptions. A disease with only stub rows behaves as if it
// had no priority at all.

const NON_EMPTY_PRIORITY = "p.priority_name IS NOT NULL AND TRIM(p.priority_name) != ''";

// =========================================================
// Disease-keys filter helper
// =========================================================
// When the caller passes a non-empty array we append "AND <column> IN
// (?, ?, …)" and push the keys into the param list. Returns the SQL
// fragment so callers can interpolate it where they need it.

function diseaseKeysClause(
  diseaseKeys: number[] | null | undefined,
  column: string,
  params: (string | number)[],
): string {
  if (!diseaseKeys || diseaseKeys.length === 0) return "";
  params.push(...diseaseKeys);
  return ` AND ${column} IN (${diseaseKeys.map(() => "?").join(", ")})`;
}

/**
 * Single consolidated query for the Home page's WHO Priority Alignment section.
 *
 * Runs four small queries instead of one megaquery — the shapes are different
 * (scalar, per-area, per-product, lookup) and keeping them separate makes each
 * rule easy to read and test. With ~66 priorities the cost is negligible.
 *
 * Filtering: when `diseaseKeys` is non-empty, all four sub-queries narrow to
 * priorities/diseases in that set, EXCEPT `diseaseOptions`, which always
 * returns every priority-bearing disease so the dropdown isn't self-trimming.
 *
 * Stub priorities (priority_name null/empty) are excluded everywhere.
 */
export function getPriorityAlignmentOverview(
  input: PriorityAlignmentInput,
): PriorityAlignmentOverview {
  const db = getDatabase();
  const diseaseKeys = input.diseaseKeys ?? null;

  // -----------------------------------------------------------------------
  // 1. totalPriorities — single scalar
  // -----------------------------------------------------------------------
  const totalParams: (string | number)[] = [];
  const totalClause = diseaseKeysClause(diseaseKeys, "p.disease_key", totalParams);
  const totalRow = db
    .prepare(
      `SELECT COUNT(*) AS total
       FROM dim_priority p
       WHERE ${NON_EMPTY_PRIORITY}${totalClause}`,
    )
    .get(...totalParams) as { total: number };

  // -----------------------------------------------------------------------
  // 2. byArea — per-GHA candidate-level alignment, padded to fixed order
  //
  // Counts active-pipeline candidates whose disease falls under each of
  // the three WHO global health areas (ND / EID / WH). The numerator is
  // the subset of those candidates that have at least one bridge row to
  // a non-stub priority. We have to check `p.priority_name` after the
  // dim_priority join rather than `bp.priority_key IS NOT NULL` —
  // candidates mapped exclusively to stub priorities would otherwise be
  // counted.
  //
  // `LEFT JOIN bridge_candidate_priority` keeps candidates with no
  // priority mapping in the denominator (an INNER join would silently
  // collapse denominator into numerator).
  //
  // When `diseaseKeys` narrows the filter, both numerator and denominator
  // restrict to candidates whose disease is in the selected set —
  // matching the existing UX where GHAs outside the selection drop to
  // 0/0 and the frontend renders `—`.
  //
  // `COUNT(DISTINCT f.candidate_key)` — rather than COUNT(*) — is needed
  // on both the denominator and numerator because the two LEFT JOINs fan
  // out: a candidate mapped to N priorities produces N output rows per
  // snapshot row. DISTINCT collapses them back to one row per candidate.
  // -----------------------------------------------------------------------
  const areaParams: (string | number)[] = [];
  const areaDiseaseClause = diseaseKeysClause(diseaseKeys, "d.disease_key", areaParams);
  const areaRows = db
    .prepare(
      `SELECT
         d.global_health_area,
         COUNT(DISTINCT f.candidate_key) AS totalCandidates,
         COUNT(DISTINCT CASE
                          WHEN ${NON_EMPTY_PRIORITY}
                          THEN f.candidate_key
                        END) AS candidatesWithPriority
       FROM fact_pipeline_snapshot f
       JOIN dim_disease d ON d.disease_key = f.disease_key
       LEFT JOIN bridge_candidate_priority bp ON bp.candidate_key = f.candidate_key
       LEFT JOIN dim_priority p              ON p.priority_key   = bp.priority_key
       WHERE f.is_active_flag = 1
         AND ${PIPELINE_FILTER}
         AND d.global_health_area IN ('Neglected disease','Emerging infectious disease','Womens Health')${areaDiseaseClause}
       GROUP BY d.global_health_area`,
    )
    .all(...areaParams) as Array<{
    global_health_area: string;
    candidatesWithPriority: number;
    totalCandidates: number;
  }>;

  const areaMap = new Map(areaRows.map((r) => [r.global_health_area, r]));
  const byArea: PriorityAlignmentAreaShare[] = FIXED_GHA_ORDER.map((gha) => {
    const row = areaMap.get(gha) ?? {
      global_health_area: gha,
      candidatesWithPriority: 0,
      totalCandidates: 0,
    };
    return {
      ...row,
      sharePercentage:
        row.totalCandidates > 0 ? row.candidatesWithPriority / row.totalCandidates : 0,
    };
  });

  // -----------------------------------------------------------------------
  // 3. productTypeBreakdown — candidates linked to a published priority
  //    via bridge_candidate_priority, grouped by dim_product.product_name.
  //
  // Applies the dashboard's canonical pipeline guard pair —
  // `is_active_flag = 1` AND `include_in_pipeline = 1` — to match what
  // every other "pipeline candidates by product type" query in the
  // backend (e.g. productDistribution) reports. Without
  // `include_in_pipeline = 1` the donut here would over-count by ~45%
  // compared with the rest of the dashboard.
  // -----------------------------------------------------------------------
  const productParams: (string | number)[] = [];
  const productClause = diseaseKeysClause(diseaseKeys, "p.disease_key", productParams);
  const productTypeBreakdown = db
    .prepare(
      `SELECT
         pr.product_name,
         COUNT(DISTINCT f.candidate_key) AS candidateCount
       FROM fact_pipeline_snapshot f
       JOIN bridge_candidate_priority bp ON bp.candidate_key = f.candidate_key
       JOIN dim_priority p              ON p.priority_key   = bp.priority_key
       JOIN dim_product pr              ON pr.product_key   = f.product_key
       WHERE f.is_active_flag = 1
         AND f.include_in_pipeline = 1
         AND ${NON_EMPTY_PRIORITY}
         AND pr.product_name IS NOT NULL${productClause}
       GROUP BY pr.product_name
       ORDER BY candidateCount DESC`,
    )
    .all(...productParams) as PriorityAlignmentProductType[];

  // -----------------------------------------------------------------------
  // 4. diseaseOptions — priority-bearing diseases, NEVER narrowed by the
  //    diseaseKeys filter (so the dropdown isn't self-trimming).
  //
  // Uses `disease_name` (the canonical full name) rather than
  // `disease_filter` — the latter is only populated for two rows in the
  // gold DB (the Mpox split) and is intended as a coarse grouping for
  // filter dropdowns elsewhere, not as a label column.
  //
  // `global_health_area` is allowed to be NULL: 7 of the 19
  // priority-bearing diseases (e.g. HIV/AIDS, Tuberculosis, Scabies)
  // are not categorised into the three WHO areas in dim_disease.
  // -----------------------------------------------------------------------
  const diseaseOptions = db
    .prepare(
      `SELECT DISTINCT
         d.disease_key,
         d.disease_name,
         d.global_health_area
       FROM dim_disease d
       INNER JOIN dim_priority p ON p.disease_key = d.disease_key
       WHERE ${NON_EMPTY_PRIORITY}
         AND d.disease_name IS NOT NULL
         AND TRIM(d.disease_name) != ''
       ORDER BY d.disease_name`,
    )
    .all() as PriorityAlignmentDiseaseOption[];

  // -----------------------------------------------------------------------
  // 5. womenOrChildrenShare — Yes/No/unknown bucket counts for the
  //    "Share of priorities dedicated to women or children" donut.
  //
  // `dedicated_to_women_or_children` lands in dim_priority as the
  // Two-Options label ("Yes" / "No") — projected via OPTIONSET in the
  // silver→gold ETL. Anything else (null, blank, unexpected) collapses
  // into `unknown` so we don't silently drop priorities the field hasn't
  // been classified on yet.
  //
  // Honors the section-wide `diseaseKeys` filter; stub priorities are
  // excluded via the shared NON_EMPTY_PRIORITY predicate.
  // -----------------------------------------------------------------------
  const wcParams: (string | number)[] = [];
  const wcClause = diseaseKeysClause(diseaseKeys, "p.disease_key", wcParams);
  const wcRow = db
    .prepare(
      `SELECT
         SUM(CASE WHEN p.dedicated_to_women_or_children = 'Yes' THEN 1 ELSE 0 END) AS yes,
         SUM(CASE WHEN p.dedicated_to_women_or_children = 'No'  THEN 1 ELSE 0 END) AS no,
         SUM(CASE WHEN p.dedicated_to_women_or_children IS NULL
                    OR p.dedicated_to_women_or_children NOT IN ('Yes','No')
                  THEN 1 ELSE 0 END) AS unknown
       FROM dim_priority p
       WHERE ${NON_EMPTY_PRIORITY}${wcClause}`,
    )
    .get(...wcParams) as {
    yes: number | null;
    no: number | null;
    unknown: number | null;
  };

  const womenOrChildrenShare: PriorityAlignmentWomenChildrenShare = {
    yes: wcRow.yes ?? 0,
    no: wcRow.no ?? 0,
    unknown: wcRow.unknown ?? 0,
  };

  return {
    totalPriorities: totalRow.total,
    byArea,
    productTypeBreakdown,
    diseaseOptions,
    womenOrChildrenShare,
  };
}
