import { describe, it, expect, beforeAll } from "vitest";
import { query } from "../helpers/graphql.js";
import Database from "better-sqlite3";
import path from "path";

const GQL = `
  query Q($filter: PortfolioCandidateFilter, $limit: Int) {
    portfolioCandidates(filter: $filter, limit: $limit) {
      totalCount
      nodes { candidate_key candidate_type }
    }
  }
`;

// Pick a priority that has at least one strict-2025 Candidate, so the
// flag has a real (non-zero) effect.
let priorityKey: number;
let strictSql: number;

beforeAll(() => {
  const db = new Database(path.resolve(__dirname, "../star_schema.db"), {
    readonly: true,
  });
  try {
    const row = db
      .prepare(
        `SELECT bp.priority_key AS k,
                COUNT(DISTINCT CASE WHEN c.new_include_in_pipeline_2025 = 1
                                    THEN f.candidate_key END) AS strict
         FROM fact_pipeline_snapshot f
         JOIN dim_candidate_core c ON c.candidate_key = f.candidate_key
         JOIN bridge_candidate_priority bp ON bp.candidate_key = f.candidate_key
         WHERE f.is_active_flag = 1 AND f.include_in_pipeline = 1
           AND c.candidate_type = 'Candidate'
         GROUP BY bp.priority_key
         HAVING strict > 0
         ORDER BY strict DESC
         LIMIT 1`,
      )
      .get() as { k: number; strict: number };
    priorityKey = row.k;
    strictSql = row.strict;
  } finally {
    db.close();
  }
});

describe("portfolioCandidates strict 2025 flag", () => {
  it("totalCount matches the strict SQL count and contains no products", async () => {
    const { data } = await query<{
      portfolioCandidates: {
        totalCount: number;
        nodes: { candidate_type: string | null }[];
      };
    }>(GQL, {
      filter: {
        candidate_type: "Candidate",
        priority_keys: [priorityKey],
        new_include_in_pipeline_2025: true,
      },
      limit: 100,
    });
    expect(data.portfolioCandidates.totalCount).toBe(strictSql);
    expect(data.portfolioCandidates.nodes.every((n) => n.candidate_type !== "Product")).toBe(true);
  });

  it("omitting the flag does not reduce below the strict count (flag is opt-in)", async () => {
    const { data } = await query<{ portfolioCandidates: { totalCount: number } }>(GQL, {
      filter: { candidate_type: "Candidate", priority_keys: [priorityKey] },
      limit: 1,
    });
    expect(data.portfolioCandidates.totalCount).toBeGreaterThanOrEqual(strictSql);
  });
});
