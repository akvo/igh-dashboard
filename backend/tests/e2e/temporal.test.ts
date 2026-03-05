/**
 * E2E Tests — Temporal analysis queries.
 */

import { describe, it, expect } from "vitest";
import { query } from "../helpers/graphql.js";
import type { TemporalSnapshotRow, TemporalFilterOption } from "../helpers/types.js";

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

describe("Temporal filter options (cross-filtering)", () => {
  it("returns disease×product pairs", async () => {
    const { data } = await query<{
      temporalFilterOptions: TemporalFilterOption[];
    }>(`{
      temporalFilterOptions {
        disease_group_name
        product_key
      }
    }`);

    expect(data.temporalFilterOptions.length).toBeGreaterThan(0);
    data.temporalFilterOptions.forEach((row) => {
      expect(typeof row.disease_group_name).toBe("string");
      expect(typeof row.product_key).toBe("number");
    });
  });

  it("returns distinct pairs", async () => {
    const { data } = await query<{
      temporalFilterOptions: TemporalFilterOption[];
    }>(`{
      temporalFilterOptions {
        disease_group_name
        product_key
      }
    }`);

    const keys = data.temporalFilterOptions.map(
      (r) => `${r.disease_group_name}::${r.product_key}`,
    );
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it("pairs are consistent with temporal snapshots", async () => {
    const { data: pairsData } = await query<{
      temporalFilterOptions: TemporalFilterOption[];
    }>(`{
      temporalFilterOptions {
        disease_group_name
        product_key
      }
    }`);

    // Pick a pair and verify temporalSnapshots returns data for it
    const pair = pairsData.temporalFilterOptions[0];
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
