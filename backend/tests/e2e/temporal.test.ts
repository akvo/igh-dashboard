/**
 * E2E Tests — Temporal analysis queries.
 */

import { describe, it, expect } from "vitest";
import { query } from "../helpers/graphql.js";
import type {
  TemporalSnapshotRow,
  PipelineFilterPair,
  CandidateTypeDistributionRow,
} from "../helpers/types.js";

describe("Temporal Analysis", () => {
  it("returns available years for selector", async () => {
    const { data } = await query<{ availableYears: number[] }>(`{
      availableYears
    }`);

    expect(data.availableYears.length).toBeGreaterThan(0);
    expect(data.availableYears.some((y) => y >= 2020)).toBe(true);
  });

  it("returns snapshots for selected years", async () => {
    const { data } = await query<{
      temporalSnapshots: TemporalSnapshotRow[];
    }>(`{
      temporalSnapshots {
        year
        phase_name
        sort_order
        candidateCount
      }
    }`);

    expect(data.temporalSnapshots.length).toBeGreaterThan(0);
  });

  it("includes sort_order for phase ordering", async () => {
    const { data } = await query<{
      temporalSnapshots: TemporalSnapshotRow[];
    }>(`{
      temporalSnapshots {
        year
        phase_name
        sort_order
        candidateCount
      }
    }`);

    expect(data.temporalSnapshots.length).toBeGreaterThan(0);
    data.temporalSnapshots.forEach((row) => {
      expect(typeof row.sort_order).toBe("number");
    });
  });

  it("returns data grouped by year and phase", async () => {
    const { data } = await query<{
      temporalSnapshots: TemporalSnapshotRow[];
    }>(`{
      temporalSnapshots {
        year
        phase_name
        candidateCount
      }
    }`);

    const returnedYears = [...new Set(data.temporalSnapshots.map((r) => r.year))];
    expect(returnedYears.length).toBeGreaterThan(0);

    data.temporalSnapshots.forEach((row) => {
      expect(row.year).toBeGreaterThan(2000);
      expect(row.phase_name).toBeDefined();
      expect(row.candidateCount).toBeGreaterThan(0);
    });
  });
});

describe("Temporal Analysis — disease filter", () => {
  it("filters by disease_group_names", async () => {
    const { data: baselineData } = await query<{
      temporalSnapshots: TemporalSnapshotRow[];
    }>(`{
      temporalSnapshots {
        year
        phase_name
        sort_order
        candidateCount
      }
    }`);

    const unfilteredTotal = baselineData.temporalSnapshots.reduce(
      (sum, r) => sum + r.candidateCount,
      0,
    );

    const { data: lookupData } = await query<{
      diseases: Array<{ disease_group_name: string }>;
    }>(`{ diseases { disease_group_name } }`);

    expect(lookupData.diseases.length).toBeGreaterThan(0);
    const diseaseGroupName = lookupData.diseases[0].disease_group_name;

    const { data } = await query<{
      temporalSnapshots: TemporalSnapshotRow[];
    }>(
      `query ($diseaseGroupNames: [String!]) {
        temporalSnapshots(disease_group_names: $diseaseGroupNames) {
          year
          phase_name
          sort_order
          candidateCount
        }
      }`,
      { diseaseGroupNames: [diseaseGroupName] },
    );

    const filteredTotal = data.temporalSnapshots.reduce((sum, r) => sum + r.candidateCount, 0);
    expect(filteredTotal).toBeGreaterThan(0);
    expect(filteredTotal).toBeLessThan(unfilteredTotal);
  });
});

describe("Temporal Analysis — global_health_area filter", () => {
  it("filters by global_health_areas", async () => {
    const { data: baselineData } = await query<{
      temporalSnapshots: TemporalSnapshotRow[];
    }>(`{
      temporalSnapshots {
        year
        phase_name
        sort_order
        candidateCount
      }
    }`);

    const unfilteredTotal = baselineData.temporalSnapshots.reduce(
      (sum, r) => sum + r.candidateCount,
      0,
    );

    const { data } = await query<{
      temporalSnapshots: TemporalSnapshotRow[];
    }>(
      `query ($globalHealthAreas: [String!]) {
        temporalSnapshots(global_health_areas: $globalHealthAreas) {
          year
          phase_name
          sort_order
          candidateCount
        }
      }`,
      { globalHealthAreas: ["Neglected disease"] },
    );

    const filteredTotal = data.temporalSnapshots.reduce((sum, r) => sum + r.candidateCount, 0);
    expect(filteredTotal).toBeGreaterThan(0);
    expect(filteredTotal).toBeLessThan(unfilteredTotal);
  });
});

describe("Temporal Analysis — product_key filter", () => {
  it("filters by product_keys", async () => {
    const { data: baselineData } = await query<{
      temporalSnapshots: TemporalSnapshotRow[];
    }>(`{
      temporalSnapshots {
        year
        phase_name
        sort_order
        candidateCount
      }
    }`);

    const unfilteredTotal = baselineData.temporalSnapshots.reduce(
      (sum, r) => sum + r.candidateCount,
      0,
    );

    const { data: lookupData } = await query<{
      products: Array<{ product_key: number }>;
    }>(`{ products { product_key } }`);

    expect(lookupData.products.length).toBeGreaterThan(0);
    const productKey = lookupData.products[0].product_key;

    const { data } = await query<{
      temporalSnapshots: TemporalSnapshotRow[];
    }>(
      `query ($productKeys: [Int!]) {
        temporalSnapshots(product_keys: $productKeys) {
          year
          phase_name
          sort_order
          candidateCount
        }
      }`,
      { productKeys: [productKey] },
    );

    const filteredTotal = data.temporalSnapshots.reduce((sum, r) => sum + r.candidateCount, 0);
    expect(filteredTotal).toBeGreaterThan(0);
    expect(filteredTotal).toBeLessThan(unfilteredTotal);
  });
});

describe("Temporal Analysis — candidate_type filter", () => {
  it("filters by candidate_type", async () => {
    const { data: baselineData } = await query<{
      temporalSnapshots: TemporalSnapshotRow[];
    }>(`{
      temporalSnapshots {
        year
        phase_name
        sort_order
        candidateCount
      }
    }`);

    const unfilteredTotal = baselineData.temporalSnapshots.reduce(
      (sum, r) => sum + r.candidateCount,
      0,
    );

    const { data } = await query<{
      temporalSnapshots: TemporalSnapshotRow[];
    }>(`{
      temporalSnapshots(candidate_type: "Candidate") {
        year
        phase_name
        sort_order
        candidateCount
      }
    }`);

    const filteredTotal = data.temporalSnapshots.reduce((sum, r) => sum + r.candidateCount, 0);
    expect(filteredTotal).toBeGreaterThan(0);
    expect(filteredTotal).toBeLessThan(unfilteredTotal);
  });
});

describe("Temporal Analysis — year filter", () => {
  it("year filter verifies all rows match", async () => {
    const { data: allSnapshots } = await query<{
      temporalSnapshots: TemporalSnapshotRow[];
    }>(`{
      temporalSnapshots {
        year
      }
    }`);

    expect(allSnapshots.temporalSnapshots.length).toBeGreaterThan(0);
    const year = allSnapshots.temporalSnapshots[0].year;

    const { data } = await query<{
      temporalSnapshots: TemporalSnapshotRow[];
    }>(
      `query ($years: [Int!]) {
        temporalSnapshots(years: $years) {
          year
          phase_name
          sort_order
          candidateCount
        }
      }`,
      { years: [year] },
    );

    expect(data.temporalSnapshots.length).toBeGreaterThan(0);
    data.temporalSnapshots.forEach((row) => {
      expect(row.year).toBe(year);
    });
  });

  it("unfiltered returns multiple years", async () => {
    const { data } = await query<{
      temporalSnapshots: TemporalSnapshotRow[];
    }>(`{
      temporalSnapshots {
        year
        phase_name
        sort_order
        candidateCount
      }
    }`);

    const years = [...new Set(data.temporalSnapshots.map((r) => r.year))];
    expect(years.length).toBeGreaterThan(1);
  });
});

describe("Pipeline filter pairs (cross-filtering)", () => {
  it("returns disease×product×phase tuples with product_name", async () => {
    const { data } = await query<{
      pipelineFilterPairs: PipelineFilterPair[];
    }>(`{
      pipelineFilterPairs {
        disease_group_name
        product_key
        product_name
        phase_name
      }
    }`);

    expect(data.pipelineFilterPairs.length).toBeGreaterThan(0);
    data.pipelineFilterPairs.forEach((row) => {
      expect(typeof row.disease_group_name).toBe("string");
      expect(typeof row.product_key).toBe("number");
      expect(typeof row.product_name).toBe("string");
      // phase_name is nullable (LEFT JOIN)
      expect(row.phase_name === null || typeof row.phase_name === "string").toBe(true);
    });
  });

  it("returns distinct pairs", async () => {
    const { data } = await query<{
      pipelineFilterPairs: PipelineFilterPair[];
    }>(`{
      pipelineFilterPairs {
        disease_group_name
        product_key
        product_name
        phase_name
      }
    }`);

    const keys = data.pipelineFilterPairs.map(
      (r) => `${r.disease_group_name}::${r.product_key}::${r.phase_name ?? ""}`,
    );
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it("pairs are consistent with temporal snapshots", async () => {
    const { data: pairsData } = await query<{
      pipelineFilterPairs: PipelineFilterPair[];
    }>(`{
      pipelineFilterPairs {
        disease_group_name
        product_key
        product_name
        phase_name
      }
    }`);

    // Pick a pair and verify temporalSnapshots returns data for it
    const pair = pairsData.pipelineFilterPairs[0];
    const { data } = await query<{
      temporalSnapshots: TemporalSnapshotRow[];
    }>(
      `query ($diseaseGroupNames: [String!], $productKeys: [Int!]) {
        temporalSnapshots(disease_group_names: $diseaseGroupNames, product_keys: $productKeys) {
          year
          phase_name
          candidateCount
        }
      }`,
      {
        diseaseGroupNames: [pair.disease_group_name],
        productKeys: [pair.product_key],
      },
    );

    expect(data.temporalSnapshots.length).toBeGreaterThan(0);
  });
});

describe("Active pipeline filter pairs (active-only cross-filtering)", () => {
  it("returns the same row shape as pipelineFilterPairs", async () => {
    const { data } = await query<{
      activePipelineFilterPairs: PipelineFilterPair[];
    }>(`{
      activePipelineFilterPairs {
        disease_group_name
        product_key
        product_name
        phase_name
      }
    }`);

    expect(data.activePipelineFilterPairs.length).toBeGreaterThan(0);
    data.activePipelineFilterPairs.forEach((row) => {
      expect(typeof row.disease_group_name).toBe("string");
      expect(typeof row.product_key).toBe("number");
      expect(typeof row.product_name).toBe("string");
      // phase_name is nullable (LEFT JOIN preserved from base query)
      expect(row.phase_name === null || typeof row.phase_name === "string").toBe(true);
    });
  });

  it("returns distinct rows", async () => {
    const { data } = await query<{
      activePipelineFilterPairs: PipelineFilterPair[];
    }>(`{
      activePipelineFilterPairs {
        disease_group_name
        product_key
        product_name
        phase_name
      }
    }`);

    const keys = data.activePipelineFilterPairs.map(
      (r) => `${r.disease_group_name}::${r.product_key}::${r.phase_name ?? ""}`,
    );
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it("is a subset of pipelineFilterPairs", async () => {
    const { data } = await query<{
      pipelineFilterPairs: PipelineFilterPair[];
      activePipelineFilterPairs: PipelineFilterPair[];
    }>(`{
      pipelineFilterPairs {
        disease_group_name
        product_key
        phase_name
      }
      activePipelineFilterPairs {
        disease_group_name
        product_key
        phase_name
      }
    }`);

    // Active pairs must never exceed the broader set.
    expect(data.activePipelineFilterPairs.length).toBeLessThanOrEqual(
      data.pipelineFilterPairs.length,
    );

    // Every active pair must exist in the broader set.
    const broadKeys = new Set(
      data.pipelineFilterPairs.map(
        (r) => `${r.disease_group_name}::${r.product_key}::${r.phase_name ?? ""}`,
      ),
    );
    data.activePipelineFilterPairs.forEach((r) => {
      const key = `${r.disease_group_name}::${r.product_key}::${r.phase_name ?? ""}`;
      expect(broadKeys.has(key)).toBe(true);
    });
  });

  it("every (product_key, phase_name) combination produces non-empty candidateTypeDistribution", async () => {
    // Regression test for the original bug: an option offered in the dropdown
    // must not produce an empty chart. We sample one pair with a non-null
    // phase_name and confirm candidateTypeDistribution returns rows.
    const { data: pairsData } = await query<{
      activePipelineFilterPairs: PipelineFilterPair[];
    }>(`{
      activePipelineFilterPairs {
        product_key
        phase_name
      }
    }`);

    const sample = pairsData.activePipelineFilterPairs.find((r) => r.phase_name !== null);
    expect(sample).toBeDefined();
    if (!sample || sample.phase_name === null) return;

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
      {
        productKeys: [sample.product_key],
        phaseNames: [sample.phase_name],
      },
    );

    expect(data.candidateTypeDistribution.length).toBeGreaterThan(0);
    const totalCount = data.candidateTypeDistribution.reduce((sum, r) => sum + r.candidateCount, 0);
    expect(totalCount).toBeGreaterThan(0);
  });
});
