/**
 * E2E — the Disease column's flat CATEGORY filter and distinct values
 * operate on the displayed specific disease, COALESCE(secondary, parent).
 */
import { describe, it, expect } from "vitest";
import { query } from "../helpers/graphql.js";

describe("portfolioCandidates — disease_name specific-value filter", () => {
  it("CATEGORY filter on 'Cholera' returns only rows whose secondary disease is Cholera", async () => {
    const { data } = await query<{
      portfolioCandidates: {
        totalCount: number;
        nodes: Array<{ disease_name: string | null; secondary_disease_name: string | null }>;
      };
    }>(
      `query Q($filter: PortfolioCandidateFilter) {
         portfolioCandidates(filter: $filter, limit: 100) {
           totalCount
           nodes { disease_name secondary_disease_name }
         }
       }`,
      {
        filter: {
          column_filters: [{ column: "disease_name", kind: "CATEGORY", values: ["Cholera"] }],
        },
      },
    );
    expect(data.portfolioCandidates.totalCount).toBeGreaterThan(0);
    for (const n of data.portfolioCandidates.nodes) {
      expect(n.secondary_disease_name).toBe("Cholera");
    }
  });

  it("distinctValues lists the specific disease (Cholera), not the parent (Diarrhoeal diseases)", async () => {
    const { data } = await query<{ distinctValues: string[] }>(
      `{ distinctValues(table: PORTFOLIO_CANDIDATES, column: "disease_name") }`,
    );
    expect(data.distinctValues).toContain("Cholera");
    expect(data.distinctValues).not.toContain("Diarrhoeal diseases");
  });

  it("distinctValues resolves COALESCE(secondary, parent), not disease_group_name", async () => {
    // COVID-19's group name ("Coronavirus disease 2019 (COVID-19)") differs from
    // its secondary disease name ("COVID-19"). Seeing the secondary — and NOT the
    // group name — proves the disease column resolves to the displayed coalesced
    // value rather than the old `disease_group_name` leaf. This assertion fails on
    // base (where the column mapped to disease_group_name) and passes only after
    // the registry change.
    const { data } = await query<{ distinctValues: string[] }>(
      `{ distinctValues(table: PORTFOLIO_CANDIDATES, column: "disease_name") }`,
    );
    expect(data.distinctValues).toContain("COVID-19");
    expect(data.distinctValues).not.toContain("Coronavirus disease 2019 (COVID-19)");
  });
});
