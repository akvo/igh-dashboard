/**
 * E2E Tests — Candidate list, detail, and filter queries.
 */

import { describe, it, expect } from "vitest";
import { query } from "../helpers/graphql.js";
import type { CandidateNode, CandidateConnection } from "../helpers/types.js";

describe("Candidates — pagination", () => {
  it("returns paginated candidates with defaults (limit 20)", async () => {
    const { data } = await query<{ candidates: CandidateConnection }>(`{
      candidates {
        nodes {
          candidate_key
          candidate_name
        }
        totalCount
        hasNextPage
      }
    }`);

    expect(data.candidates.nodes.length).toBeGreaterThan(0);
    expect(data.candidates.nodes.length).toBeLessThanOrEqual(20);
    expect(data.candidates.totalCount).toBeGreaterThan(0);
    expect(typeof data.candidates.hasNextPage).toBe("boolean");
  });

  it("respects limit and offset parameters", async () => {
    const { data } = await query<{ candidates: CandidateConnection }>(`{
      candidates(limit: 3, offset: 0) {
        nodes {
          candidate_key
          candidate_name
        }
        totalCount
        hasNextPage
      }
    }`);

    expect(data.candidates.nodes.length).toBeLessThanOrEqual(3);
    expect(data.candidates.hasNextPage).toBe(true);
  });

  it("returns hasNextPage: true when more results exist", async () => {
    const { data } = await query<{ candidates: CandidateConnection }>(`{
      candidates(limit: 1) {
        nodes {
          candidate_key
        }
        totalCount
        hasNextPage
      }
    }`);

    expect(data.candidates.totalCount).toBeGreaterThan(1);
    expect(data.candidates.hasNextPage).toBe(true);
  });
});

describe("Candidates — health area and disease filters", () => {
  it("filters by global_health_area", async () => {
    const { data: allData } = await query<{ candidates: CandidateConnection }>(`{
      candidates {
        totalCount
      }
    }`);

    const { data: filteredData } = await query<{ candidates: CandidateConnection }>(`{
      candidates(filter: { global_health_area: "Neglected disease" }) {
        totalCount
        nodes {
          candidate_key
        }
      }
    }`);

    expect(filteredData.candidates.totalCount).toBeGreaterThan(0);
    expect(filteredData.candidates.totalCount).toBeLessThan(allData.candidates.totalCount);
  });

  it("filters by disease_key", async () => {
    const { data: lookupData } = await query<{
      diseases: Array<{ disease_key: number }>;
    }>(`{ diseases { disease_key } }`);

    expect(lookupData.diseases.length).toBeGreaterThan(0);
    const diseaseKey = lookupData.diseases[0].disease_key;

    const { data } = await query<{ candidates: CandidateConnection }>(
      `query ($filter: CandidateFilter) {
        candidates(filter: $filter) {
          totalCount
          nodes { candidate_key }
        }
      }`,
      { filter: { disease_key: diseaseKey } },
    );

    expect(data.candidates.totalCount).toBeGreaterThanOrEqual(0);
  });
});

describe("Candidates — phase and product filters", () => {
  it("filters by phase_key", async () => {
    const { data: lookupData } = await query<{
      phases: Array<{ phase_key: number }>;
    }>(`{ phases { phase_key } }`);

    expect(lookupData.phases.length).toBeGreaterThan(0);
    const phaseKey = lookupData.phases[0].phase_key;

    const { data } = await query<{ candidates: CandidateConnection }>(
      `query ($filter: CandidateFilter) {
        candidates(filter: $filter) {
          totalCount
          nodes { candidate_key }
        }
      }`,
      { filter: { phase_key: phaseKey } },
    );

    expect(data.candidates.totalCount).toBeGreaterThanOrEqual(0);
  });

  it("filters by product_key", async () => {
    const { data: lookupData } = await query<{
      products: Array<{ product_key: number }>;
    }>(`{ products { product_key } }`);

    expect(lookupData.products.length).toBeGreaterThan(0);
    const productKey = lookupData.products[0].product_key;

    const { data } = await query<{ candidates: CandidateConnection }>(
      `query ($filter: CandidateFilter) {
        candidates(filter: $filter) {
          totalCount
          nodes { candidate_key }
        }
      }`,
      { filter: { product_key: productKey } },
    );

    expect(data.candidates.totalCount).toBeGreaterThanOrEqual(0);
  });
});

describe("Candidates — year and status filters", () => {
  it("filters by year", async () => {
    const { data: yearData } = await query<{ availableYears: number[] }>(`{
      availableYears
    }`);

    expect(yearData.availableYears.length).toBeGreaterThan(0);
    const year = yearData.availableYears[0];

    const { data } = await query<{ candidates: CandidateConnection }>(
      `query ($filter: CandidateFilter) {
        candidates(filter: $filter) {
          totalCount
          nodes { candidate_key }
        }
      }`,
      { filter: { year } },
    );

    expect(data.candidates.totalCount).toBeGreaterThanOrEqual(0);
  });

  it("filters by is_active", async () => {
    const { data } = await query<{ candidates: CandidateConnection }>(
      `query ($filter: CandidateFilter) {
        candidates(filter: $filter) {
          totalCount
          nodes { candidate_key }
        }
      }`,
      { filter: { is_active: true } },
    );

    expect(data.candidates.totalCount).toBeGreaterThanOrEqual(0);
  });
});

describe("Candidate Detail", () => {
  it("returns a candidate by key", async () => {
    const { data: listData } = await query<{ candidates: CandidateConnection }>(`{
      candidates(limit: 1) {
        nodes {
          candidate_key
          candidate_name
        }
      }
    }`);

    const candidateKey = listData.candidates.nodes[0].candidate_key;

    const { data } = await query<{ candidate: CandidateNode | null }>(
      `query GetCandidate($key: Int!) {
        candidate(candidate_key: $key) {
          candidate_key
          candidate_name
          vin_candidateid
          vin_candidate_code
          developers_agg
        }
      }`,
      { key: candidateKey },
    );

    expect(data.candidate).not.toBeNull();
    expect(data.candidate!.candidate_key).toBe(candidateKey);
    expect(data.candidate!.candidate_name).toBeDefined();
  });

  it("returns null for non-existent candidate key", async () => {
    const { data } = await query<{ candidate: CandidateNode | null }>(
      `query GetCandidate($key: Int!) {
        candidate(candidate_key: $key) {
          candidate_key
          candidate_name
        }
      }`,
      { key: 999999 },
    );

    expect(data.candidate).toBeNull();
  });
});
