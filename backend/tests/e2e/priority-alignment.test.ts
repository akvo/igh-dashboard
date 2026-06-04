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
// Shared across describe blocks 2, 3 (priorities list + applicable arrays).
let filterTarget: { disease_name: string; global_health_area: string };

beforeAll(async () => {
  baseline = await fetchOverview();
});

beforeAll(() => {
  // Pick the first priority-bearing disease that has a non-null GHA AND
  // at least one pipeline-linked candidate (via bridge_candidate_priority →
  // fact_pipeline_snapshot). This ensures the pipeline-gated queries
  // (totalPriorities, womenOrChildren, priorities list) return > 0.
  const db = new Database(path.resolve(__dirname, "../star_schema.db"), { readonly: true });
  const row = db
    .prepare(
      `SELECT DISTINCT TRIM(d.disease_name) AS disease_name, d.global_health_area
         FROM dim_disease d
         JOIN dim_priority p ON p.disease_key = d.disease_key
         JOIN bridge_candidate_priority bcp ON bcp.priority_key = p.priority_key
         JOIN fact_pipeline_snapshot f ON f.candidate_key = bcp.candidate_key
        WHERE d.global_health_area IS NOT NULL
          AND TRIM(p.priority_name) != ''
        ORDER BY disease_name
        LIMIT 1`,
    )
    .get() as { disease_name: string; global_health_area: string } | undefined;
  db.close();
  if (!row)
    throw new Error(
      "expected at least one priority-bearing disease with pipeline candidates and non-null GHA",
    );
  filterTarget = row;
});

// ---------------------------------------------------------------------------
// 1. Unfiltered baseline
// ---------------------------------------------------------------------------

describe("priorityAlignmentOverview — unfiltered", () => {
  it("totalPriorities matches snapshot (66)", () => {
    // All non-stub priorities from dim_priority are counted (no pipeline gate).
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
      // They still appear in the dropdown; the section's per-GHA share cards
      // simply won't reflect them.
    }
  });

  it("diseaseOptions has no duplicate disease_keys", () => {
    const keys = baseline.diseaseOptions.map((o) => o.disease_key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("womenOrChildrenShare snapshot matches tracked DB (34 Yes / 31 No / 1 unknown)", () => {
    // All non-stub priorities from dim_priority are bucketed (no pipeline gate).
    // The sum equals totalPriorities.
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
// 2. Filtered by primary_disease_names
// ---------------------------------------------------------------------------

describe("priorityAlignmentOverview — filtered by primary_disease_names", () => {
  it("totalPriorities narrows to selected diseases only", async () => {
    const filtered = await fetchOverview({ primary_disease_names: [filterTarget.disease_name] });
    expect(filtered.totalPriorities).toBeGreaterThan(0);
    expect(filtered.totalPriorities).toBeLessThanOrEqual(baseline.totalPriorities);
  });

  it("byArea still returns exactly 3 rows in fixed order", async () => {
    const filtered = await fetchOverview({ primary_disease_names: [filterTarget.disease_name] });
    expect(filtered.byArea).toHaveLength(3);
    expect(filtered.byArea.map((r) => r.global_health_area)).toEqual(Array.from(FIXED_AREA_ORDER));
  });

  it("byArea zero-denominator GHAs render sharePercentage = 0", async () => {
    const filtered = await fetchOverview({ primary_disease_names: [filterTarget.disease_name] });
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
    const filtered = await fetchOverview({ primary_disease_names: [filterTarget.disease_name] });
    expect(filtered.diseaseOptions).toHaveLength(baseline.diseaseOptions.length);
  });

  it("productTypeBreakdown total candidates ≤ baseline total", async () => {
    const filtered = await fetchOverview({ primary_disease_names: [filterTarget.disease_name] });
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
    const filtered = await fetchOverview({ primary_disease_names: [filterTarget.disease_name] });
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

// ---------------------------------------------------------------------------
// 3. New fields: priorities, applicableDiseases, applicableProductNames
// ---------------------------------------------------------------------------

interface AreaShareWithApplicable extends AreaShare {
  applicableDiseases: string[];
  applicableProductNames: string[];
}

interface PriorityRow {
  priority_key: number;
  priority_name: string;
}

interface OverviewWithExtras extends Overview {
  priorities: PriorityRow[];
  byArea: AreaShareWithApplicable[];
}

async function fetchOverviewWithExtras(filters: FilterArgs = {}): Promise<OverviewWithExtras> {
  const { data } = await query<{ priorityAlignmentOverview: OverviewWithExtras }>(
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
          applicableDiseases
          applicableProductNames
        }
        productTypeBreakdown { product_name candidateCount }
        diseaseOptions { disease_key disease_name disease_filter global_health_area }
        womenOrChildrenShare { yes no unknown }
        priorities { priority_key priority_name }
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

describe("priorityAlignmentOverview — priorities list", () => {
  it("returns alphabetical non-stub priorities unfiltered", async () => {
    const overview = await fetchOverviewWithExtras();
    expect(overview.priorities.length).toBeGreaterThan(0);
    expect(overview.priorities.length).toBe(overview.totalPriorities);
    const names = overview.priorities.map((p) => p.priority_name);
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
    for (const p of overview.priorities) {
      expect(p.priority_key).toBeGreaterThan(0);
      expect(p.priority_name.trim()).not.toEqual("");
    }
  });

  it("narrows the priorities list under a disease filter", async () => {
    const baselineCount = (await fetchOverviewWithExtras()).priorities.length;
    const filtered = await fetchOverviewWithExtras({
      primary_disease_names: [filterTarget.disease_name],
    });
    expect(filtered.priorities.length).toBeGreaterThan(0);
    expect(filtered.priorities.length).toBeLessThanOrEqual(baselineCount);
    expect(filtered.priorities.length).toBe(filtered.totalPriorities);
  });

  // Regression: priority-side dim_disease rows have disease_filter = NULL for
  // 17 of 19 priority-bearing diseases. Before the fix, filtering by such a
  // disease name produced totalPriorities = 0 / priorities = []. Malaria is a
  // stable example: it has >0 priorities in the gold DB and a NULL
  // disease_filter on its priority-side dim_disease row.
  it("primary_disease_names filter works for diseases with NULL disease_filter (Malaria)", async () => {
    const filtered = await fetchOverviewWithExtras({ primary_disease_names: ["Malaria"] });
    expect(filtered.totalPriorities).toBeGreaterThan(0);
    expect(filtered.priorities.length).toBeGreaterThan(0);
    expect(filtered.priorities.length).toBe(filtered.totalPriorities);
    // The Neglected disease GHA card should report the selected disease name.
    const ndRow = filtered.byArea.find((r) => r.global_health_area === "Neglected disease");
    expect(ndRow).toBeDefined();
    expect(ndRow!.applicableDiseases).toContain("Malaria");
  });
});

describe("priorityAlignmentOverview — applicableDiseases / applicableProductNames", () => {
  it("applicableDiseases is empty for every GHA when no disease filter is set", async () => {
    const overview = await fetchOverviewWithExtras();
    for (const row of overview.byArea) {
      expect(row.applicableDiseases).toEqual([]);
    }
  });

  it("applicableDiseases lists the selected primary on its GHA only", async () => {
    const overview = await fetchOverviewWithExtras({
      primary_disease_names: [filterTarget.disease_name],
    });
    for (const row of overview.byArea) {
      if (row.global_health_area === filterTarget.global_health_area) {
        expect(row.applicableDiseases).toEqual([filterTarget.disease_name]);
      } else {
        expect(row.applicableDiseases).toEqual([]);
      }
    }
  });

  it("applicableProductNames is empty for every GHA when no product filter is set", async () => {
    const overview = await fetchOverviewWithExtras();
    for (const row of overview.byArea) {
      expect(row.applicableProductNames).toEqual([]);
    }
  });

  it("applicableProductNames lists the selected product per GHA that contains it", async () => {
    const overview = await fetchOverviewWithExtras({ product_names: ["Vaccines"] });
    let anyApplicable = false;
    for (const row of overview.byArea) {
      if (row.applicableProductNames.length > 0) {
        anyApplicable = true;
        expect(row.applicableProductNames).toContain("Vaccines");
        expect(row.totalCandidates).toBeGreaterThan(0);
      }
    }
    expect(anyApplicable).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. priority_keys filter on rdPriorities
// ---------------------------------------------------------------------------

describe("rdPriorities — priority_keys filter", () => {
  it("returns exactly the priority matching the supplied key", async () => {
    const dbPath = path.resolve(__dirname, "../star_schema.db");
    const db = new Database(dbPath, { readonly: true });
    const row = db
      .prepare(
        `SELECT priority_key, priority_name
         FROM dim_priority
         WHERE priority_name IS NOT NULL AND TRIM(priority_name) != ''
         ORDER BY priority_key
         LIMIT 1`,
      )
      .get() as { priority_key: number; priority_name: string };
    db.close();

    const { data: result } = await query<{
      rdPriorities: {
        totalCount: number;
        nodes: { priority_key: number; priority_name: string }[];
      };
    }>(
      `query Q($filter: RdPriorityFilter) {
         rdPriorities(filter: $filter, limit: 5) {
           totalCount
           nodes { priority_key priority_name }
         }
       }`,
      { filter: { priority_keys: [row.priority_key] } },
    );

    expect(result.rdPriorities.totalCount).toBe(1);
    expect(result.rdPriorities.nodes).toHaveLength(1);
    expect(result.rdPriorities.nodes[0]!.priority_key).toBe(row.priority_key);
  });

  it("returns zero rows for a non-existent priority key", async () => {
    const { data: result } = await query<{
      rdPriorities: { totalCount: number; nodes: unknown[] };
    }>(
      `query Q($filter: RdPriorityFilter) {
         rdPriorities(filter: $filter, limit: 5) {
           totalCount
           nodes { priority_key }
         }
       }`,
      { filter: { priority_keys: [-1] } },
    );

    expect(result.rdPriorities.totalCount).toBe(0);
    expect(result.rdPriorities.nodes).toEqual([]);
  });
});
