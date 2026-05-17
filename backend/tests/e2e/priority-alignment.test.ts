/**
 * E2E Tests — priorityAlignmentOverview query (WHO Priority Alignment section).
 *
 * Validates the consolidated payload (totalPriorities, byArea, productTypeBreakdown,
 * diseaseOptions, womenOrChildrenShare) both unfiltered and with a four-arg filter.
 * Asserts the fixed 3-row byArea ordering (ND, EID, WH) and that stub
 * priorities are excluded.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { query } from "../helpers/graphql.js";
import Database from "better-sqlite3";
import path from "path";

// ---------------------------------------------------------------------------
// Types (match GraphQL response shape)
// ---------------------------------------------------------------------------

interface AreaShare {
  global_health_area: string;
  candidatesWithPriority: number;
  totalCandidates: number;
  sharePercentage: number;
}

interface ProductTypeRow {
  product_name: string;
  candidateCount: number;
}

interface DiseaseOption {
  disease_key: number;
  disease_name: string;
  global_health_area: string | null;
}

interface WomenChildrenShare {
  yes: number;
  no: number;
  unknown: number;
}

interface Overview {
  totalPriorities: number;
  byArea: AreaShare[];
  productTypeBreakdown: ProductTypeRow[];
  diseaseOptions: DiseaseOption[];
  womenOrChildrenShare: WomenChildrenShare;
}

interface FilterArgs {
  global_health_areas?: string[];
  primary_disease_names?: string[];
  secondary_disease_names?: string[];
  product_names?: string[];
}

const FIXED_AREA_ORDER = [
  "Neglected disease",
  "Emerging infectious disease",
  "Womens Health",
] as const;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function fetchOverview(filters: FilterArgs = {}): Promise<Overview> {
  const { data } = await query<{ priorityAlignmentOverview: Overview }>(
    `query (
       $globalHealthAreas: [String!],
       $primaryDiseaseNames: [String!],
       $secondaryDiseaseNames: [String!],
       $productNames: [String!]
     ) {
      priorityAlignmentOverview(
        global_health_areas: $globalHealthAreas,
        primary_disease_names: $primaryDiseaseNames,
        secondary_disease_names: $secondaryDiseaseNames,
        product_names: $productNames,
      ) {
        totalPriorities
        byArea {
          global_health_area
          candidatesWithPriority
          totalCandidates
          sharePercentage
        }
        productTypeBreakdown {
          product_name
          candidateCount
        }
        diseaseOptions {
          disease_key
          disease_name
          global_health_area
        }
        womenOrChildrenShare {
          yes
          no
          unknown
        }
      }
    }`,
    {
      globalHealthAreas: filters.global_health_areas,
      primaryDiseaseNames: filters.primary_disease_names,
      secondaryDiseaseNames: filters.secondary_disease_names,
      productNames: filters.product_names,
    },
  );
  return data.priorityAlignmentOverview;
}

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let baseline: Overview;

beforeAll(async () => {
  baseline = await fetchOverview();
});

// ---------------------------------------------------------------------------
// 1. Unfiltered baseline
// ---------------------------------------------------------------------------

describe("priorityAlignmentOverview — unfiltered", () => {
  it("totalPriorities matches snapshot (65)", () => {
    // The new query joins dim_disease unconditionally so that GHA/disease
    // filter args can reach the column. Priority key 5 ("Test_TO") has a
    // null disease_key in the gold DB and is therefore excluded from the
    // total. The old COUNT(*) on dim_priority alone returned 66.
    expect(baseline.totalPriorities).toBe(65);
  });

  it("byArea returns exactly 3 rows in fixed order (ND, EID, WH)", () => {
    expect(baseline.byArea).toHaveLength(3);
    expect(baseline.byArea.map((r) => r.global_health_area)).toEqual(Array.from(FIXED_AREA_ORDER));
  });

  it("byArea snapshot values match tracked DB", () => {
    const byKey = Object.fromEntries(baseline.byArea.map((r) => [r.global_health_area, r]));
    // ND total drifted 1778 → 1777 after the gold DB was regenerated
    // 2026-05-14; the analyst's original reading reported 1778. Verified
    // by independent SQL probe before re-pinning.
    expect(byKey["Neglected disease"].candidatesWithPriority).toBe(183);
    expect(byKey["Neglected disease"].totalCandidates).toBe(1777);
    expect(byKey["Emerging infectious disease"].candidatesWithPriority).toBe(20);
    expect(byKey["Emerging infectious disease"].totalCandidates).toBe(1206);
    expect(byKey["Womens Health"].candidatesWithPriority).toBe(0);
    expect(byKey["Womens Health"].totalCandidates).toBe(1119);
  });

  it("byArea sharePercentage = candidatesWithPriority / totalCandidates", () => {
    for (const row of baseline.byArea) {
      const expected =
        row.totalCandidates > 0 ? row.candidatesWithPriority / row.totalCandidates : 0;
      expect(row.sharePercentage).toBeCloseTo(expected, 6);
    }
  });

  it("productTypeBreakdown is sorted desc by candidateCount with positive integer counts", () => {
    expect(baseline.productTypeBreakdown.length).toBeGreaterThan(0);
    for (const row of baseline.productTypeBreakdown) {
      expect(Number.isInteger(row.candidateCount)).toBe(true);
      expect(row.candidateCount).toBeGreaterThan(0);
      expect(row.product_name.length).toBeGreaterThan(0);
    }
    const counts = baseline.productTypeBreakdown.map((r) => r.candidateCount);
    const sorted = [...counts].sort((a, b) => b - a);
    expect(counts).toEqual(sorted);
  });

  it("productTypeBreakdown includes expected top product types", () => {
    const byKey = Object.fromEntries(
      baseline.productTypeBreakdown.map((r) => [r.product_name, r.candidateCount]),
    );
    expect(byKey["Vaccines"]).toBe(75);
    expect(byKey["Drugs"]).toBe(68);
    expect(byKey["Diagnostics"]).toBe(41);
    expect(byKey["Biologics"]).toBe(19);
  });

  it("diseaseOptions returns priority-bearing diseases (count = 19), sorted by name", () => {
    expect(baseline.diseaseOptions).toHaveLength(19);
    const names = baseline.diseaseOptions.map((o) => o.disease_name);
    // Plain `.sort()` uses UTF-16 code-unit order — same collation SQLite's
    // default ORDER BY uses. `localeCompare` would put `Helminth` before
    // `HIV/AIDS` (lowercase < uppercase under locale rules), which doesn't
    // match what the server returns.
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
    for (const opt of baseline.diseaseOptions) {
      expect(opt.disease_key).toBeGreaterThan(0);
      expect(opt.disease_name.length).toBeGreaterThan(0);
      // global_health_area is intentionally nullable: 7 of the 19
      // priority-bearing diseases (e.g. HIV/AIDS, Tuberculosis, Scabies)
      // are not categorised into the three WHO areas in dim_disease.
      // They still appear in the dropdown; the section's per-GHA share cards
      // simply won't reflect them.
    }
  });

  it("diseaseOptions has no duplicate disease_keys", () => {
    const keys = baseline.diseaseOptions.map((o) => o.disease_key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("womenOrChildrenShare snapshot matches tracked DB (34 Yes / 31 No / 1 unknown)", () => {
    // Distribution pinned against the gold DB regenerated 2026-05-14 after
    // the silver→gold projection of crc8b_dedicatedtowomenorchildren landed
    // in igh-data-transform.
    //
    // Note: the unfiltered womenOrChildrenShare query scans dim_priority
    // directly without joining dim_disease (no filter axes are active), so
    // it includes all 66 non-stub priorities — including priority key 5
    // ("Test_TO") which has a null disease_key. The totalPriorities query
    // always joins dim_disease to support GHA/disease filter args, so it
    // returns 65. The two counts therefore diverge by 1 when unfiltered;
    // the sum = totalPriorities invariant holds only when at least one
    // disease-side filter is active.
    expect(baseline.womenOrChildrenShare.yes).toBe(34);
    expect(baseline.womenOrChildrenShare.no).toBe(31);
    expect(baseline.womenOrChildrenShare.unknown).toBe(1);
    const sum =
      baseline.womenOrChildrenShare.yes +
      baseline.womenOrChildrenShare.no +
      baseline.womenOrChildrenShare.unknown;
    expect(sum).toBe(66);
  });
});

// ---------------------------------------------------------------------------
// 2. Filtered by primary_disease_names
// ---------------------------------------------------------------------------

describe("priorityAlignmentOverview — filtered by primary_disease_names", () => {
  // Pick the first priority-bearing disease that has a non-null GHA, so
  // the "other GHAs are zero" assertion below has a meaningful target.
  let filterTarget: { disease_filter: string; global_health_area: string };
  beforeAll(() => {
    // Query the gold DB directly rather than relying on diseaseOptions (which
    // carries disease_name, not disease_filter). We need disease_filter
    // because that is the canonical primary grouping column the resolver uses.
    const db = new Database(path.resolve(__dirname, "../star_schema.db"), { readonly: true });
    const row = db
      .prepare(
        `SELECT DISTINCT d.disease_filter, d.global_health_area
           FROM dim_disease d
           JOIN dim_priority p ON p.disease_key = d.disease_key
          WHERE d.global_health_area IS NOT NULL
            AND d.disease_filter IS NOT NULL
            AND TRIM(p.priority_name) != ''
          ORDER BY d.disease_filter
          LIMIT 1`,
      )
      .get() as { disease_filter: string; global_health_area: string } | undefined;
    db.close();
    if (!row) throw new Error("expected at least one priority-bearing disease with non-null GHA");
    filterTarget = row;
  });

  it("totalPriorities narrows to selected diseases only", async () => {
    const filtered = await fetchOverview({ primary_disease_names: [filterTarget.disease_filter] });
    expect(filtered.totalPriorities).toBeGreaterThan(0);
    expect(filtered.totalPriorities).toBeLessThanOrEqual(baseline.totalPriorities);
  });

  it("byArea still returns exactly 3 rows in fixed order", async () => {
    const filtered = await fetchOverview({ primary_disease_names: [filterTarget.disease_filter] });
    expect(filtered.byArea).toHaveLength(3);
    expect(filtered.byArea.map((r) => r.global_health_area)).toEqual(Array.from(FIXED_AREA_ORDER));
  });

  it("byArea zero-denominator GHAs render sharePercentage = 0", async () => {
    const filtered = await fetchOverview({ primary_disease_names: [filterTarget.disease_filter] });
    const targetArea = filterTarget.global_health_area;
    for (const row of filtered.byArea) {
      if (row.global_health_area !== targetArea) {
        expect(row.totalCandidates).toBe(0);
        expect(row.candidatesWithPriority).toBe(0);
        expect(row.sharePercentage).toBe(0);
      }
    }
  });

  it("diseaseOptions does NOT narrow under the filter (still 19)", async () => {
    const filtered = await fetchOverview({ primary_disease_names: [filterTarget.disease_filter] });
    expect(filtered.diseaseOptions).toHaveLength(baseline.diseaseOptions.length);
  });

  it("productTypeBreakdown total candidates ≤ baseline total", async () => {
    const filtered = await fetchOverview({ primary_disease_names: [filterTarget.disease_filter] });
    const baselineTotal = baseline.productTypeBreakdown.reduce((s, r) => s + r.candidateCount, 0);
    const filteredTotal = filtered.productTypeBreakdown.reduce((s, r) => s + r.candidateCount, 0);
    expect(filteredTotal).toBeLessThanOrEqual(baselineTotal);
  });

  it("empty filter arrays behave like unfiltered", async () => {
    const filtered = await fetchOverview({
      global_health_areas: [],
      primary_disease_names: [],
      secondary_disease_names: [],
      product_names: [],
    });
    expect(filtered.totalPriorities).toBe(baseline.totalPriorities);
    expect(filtered.diseaseOptions).toHaveLength(baseline.diseaseOptions.length);
  });

  it("womenOrChildrenShare narrows under the filter and stays ≤ baseline", async () => {
    const filtered = await fetchOverview({ primary_disease_names: [filterTarget.disease_filter] });
    expect(filtered.womenOrChildrenShare.yes).toBeLessThanOrEqual(
      baseline.womenOrChildrenShare.yes,
    );
    expect(filtered.womenOrChildrenShare.no).toBeLessThanOrEqual(baseline.womenOrChildrenShare.no);
    expect(filtered.womenOrChildrenShare.unknown).toBeLessThanOrEqual(
      baseline.womenOrChildrenShare.unknown,
    );
    // Bucket sum still equals the filter's totalPriorities — every priority
    // lands in exactly one bucket regardless of filtering.
    const sum =
      filtered.womenOrChildrenShare.yes +
      filtered.womenOrChildrenShare.no +
      filtered.womenOrChildrenShare.unknown;
    expect(sum).toBe(filtered.totalPriorities);
  });
});
