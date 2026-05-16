/**
 * E2E Tests — priorityAlignmentOverview query (Home page WHO Priority section).
 *
 * Validates the consolidated payload (totalPriorities, byArea, productTypeBreakdown,
 * diseaseOptions, womenOrChildrenShare) both unfiltered and with a diseaseKeys
 * filter. Asserts the fixed 3-row byArea ordering (ND, EID, WH) and that stub
 * priorities are excluded.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { query } from "../helpers/graphql.js";

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

const FIXED_AREA_ORDER = [
  "Neglected disease",
  "Emerging infectious disease",
  "Womens Health",
] as const;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

async function fetchOverview(diseaseKeys?: number[]): Promise<Overview> {
  const { data } = await query<{ priorityAlignmentOverview: Overview }>(
    `query ($diseaseKeys: [Int!]) {
      priorityAlignmentOverview(diseaseKeys: $diseaseKeys) {
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
    diseaseKeys && diseaseKeys.length > 0 ? { diseaseKeys } : {},
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
  it("totalPriorities matches snapshot (66)", () => {
    expect(baseline.totalPriorities).toBe(66);
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
    }
  });

  it("diseaseOptions has no duplicate disease_keys", () => {
    const keys = baseline.diseaseOptions.map((o) => o.disease_key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("womenOrChildrenShare snapshot matches tracked DB (34 Yes / 31 No / 1 unknown)", () => {
    // Distribution pinned against the gold DB regenerated 2026-05-14 after
    // the silver→gold projection of crc8b_dedicatedtowomenorchildren landed
    // in igh-data-transform. Tracks total = totalPriorities so the buckets
    // are mutually exclusive and cover the whole population.
    expect(baseline.womenOrChildrenShare.yes).toBe(34);
    expect(baseline.womenOrChildrenShare.no).toBe(31);
    expect(baseline.womenOrChildrenShare.unknown).toBe(1);
    const sum =
      baseline.womenOrChildrenShare.yes +
      baseline.womenOrChildrenShare.no +
      baseline.womenOrChildrenShare.unknown;
    expect(sum).toBe(baseline.totalPriorities);
  });
});

// ---------------------------------------------------------------------------
// 2. Filtered by diseaseKeys
// ---------------------------------------------------------------------------

describe("priorityAlignmentOverview — filtered by diseaseKeys", () => {
  // Pick a priority-bearing disease with a labelled GHA so the
  // zero-denominator test has a meaningful target_area to compare against.
  // 7 of the 19 priority-bearing diseases have null GHA in dim_disease;
  // selecting one of those would make the "other GHAs are zero" assertion
  // trivially pass (target_area is null, so `row.gha !== target_area` is
  // always true and all three rows would be checked for zero — which is
  // not what we're testing).
  let filterTarget: DiseaseOption;
  beforeAll(() => {
    const target = baseline.diseaseOptions.find((o) => o.global_health_area);
    if (!target) throw new Error("expected at least one option with non-null GHA");
    filterTarget = target;
  });

  it("totalPriorities narrows to selected diseases only", async () => {
    const firstOption = filterTarget;
    const filtered = await fetchOverview([firstOption.disease_key]);
    expect(filtered.totalPriorities).toBeGreaterThan(0);
    expect(filtered.totalPriorities).toBeLessThanOrEqual(baseline.totalPriorities);
  });

  it("byArea still returns exactly 3 rows in fixed order", async () => {
    const firstOption = filterTarget;
    const filtered = await fetchOverview([firstOption.disease_key]);
    expect(filtered.byArea).toHaveLength(3);
    expect(filtered.byArea.map((r) => r.global_health_area)).toEqual(Array.from(FIXED_AREA_ORDER));
  });

  it("byArea zero-denominator GHAs render sharePercentage = 0", async () => {
    const firstOption = filterTarget;
    const filtered = await fetchOverview([firstOption.disease_key]);
    const targetArea = firstOption.global_health_area;
    for (const row of filtered.byArea) {
      if (row.global_health_area !== targetArea) {
        expect(row.totalCandidates).toBe(0);
        expect(row.candidatesWithPriority).toBe(0);
        expect(row.sharePercentage).toBe(0);
      }
    }
  });

  it("diseaseOptions does NOT narrow under the filter (still 19)", async () => {
    const firstOption = filterTarget;
    const filtered = await fetchOverview([firstOption.disease_key]);
    expect(filtered.diseaseOptions).toHaveLength(baseline.diseaseOptions.length);
  });

  it("productTypeBreakdown total candidates ≤ baseline total", async () => {
    const firstOption = filterTarget;
    const filtered = await fetchOverview([firstOption.disease_key]);
    const baselineTotal = baseline.productTypeBreakdown.reduce((s, r) => s + r.candidateCount, 0);
    const filteredTotal = filtered.productTypeBreakdown.reduce((s, r) => s + r.candidateCount, 0);
    expect(filteredTotal).toBeLessThanOrEqual(baselineTotal);
  });

  it("empty diseaseKeys array behaves like unfiltered", async () => {
    const filtered = await fetchOverview([]);
    expect(filtered.totalPriorities).toBe(baseline.totalPriorities);
    expect(filtered.diseaseOptions).toHaveLength(baseline.diseaseOptions.length);
  });

  it("womenOrChildrenShare narrows under the filter and stays ≤ baseline", async () => {
    const firstOption = filterTarget;
    const filtered = await fetchOverview([firstOption.disease_key]);
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
