/**
 * E2E Tests — WHO Priority alignment page queries.
 */

import { describe, it, expect } from "vitest";
import { query } from "../helpers/graphql.js";

interface WhoPriorityAreaShare {
  global_health_area: string;
  diseasesWithPriority: number;
  diseasesWithNaPriority: number;
  diseasesWithoutPriority: number;
  totalDiseases: number;
  sharePercentage: number;
}

interface WhoPriorityOverview {
  totalPriorities: number;
  diseasesWithPriorityByArea: WhoPriorityAreaShare[];
  womenOrChildrenShare: {
    yes: number;
    na: number;
    no: number;
    total: number;
  };
}

interface WhoPriorityDetail {
  priority_key: number;
  priority_name: string | null;
  target_population: string | null;
  disease_key: number | null;
  disease_name: string | null;
  global_health_area: string | null;
  product_key: number | null;
  product_name: string | null;
}

interface WhoPriorityPipelineRow {
  product_name: string;
  phase_name: string;
  sort_order: number;
  candidateCount: number;
}

interface WhoPriorityFilterOptions {
  priorities: Array<{ priority_key: number; priority_name: string }>;
  diseases: Array<{ disease_key: number; disease_name: string }>;
  products: Array<{ product_key: number; product_name: string }>;
}

describe("whoPriorityOverview", () => {
  it("returns a positive totalPriorities count", async () => {
    const { data } = await query<{ whoPriorityOverview: WhoPriorityOverview }>(`{
      whoPriorityOverview {
        totalPriorities
      }
    }`);

    expect(data.whoPriorityOverview.totalPriorities).toBeGreaterThan(0);
    expect(Number.isInteger(data.whoPriorityOverview.totalPriorities)).toBe(true);
  });

  it("returns one row per global_health_area with coherent totals", async () => {
    const { data } = await query<{ whoPriorityOverview: WhoPriorityOverview }>(`{
      whoPriorityOverview {
        diseasesWithPriorityByArea {
          global_health_area
          diseasesWithPriority
          diseasesWithNaPriority
          diseasesWithoutPriority
          totalDiseases
          sharePercentage
        }
      }
    }`);

    const areas = data.whoPriorityOverview.diseasesWithPriorityByArea;
    expect(areas.length).toBeGreaterThan(0);

    const areaNames = areas.map((a) => a.global_health_area);
    expect(areaNames).toContain("Neglected disease");
    expect(areaNames).toContain("Emerging infectious disease");
    expect(areaNames).toContain("Womens Health");

    for (const area of areas) {
      // Each bucket sums to the total (basic integrity check)
      expect(
        area.diseasesWithPriority + area.diseasesWithNaPriority + area.diseasesWithoutPriority,
      ).toBe(area.totalDiseases);

      // Share percentage is in [0, 1]
      expect(area.sharePercentage).toBeGreaterThanOrEqual(0);
      expect(area.sharePercentage).toBeLessThanOrEqual(1);
    }
  });

  it("returns women/children distribution that sums to total", async () => {
    const { data } = await query<{ whoPriorityOverview: WhoPriorityOverview }>(`{
      whoPriorityOverview {
        womenOrChildrenShare { yes na no total }
      }
    }`);

    const share = data.whoPriorityOverview.womenOrChildrenShare;
    expect(share.total).toBeGreaterThan(0);
    expect(share.yes + share.na + share.no).toBe(share.total);
    // Womens Health priorities should be present in the Yes bucket
    expect(share.yes).toBeGreaterThan(0);
  });
});

describe("whoPriorityDetail", () => {
  it("returns priority name, disease, and target population for a valid key", async () => {
    // First pull a real priority key from the filter options endpoint.
    const { data: opts } = await query<{
      whoPriorityFilterOptions: WhoPriorityFilterOptions;
    }>(`{ whoPriorityFilterOptions { priorities { priority_key priority_name } } }`);
    expect(opts.whoPriorityFilterOptions.priorities.length).toBeGreaterThan(0);

    const key = opts.whoPriorityFilterOptions.priorities[0].priority_key;

    const { data } = await query<{ whoPriorityDetail: WhoPriorityDetail | null }>(
      `query ($key: Int!) {
        whoPriorityDetail(priority_key: $key) {
          priority_key
          priority_name
          target_population
          disease_key
          disease_name
          global_health_area
          product_key
          product_name
        }
      }`,
      { key },
    );

    expect(data.whoPriorityDetail).not.toBeNull();
    expect(data.whoPriorityDetail!.priority_key).toBe(key);
    expect(data.whoPriorityDetail!.priority_name).toBeTruthy();
  });

  it("returns null for a non-existent priority key", async () => {
    const { data } = await query<{ whoPriorityDetail: WhoPriorityDetail | null }>(
      `query ($key: Int!) {
        whoPriorityDetail(priority_key: $key) { priority_key priority_name }
      }`,
      { key: 999_999 },
    );

    expect(data.whoPriorityDetail).toBeNull();
  });
});

describe("whoPriorityPipeline", () => {
  it("returns product x phase rows for a priority with linked candidates", async () => {
    // Look for a priority that has candidates in the pipeline by walking the
    // filter options list until we find one whose pipeline is non-empty.
    const { data: opts } = await query<{
      whoPriorityFilterOptions: WhoPriorityFilterOptions;
    }>(`{ whoPriorityFilterOptions { priorities { priority_key priority_name } } }`);

    let nonEmptyRows: WhoPriorityPipelineRow[] = [];
    let chosenKey: number | null = null;
    for (const p of opts.whoPriorityFilterOptions.priorities) {
      const { data } = await query<{ whoPriorityPipeline: WhoPriorityPipelineRow[] }>(
        `query ($key: Int!) {
          whoPriorityPipeline(priority_key: $key) {
            product_name
            phase_name
            sort_order
            candidateCount
          }
        }`,
        { key: p.priority_key },
      );
      if (data.whoPriorityPipeline.length > 0) {
        nonEmptyRows = data.whoPriorityPipeline;
        chosenKey = p.priority_key;
        break;
      }
    }

    expect(chosenKey).not.toBeNull();
    expect(nonEmptyRows.length).toBeGreaterThan(0);
    for (const row of nonEmptyRows) {
      expect(row.product_name).toBeTruthy();
      expect(row.phase_name).toBeTruthy();
      expect(typeof row.sort_order).toBe("number");
      expect(row.candidateCount).toBeGreaterThan(0);
    }
  });

  it("returns empty array when no filter matches", async () => {
    const { data } = await query<{ whoPriorityPipeline: WhoPriorityPipelineRow[] }>(
      `query ($key: Int!) {
        whoPriorityPipeline(priority_key: $key) { product_name phase_name candidateCount }
      }`,
      { key: 999_999 },
    );

    expect(data.whoPriorityPipeline).toEqual([]);
  });
});

describe("whoPriorityFilterOptions", () => {
  it("returns all three lists when no filter is set", async () => {
    const { data } = await query<{
      whoPriorityFilterOptions: WhoPriorityFilterOptions;
    }>(`{
      whoPriorityFilterOptions {
        priorities { priority_key priority_name }
        diseases { disease_key disease_name }
        products { product_key product_name }
      }
    }`);

    const opts = data.whoPriorityFilterOptions;
    expect(opts.priorities.length).toBeGreaterThan(0);
    expect(opts.diseases.length).toBeGreaterThan(0);
    expect(opts.products.length).toBeGreaterThan(0);
  });

  it("narrows disease and product lists when a priority is selected", async () => {
    const { data: baseline } = await query<{
      whoPriorityFilterOptions: WhoPriorityFilterOptions;
    }>(`{
      whoPriorityFilterOptions {
        priorities { priority_key }
        diseases { disease_key }
        products { product_key }
      }
    }`);

    const firstPriority = baseline.whoPriorityFilterOptions.priorities[0].priority_key;

    const { data } = await query<{
      whoPriorityFilterOptions: WhoPriorityFilterOptions;
    }>(
      `query ($key: Int!) {
        whoPriorityFilterOptions(priority_key: $key) {
          priorities { priority_key }
          diseases { disease_key }
          products { product_key }
        }
      }`,
      { key: firstPriority },
    );

    const narrowed = data.whoPriorityFilterOptions;
    // A single priority must collapse the disease + product lists to <= baseline.
    expect(narrowed.diseases.length).toBeLessThanOrEqual(
      baseline.whoPriorityFilterOptions.diseases.length,
    );
    expect(narrowed.products.length).toBeLessThanOrEqual(
      baseline.whoPriorityFilterOptions.products.length,
    );
    // Priority list (with exclude="priority") should still expose the selected key.
    expect(narrowed.priorities.map((p) => p.priority_key)).toContain(firstPriority);
  });

  it("narrows priority list when a disease is selected", async () => {
    const { data: baseline } = await query<{
      whoPriorityFilterOptions: WhoPriorityFilterOptions;
    }>(`{
      whoPriorityFilterOptions {
        priorities { priority_key }
        diseases { disease_key }
      }
    }`);

    const diseaseKey = baseline.whoPriorityFilterOptions.diseases[0].disease_key;

    const { data } = await query<{
      whoPriorityFilterOptions: WhoPriorityFilterOptions;
    }>(
      `query ($key: Int!) {
        whoPriorityFilterOptions(disease_key: $key) {
          priorities { priority_key }
        }
      }`,
      { key: diseaseKey },
    );

    expect(data.whoPriorityFilterOptions.priorities.length).toBeGreaterThan(0);
    expect(data.whoPriorityFilterOptions.priorities.length).toBeLessThanOrEqual(
      baseline.whoPriorityFilterOptions.priorities.length,
    );
  });
});

describe("portfolioCandidates — priority_keys filter", () => {
  it("scopes results to candidates linked to the given priority", async () => {
    // Find a priority with linked candidates.
    const { data: opts } = await query<{
      whoPriorityFilterOptions: WhoPriorityFilterOptions;
    }>(`{ whoPriorityFilterOptions { priorities { priority_key } } }`);

    let chosenKey: number | null = null;
    let chosenCount = 0;
    for (const p of opts.whoPriorityFilterOptions.priorities) {
      const { data } = await query<{
        portfolioCandidates: { totalCount: number };
      }>(
        `query ($keys: [Int!]) {
          portfolioCandidates(filter: { priority_keys: $keys }) { totalCount }
        }`,
        { keys: [p.priority_key] },
      );
      if (data.portfolioCandidates.totalCount > 0) {
        chosenKey = p.priority_key;
        chosenCount = data.portfolioCandidates.totalCount;
        break;
      }
    }

    expect(chosenKey).not.toBeNull();
    expect(chosenCount).toBeGreaterThan(0);

    // The unfiltered total must be strictly larger than the priority-scoped one.
    const { data: baseline } = await query<{
      portfolioCandidates: { totalCount: number };
    }>(`{ portfolioCandidates { totalCount } }`);

    expect(baseline.portfolioCandidates.totalCount).toBeGreaterThan(chosenCount);
  });

  it("returns zero when filtering by a non-existent priority", async () => {
    const { data } = await query<{
      portfolioCandidates: { totalCount: number; nodes: unknown[] };
    }>(
      `query ($keys: [Int!]) {
        portfolioCandidates(filter: { priority_keys: $keys }) {
          totalCount
          nodes { candidate_key }
        }
      }`,
      { keys: [999_999] },
    );

    expect(data.portfolioCandidates.totalCount).toBe(0);
    expect(data.portfolioCandidates.nodes).toEqual([]);
  });
});
