/**
 * E2E Tests — candidateTypeDistribution query (Portfolio overview by global health area).
 *
 * Exercises all meaningful filter combinations the UI can produce,
 * validates structural & relational invariants, and logs counts for
 * human review.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { query } from "../helpers/graphql.js";
import type { CandidateTypeDistributionRow, Product } from "../helpers/types.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maps UI R&D stage names → DB phase_name values (mirrors frontend/src/app/page.js:38-45) */
const STAGE_TO_PHASE_MAP: Record<string, string[]> = {
  "Pre-clinical": ["Discovery", "Primary and secondary screening and optimisation", "Preclinical"],
  "Phase 1": ["Phase I"],
  "Phase 2": ["Phase II"],
  "Phase 3": ["Phase III"],
  "Phase 4": ["Phase IV"],
  Approved: ["Regulatory filing", "PQ listing and regulatory approval"],
};

const ALL_STAGE_NAMES = Object.keys(STAGE_TO_PHASE_MAP);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function queryDistribution(
  variables: { productKeys?: number[]; phaseNames?: string[] } = {},
): Promise<CandidateTypeDistributionRow[]> {
  const { data } = await query<{
    candidateTypeDistribution: CandidateTypeDistributionRow[];
  }>(
    `query ($productKeys: [Int!], $phaseNames: [String!]) {
      candidateTypeDistribution(product_keys: $productKeys, phase_names: $phaseNames) {
        global_health_area
        candidate_type
        candidateCount
      }
    }`,
    variables,
  );
  return data.candidateTypeDistribution;
}

function sumCounts(rows: CandidateTypeDistributionRow[]): number {
  return rows.reduce((sum, r) => sum + r.candidateCount, 0);
}

function assertStructuralInvariants(rows: CandidateTypeDistributionRow[], label: string): void {
  for (const row of rows) {
    expect(
      ["Candidate", "Product"],
      `${label}: unexpected candidate_type "${row.candidate_type}"`,
    ).toContain(row.candidate_type);

    expect(row.candidateCount, `${label}: candidateCount must be positive`).toBeGreaterThan(0);
    expect(Number.isInteger(row.candidateCount), `${label}: candidateCount must be integer`).toBe(
      true,
    );

    expect(
      typeof row.global_health_area === "string" && row.global_health_area.length > 0,
      `${label}: global_health_area must be non-empty string`,
    ).toBe(true);
  }

  // No duplicate (area, type) pairs
  const keys = rows.map((r) => `${r.global_health_area}|${r.candidate_type}`);
  expect(new Set(keys).size, `${label}: duplicate (area, type) pairs`).toBe(keys.length);

  // Sorted by (area, type) matching the SQL ORDER BY
  const sorted = [...rows].sort((a, b) => {
    const areaCompare = a.global_health_area.localeCompare(b.global_health_area);
    if (areaCompare !== 0) return areaCompare;
    return a.candidate_type.localeCompare(b.candidate_type);
  });
  expect(rows, `${label}: rows should be sorted by (area, type)`).toEqual(sorted);
}

function assertFilterReducesOrMaintainsCounts(
  filtered: CandidateTypeDistributionRow[],
  baseline: CandidateTypeDistributionRow[],
  label: string,
): void {
  const filteredTotal = sumCounts(filtered);
  const baselineTotal = sumCounts(baseline);
  expect(
    filteredTotal,
    `${label}: filtered total (${filteredTotal}) should be ≤ baseline (${baselineTotal})`,
  ).toBeLessThanOrEqual(baselineTotal);

  // Build baseline lookup
  const baselineMap = new Map<string, number>();
  for (const row of baseline) {
    baselineMap.set(`${row.global_health_area}|${row.candidate_type}`, row.candidateCount);
  }

  for (const row of filtered) {
    const key = `${row.global_health_area}|${row.candidate_type}`;
    const baselineCount = baselineMap.get(key);
    expect(baselineCount, `${label}: area "${key}" not found in baseline`).toBeDefined();
    expect(
      row.candidateCount,
      `${label}: "${key}" count (${row.candidateCount}) > baseline (${baselineCount})`,
    ).toBeLessThanOrEqual(baselineCount!);
  }
}

// ---------------------------------------------------------------------------
// Shared state — fetched once before all tests
// ---------------------------------------------------------------------------

let baselineRows: CandidateTypeDistributionRow[] = [];
let products: Product[] = [];

beforeAll(async () => {
  baselineRows = await queryDistribution();

  const { data } = await query<{ products: Product[] }>(`{
    products { product_key product_name }
  }`);
  products = data.products;
});

// ---------------------------------------------------------------------------
// 1. Baseline (no filters)
// ---------------------------------------------------------------------------

describe("Baseline (no filters)", () => {
  it("passes structural invariants", () => {
    assertStructuralInvariants(baselineRows, "baseline");
  });

  it("returns exactly 3 health areas", () => {
    const areas = new Set(baselineRows.map((r) => r.global_health_area));
    expect(areas.size).toBe(3);
  });

  it("includes expected health area names", () => {
    const areas = baselineRows.map((r) => r.global_health_area);
    expect(areas).toContain("Neglected disease");
    expect(areas).toContain("Emerging infectious disease");
    expect(
      areas.some(
        (a) =>
          a.includes("Sexual") ||
          a.includes("reproductive") ||
          a.includes("Women") ||
          a.includes("SRH"),
      ),
    ).toBe(true);
  });

  it("has both Candidate and Product rows per area", () => {
    const areas = [...new Set(baselineRows.map((r) => r.global_health_area))];
    for (const area of areas) {
      const types = baselineRows
        .filter((r) => r.global_health_area === area)
        .map((r) => r.candidate_type);
      expect(types, `area "${area}" should have both types`).toContain("Candidate");
      expect(types, `area "${area}" should have both types`).toContain("Product");
    }
  });

  it("total counts are in expected ranges", () => {
    const candidates = baselineRows
      .filter((r) => r.candidate_type === "Candidate")
      .reduce((s, r) => s + r.candidateCount, 0);
    const productsCount = baselineRows
      .filter((r) => r.candidate_type === "Product")
      .reduce((s, r) => s + r.candidateCount, 0);

    console.log(`[baseline] Candidates: ${candidates}, Products: ${productsCount}`);
    for (const row of baselineRows) {
      console.log(`  ${row.global_health_area} | ${row.candidate_type}: ${row.candidateCount}`);
    }

    expect(candidates).toBeGreaterThan(0);
    expect(productsCount).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Product filter — sample first, middle, last
// ---------------------------------------------------------------------------

describe("Product filter", () => {
  function sampleProducts(): Array<{ label: string; product: Product }> {
    if (products.length === 0) return [];
    const first = products[0];
    const mid = products[Math.floor(products.length / 2)];
    const last = products[products.length - 1];
    // Deduplicate in case the list is very short
    const seen = new Set<number>();
    const samples: Array<{ label: string; product: Product }> = [];
    for (const [label, p] of [
      ["first", first],
      ["middle", mid],
      ["last", last],
    ] as const) {
      if (!seen.has(p.product_key)) {
        seen.add(p.product_key);
        samples.push({ label, product: p });
      }
    }
    return samples;
  }

  it("structural + relational invariants for sampled products", async () => {
    const samples = sampleProducts();
    expect(samples.length).toBeGreaterThan(0);

    for (const { label, product } of samples) {
      const rows = await queryDistribution({ productKeys: [product.product_key] });
      const tag = `product=${product.product_name} (key=${product.product_key}, ${label})`;

      if (rows.length > 0) {
        assertStructuralInvariants(rows, tag);
        assertFilterReducesOrMaintainsCounts(rows, baselineRows, tag);

        const total = sumCounts(rows);
        const baselineTotal = sumCounts(baselineRows);
        expect(total, `${tag}: should be strictly less than baseline`).toBeLessThan(baselineTotal);
        console.log(`[${tag}] total: ${total}`);
      } else {
        // Some products may legitimately return no rows
        console.log(`[${tag}] returned empty result`);
      }
    }
  });

  it("multiple product_keys returns union (sum ≤ baseline, ≥ either individual)", async () => {
    if (products.length < 2) return;

    const p1 = products[0];
    const p2 = products[Math.floor(products.length / 2)];
    if (p1.product_key === p2.product_key) return;

    const rows1 = await queryDistribution({ productKeys: [p1.product_key] });
    const rows2 = await queryDistribution({ productKeys: [p2.product_key] });
    const rowsBoth = await queryDistribution({ productKeys: [p1.product_key, p2.product_key] });

    const total1 = sumCounts(rows1);
    const total2 = sumCounts(rows2);
    const totalBoth = sumCounts(rowsBoth);
    const baselineTotal = sumCounts(baselineRows);

    assertStructuralInvariants(rowsBoth, "multi-product");
    assertFilterReducesOrMaintainsCounts(rowsBoth, baselineRows, "multi-product");

    expect(totalBoth, "multi ≤ baseline").toBeLessThanOrEqual(baselineTotal);
    expect(totalBoth, "multi ≥ first individual").toBeGreaterThanOrEqual(total1);
    expect(totalBoth, "multi ≥ second individual").toBeGreaterThanOrEqual(total2);

    console.log(
      `[multi-product] p1=${p1.product_name}(${total1}), p2=${p2.product_name}(${total2}), both=${totalBoth}, baseline=${baselineTotal}`,
    );
  });
});

// ---------------------------------------------------------------------------
// 3. Phase filter (individual stages)
// ---------------------------------------------------------------------------

describe("Phase filter (individual stages)", () => {
  it.each(ALL_STAGE_NAMES)("stage '%s' passes invariants", async (stageName) => {
    const phaseNames = STAGE_TO_PHASE_MAP[stageName];
    const rows = await queryDistribution({ phaseNames });
    const tag = `stage=${stageName}`;

    if (rows.length > 0) {
      assertStructuralInvariants(rows, tag);
      assertFilterReducesOrMaintainsCounts(rows, baselineRows, tag);
    }

    const total = sumCounts(rows);
    console.log(`[${tag}] total: ${total}, rows: ${rows.length}`);
  });
});

// ---------------------------------------------------------------------------
// 4. All phases combined
// ---------------------------------------------------------------------------

describe("All phases combined", () => {
  it("total ≤ baseline (unfiltered includes candidates with no phase)", async () => {
    const allPhaseNames = Object.values(STAGE_TO_PHASE_MAP).flat();
    const rows = await queryDistribution({ phaseNames: allPhaseNames });
    const tag = "all-phases";

    assertStructuralInvariants(rows, tag);
    assertFilterReducesOrMaintainsCounts(rows, baselineRows, tag);

    const total = sumCounts(rows);
    const baselineTotal = sumCounts(baselineRows);
    const ratio = baselineTotal > 0 ? ((total / baselineTotal) * 100).toFixed(1) : "N/A";
    console.log(`[${tag}] total: ${total}, baseline: ${baselineTotal}, ratio: ${ratio}%`);
  });
});

// ---------------------------------------------------------------------------
// 5. Combined product + phase
// ---------------------------------------------------------------------------

describe("Combined product + phase", () => {
  const stageSubset = ["Pre-clinical", "Phase 2"] as const;

  it("product × phase combinations pass invariants", async () => {
    // Sample 2 products (first and middle)
    const sampleIndices = [0, Math.floor(products.length / 2)];
    const seen = new Set<number>();
    const sampleProducts: Product[] = [];
    for (const idx of sampleIndices) {
      const p = products[idx];
      if (p && !seen.has(p.product_key)) {
        seen.add(p.product_key);
        sampleProducts.push(p);
      }
    }

    expect(sampleProducts.length).toBeGreaterThan(0);

    for (const product of sampleProducts) {
      for (const stage of stageSubset) {
        const phaseNames = STAGE_TO_PHASE_MAP[stage];
        const rows = await queryDistribution({
          productKeys: [product.product_key],
          phaseNames,
        });
        const tag = `product=${product.product_name}+stage=${stage}`;

        if (rows.length > 0) {
          assertStructuralInvariants(rows, tag);
          assertFilterReducesOrMaintainsCounts(rows, baselineRows, tag);
          console.log(`[${tag}] total: ${sumCounts(rows)}, rows: ${rows.length}`);
        } else {
          // Narrow product + narrow phase may yield nothing — that's fine
          console.log(`[${tag}] empty result (valid for narrow combination)`);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Monotonicity + edge cases
// ---------------------------------------------------------------------------

describe("Monotonicity + edge cases", () => {
  it("adding more phases never decreases the count", async () => {
    const phase1Only = await queryDistribution({
      phaseNames: STAGE_TO_PHASE_MAP["Phase 1"],
    });
    const phase1And2 = await queryDistribution({
      phaseNames: [...STAGE_TO_PHASE_MAP["Phase 1"], ...STAGE_TO_PHASE_MAP["Phase 2"]],
    });

    const total1 = sumCounts(phase1Only);
    const total12 = sumCounts(phase1And2);

    expect(total12, "Phase I+II should be ≥ Phase I only").toBeGreaterThanOrEqual(total1);
    console.log(`[monotonicity] Phase I only: ${total1}, Phase I+II: ${total12}`);
  });

  it("non-existent product_keys returns empty array", async () => {
    const rows = await queryDistribution({ productKeys: [-999] });
    expect(rows).toEqual([]);
  });

  it("empty phase_names array treated as no filter (returns baseline)", async () => {
    const rows = await queryDistribution({ phaseNames: [] });
    expect(sumCounts(rows)).toBe(sumCounts(baselineRows));
  });

  it("single phase_name works correctly", async () => {
    const rows = await queryDistribution({ phaseNames: ["Phase I"] });
    const tag = "single-phase=Phase I";

    if (rows.length > 0) {
      assertStructuralInvariants(rows, tag);
      assertFilterReducesOrMaintainsCounts(rows, baselineRows, tag);
    }
    console.log(`[${tag}] total: ${sumCounts(rows)}, rows: ${rows.length}`);
  });
});
