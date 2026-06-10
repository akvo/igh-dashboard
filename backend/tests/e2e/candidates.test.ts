/**
 * E2E Tests — Candidate list, detail, and filter queries.
 */

import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import path from "path";
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

    const { data: filteredData } = await query<{
      candidates: {
        totalCount: number;
        nodes: Array<{ candidate_key: number; disease: { global_health_area: string } | null }>;
      };
    }>(`{
      candidates(filter: { global_health_area: "Neglected disease" }) {
        totalCount
        nodes {
          candidate_key
          disease { global_health_area }
        }
      }
    }`);

    expect(filteredData.candidates.totalCount).toBeGreaterThan(0);
    expect(filteredData.candidates.totalCount).toBeLessThan(allData.candidates.totalCount);
    filteredData.candidates.nodes.forEach((node) => {
      expect(node.disease?.global_health_area).toBe("Neglected disease");
    });
  });

  it("filters by disease_key", async () => {
    const { data: lookupData } = await query<{
      candidates: { nodes: Array<{ disease: { disease_key: number } | null }> };
    }>(`{
      candidates(limit: 10) {
        nodes { disease { disease_key } }
      }
    }`);

    const candidateWithDisease = lookupData.candidates.nodes.find((n) => n.disease !== null);
    expect(candidateWithDisease).toBeDefined();
    const diseaseKey = candidateWithDisease!.disease!.disease_key;

    const { data } = await query<{
      candidates: {
        totalCount: number;
        nodes: Array<{ candidate_key: number; disease: { disease_key: number } | null }>;
      };
    }>(
      `query ($filter: CandidateFilter) {
        candidates(filter: $filter) {
          totalCount
          nodes {
            candidate_key
            disease { disease_key }
          }
        }
      }`,
      { filter: { disease_key: diseaseKey } },
    );

    expect(data.candidates.totalCount).toBeGreaterThan(0);
    data.candidates.nodes.forEach((node) => {
      expect(node.disease?.disease_key).toBe(diseaseKey);
    });
  });
});

describe("Candidates — phase and product filters", () => {
  it("filters by phase_key", async () => {
    const { data: lookupData } = await query<{
      phases: Array<{ phase_key: number }>;
    }>(`{ phases { phase_key } }`);

    expect(lookupData.phases.length).toBeGreaterThan(0);
    const phaseKey = lookupData.phases[0].phase_key;

    const { data } = await query<{
      candidates: {
        totalCount: number;
        nodes: Array<{ candidate_key: number; phase: { phase_key: number } | null }>;
      };
    }>(
      `query ($filter: CandidateFilter) {
        candidates(filter: $filter) {
          totalCount
          nodes {
            candidate_key
            phase { phase_key }
          }
        }
      }`,
      { filter: { phase_key: phaseKey } },
    );

    expect(data.candidates.totalCount).toBe(909);
    // The resolved phase comes from the most-recent active snapshot, which can
    // differ from the filtered snapshot when a candidate has multiple snapshots.
    // Verify the majority resolve to the filtered phase.
    const matching = data.candidates.nodes.filter(
      (node) => node.phase?.phase_key === phaseKey,
    ).length;
    expect(matching).toBe(20);
  });

  it("filters by product_key", async () => {
    const { data: lookupData } = await query<{
      products: Array<{ product_key: number }>;
    }>(`{ products { product_key } }`);

    expect(lookupData.products.length).toBeGreaterThan(0);
    const productKey = lookupData.products[0].product_key;

    const { data } = await query<{
      candidates: {
        totalCount: number;
        nodes: Array<{ candidate_key: number; product: { product_key: number } | null }>;
      };
    }>(
      `query ($filter: CandidateFilter) {
        candidates(filter: $filter) {
          totalCount
          nodes {
            candidate_key
            product { product_key }
          }
        }
      }`,
      { filter: { product_key: productKey } },
    );

    expect(data.candidates.totalCount).toBeGreaterThan(0);
    data.candidates.nodes.forEach((node) => {
      expect(node.product?.product_key).toBe(productKey);
    });
  });
});

describe("Candidates — year and status filters", () => {
  it("filters by year", async () => {
    const { data: allData } = await query<{ candidates: CandidateConnection }>(`{
      candidates {
        totalCount
      }
    }`);

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

    expect(data.candidates.totalCount).toBeGreaterThan(0);
    expect(data.candidates.totalCount).toBeLessThan(allData.candidates.totalCount);
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

    expect(data.candidates.totalCount).toBeGreaterThan(0);
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
          candidateid
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

describe("portfolioCandidates — priority_keys filter", () => {
  it("narrows results to candidates bridged to the chosen priority", async () => {
    const dbPath = path.resolve(__dirname, "../star_schema.db");

    const db = new Database(dbPath, { readonly: true });
    let row: { priority_key: number; n: number };
    try {
      row = db
        .prepare(
          `SELECT bp.priority_key, COUNT(DISTINCT bp.candidate_key) AS n
           FROM bridge_candidate_priority bp
           JOIN dim_priority p ON p.priority_key = bp.priority_key
           WHERE p.priority_name IS NOT NULL AND TRIM(p.priority_name) != ''
           GROUP BY bp.priority_key
           HAVING n > 0
           ORDER BY n DESC
           LIMIT 1`,
        )
        .get() as { priority_key: number; n: number };
    } finally {
      db.close();
    }

    const { data: result } = await query<{
      portfolioCandidates: { totalCount: number; nodes: { candidate_key: number }[] };
    }>(
      `query Q($filter: PortfolioCandidateFilter) {
         portfolioCandidates(filter: $filter, limit: 100) {
           totalCount
           nodes { candidate_key }
         }
       }`,
      { filter: { priority_keys: [row.priority_key] } },
    );

    expect(result.portfolioCandidates.totalCount).toBeGreaterThan(0);
    expect(result.portfolioCandidates.totalCount).toBeLessThanOrEqual(row.n);

    // Every returned candidate must appear in the bridge for this priority.
    const reopen = new Database(dbPath, { readonly: true });
    let bridgeKeys: Set<number>;
    try {
      const bridgeRows = reopen
        .prepare(`SELECT candidate_key FROM bridge_candidate_priority WHERE priority_key = ?`)
        .all(row.priority_key) as { candidate_key: number }[];
      bridgeKeys = new Set(bridgeRows.map((r) => r.candidate_key));
    } finally {
      reopen.close();
    }
    for (const node of result.portfolioCandidates.nodes) {
      expect(bridgeKeys.has(node.candidate_key)).toBe(true);
    }
  });
});
