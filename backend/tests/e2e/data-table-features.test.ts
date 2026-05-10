/**
 * E2E tests — DataTable GraphQL features (column_filters, sort,
 * distinctValues). Exercises the resolvers end-to-end against the test
 * star_schema.db so wiring bugs in any of Tasks 1.4–1.7 surface here.
 */

import { describe, it, expect } from "vitest";
import { query } from "../helpers/graphql.js";

interface PortfolioCandidatesPage {
  totalCount: number;
  hasNextPage: boolean;
  nodes: Array<{
    candidate_key: number;
    candidate_name: string | null;
    indication: string | null;
  }>;
}

interface ClinicalTrialsPage {
  totalCount: number;
  nodes: Array<{
    trial_id: number;
    trial_name: string | null;
    status: string | null;
    start_date: string | null;
  }>;
}

describe("DataTable GraphQL features (e2e)", () => {
  it("portfolioCandidates accepts column_filters TEXT and returns matching rows", async () => {
    const { data } = await query<{ portfolioCandidates: PortfolioCandidatesPage }>(
      `query Q {
        portfolioCandidates(
          filter: {
            column_filters: [
              { column: "indication", kind: TEXT, text: "tuberculosis" }
            ]
          }
          limit: 5
        ) {
          totalCount
          nodes { candidate_key candidate_name indication }
        }
      }`,
    );
    expect(data.portfolioCandidates.totalCount).toBeGreaterThanOrEqual(0);
    for (const node of data.portfolioCandidates.nodes) {
      expect((node.indication ?? "").toLowerCase()).toContain("tuberculosis");
    }
  });

  it("portfolioCandidates accepts a sort and orders the page accordingly", async () => {
    const { data } = await query<{ portfolioCandidates: PortfolioCandidatesPage }>(
      `query Q {
        portfolioCandidates(
          sort: { column: "candidate_name", direction: ASC }
          limit: 10
        ) {
          nodes { candidate_name }
        }
      }`,
    );
    const names = data.portfolioCandidates.nodes
      .map((n) => n.candidate_name)
      .filter((s): s is string => typeof s === "string");
    const sorted = [...names].sort((a, b) => a.localeCompare(b));
    expect(names).toEqual(sorted);
  });

  it("clinicalTrials accepts a CATEGORY filter and returns only matching statuses", async () => {
    // Fetch every distinct status first so the test isn't fragile if
    // none of the rows match a hardcoded status.
    const { data: dv } = await query<{ distinctValues: string[] }>(
      `query Q {
        distinctValues(table: CLINICAL_TRIALS, column: "status")
      }`,
    );
    expect(dv.distinctValues.length).toBeGreaterThan(0);
    const target = dv.distinctValues[0];

    const { data } = await query<{ clinicalTrials: ClinicalTrialsPage }>(
      `query Q($v: [String!]) {
        clinicalTrials(
          filter: {
            column_filters: [
              { column: "status", kind: CATEGORY, values: $v }
            ]
          }
          limit: 5
        ) {
          totalCount
          nodes { trial_id status }
        }
      }`,
      { v: [target] },
    );
    expect(data.clinicalTrials.totalCount).toBeGreaterThan(0);
    for (const node of data.clinicalTrials.nodes) {
      expect(node.status).toBe(target);
    }
  });

  it("clinicalTrials accepts a DATE BETWEEN filter on start_date", async () => {
    const { data } = await query<{ clinicalTrials: ClinicalTrialsPage }>(
      `query Q {
        clinicalTrials(
          filter: {
            column_filters: [
              {
                column: "start_date",
                kind: DATE,
                operator: BETWEEN,
                date_value: "2020-01-01",
                date_value_end: "2020-12-31"
              }
            ]
          }
          limit: 5
        ) {
          totalCount
          nodes { trial_id start_date }
        }
      }`,
    );
    expect(data.clinicalTrials.totalCount).toBeGreaterThanOrEqual(0);
    for (const node of data.clinicalTrials.nodes) {
      const day = (node.start_date ?? "").slice(0, 10);
      expect(day >= "2020-01-01" && day <= "2020-12-31").toBe(true);
    }
  });

  it("distinctValues returns CATEGORY values for a known column", async () => {
    const { data } = await query<{ distinctValues: string[] }>(
      `query Q {
        distinctValues(table: PORTFOLIO_CANDIDATES, column: "global_health_area")
      }`,
    );
    expect(Array.isArray(data.distinctValues)).toBe(true);
    expect(data.distinctValues.length).toBeGreaterThan(0);
  });

  it("distinctValues returns [] for a TEXT column", async () => {
    const { data } = await query<{ distinctValues: string[] }>(
      `query Q {
        distinctValues(table: PORTFOLIO_CANDIDATES, column: "indication")
      }`,
    );
    expect(data.distinctValues).toEqual([]);
  });

  it("distinctValues excludes the asking column from its own filter", async () => {
    // Pick a real GHA value to constrain by, then ask for distinct GHAs
    // with that very GHA already in column_filters. If the resolver
    // forgot to strip the own-column entry we'd get back a single value;
    // with stripping we should get every GHA the data has.
    const { data: dv1 } = await query<{ distinctValues: string[] }>(
      `query Q {
        distinctValues(table: PORTFOLIO_CANDIDATES, column: "global_health_area")
      }`,
    );
    expect(dv1.distinctValues.length).toBeGreaterThan(1);
    const seed = dv1.distinctValues[0];

    const { data } = await query<{ distinctValues: string[] }>(
      `query Q($v: [String!]) {
        distinctValues(
          table: PORTFOLIO_CANDIDATES
          column: "global_health_area"
          filter: {
            column_filters: [
              { column: "global_health_area", kind: CATEGORY, values: $v }
            ]
          }
        )
      }`,
      { v: [seed] },
    );
    expect(data.distinctValues.length).toBeGreaterThan(1);
  });
});
