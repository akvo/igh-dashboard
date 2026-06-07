/**
 * E2E tests — HIERARCHICAL disease column_filter on portfolioCandidates.
 *
 * The feature under test: when a ColumnFilter carries kind: HIERARCHICAL for
 * column "disease_name", the resolver builds:
 *
 *   (d.disease_filter IN (...primary_values)
 *    OR d.secondary_disease_name IN (...secondary_values))
 *
 * The three substantive tests below progress from simple smoke-tests to the
 * critical union proof. Tests 2 and 3 confirm each axis independently; test 4
 * is the decisive one: AND-combining the two levels would return 0 rows (Dengue
 * rows have secondary_disease_name = NULL, so they cannot simultaneously match
 * secondary_disease_name = 'Cholera'). The union equality therefore proves the
 * OR semantics hold end-to-end through the resolver and the generated SQL.
 */

import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { query } from "../helpers/graphql.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, "../star_schema.db");

// Disease names used throughout — verified by the first test against the DB.
// 'Cholera' is a child of 'Diarrhoeal diseases'; 'Dengue' is a top-level
// disease with no child rows (secondary_disease_name IS NULL for all its rows).
const CHILD_DISEASE = "Cholera";
const PARENT_DISEASE = "Dengue";

// ---------------------------------------------------------------------------
// Helper — execute a portfolioCandidates query with a single HIERARCHICAL
// disease column_filter and return the connection.
// ---------------------------------------------------------------------------
async function runDiseaseFilter(primary: string[], secondary: string[]) {
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
        column_filters: [
          {
            column: "disease_name",
            kind: "HIERARCHICAL",
            primary_values: primary,
            secondary_values: secondary,
          },
        ],
      },
    },
  );
  return data.portfolioCandidates;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("portfolioCandidates — HIERARCHICAL disease filter", () => {
  it("prerequisite: expected disease names exist in the test DB", () => {
    const db = new Database(DB_PATH, { readonly: true });
    try {
      // Verify 'Diarrhoeal diseases' / 'Cholera' parent-child pair exists.
      const choleraRow = db
        .prepare(
          `SELECT 1 FROM dim_disease
           WHERE disease_filter = 'Diarrhoeal diseases'
             AND secondary_disease_name = 'Cholera'
           LIMIT 1`,
        )
        .get();
      expect(choleraRow).toBeDefined();

      // Verify 'Dengue' is childless (no non-NULL secondary_disease_name).
      const dengueChildRow = db
        .prepare(
          `SELECT 1 FROM dim_disease
           WHERE disease_filter = 'Dengue'
             AND secondary_disease_name IS NOT NULL
           LIMIT 1`,
        )
        .get();
      expect(dengueChildRow).toBeUndefined();

      // Verify 'Dengue' itself exists.
      const dengueRow = db
        .prepare(
          `SELECT 1 FROM dim_disease
           WHERE disease_filter = 'Dengue'
           LIMIT 1`,
        )
        .get();
      expect(dengueRow).toBeDefined();
    } finally {
      db.close();
    }
  });

  it("secondary-only returns rows whose secondary_disease_name matches", async () => {
    const result = await runDiseaseFilter([], [CHILD_DISEASE]);

    expect(result.totalCount).toBeGreaterThan(0);
    for (const node of result.nodes) {
      expect(node.secondary_disease_name).toBe(CHILD_DISEASE);
    }
  });

  it("primary-only returns rows whose disease_name matches the childless parent", async () => {
    const result = await runDiseaseFilter([PARENT_DISEASE], []);

    expect(result.totalCount).toBeGreaterThan(0);
    for (const node of result.nodes) {
      expect(node.disease_name).toBe(PARENT_DISEASE);
    }
  });

  it("mixed primary+secondary returns the exact union, proving OR not AND semantics", async () => {
    // Run all three queries independently so their counts are comparable.
    const [cholera, parent, mixed] = await Promise.all([
      runDiseaseFilter([], [CHILD_DISEASE]),
      runDiseaseFilter([PARENT_DISEASE], []),
      runDiseaseFilter([PARENT_DISEASE], [CHILD_DISEASE]),
    ]);

    // The two populations are disjoint:
    //   - Cholera rows:          disease_name = "Diarrhoeal diseases", secondary = "Cholera"
    //   - Childless-parent rows: disease_name = PARENT_DISEASE,        secondary = NULL
    // So no overlap is possible, and mixed must equal cholera + parent.
    expect(mixed.totalCount).toBe(cholera.totalCount + parent.totalCount);

    // Adding the parent axis MUST have contributed rows (the union is strictly
    // larger than cholera alone). If the filter were AND instead of OR this
    // assertion would fail because no Dengue row has secondary_disease_name = 'Cholera'.
    expect(mixed.totalCount).toBeGreaterThan(cholera.totalCount);

    // Every node in the mixed result satisfies at least one axis.
    for (const node of mixed.nodes) {
      const matchesPrimary = node.disease_name === PARENT_DISEASE;
      const matchesSecondary = node.secondary_disease_name === CHILD_DISEASE;
      expect(matchesPrimary || matchesSecondary).toBe(true);
    }
  });
});
