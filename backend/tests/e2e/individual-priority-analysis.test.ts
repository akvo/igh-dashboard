/**
 * E2E Tests — individualPriorityAnalysis query.
 *
 * Validates the three sub-queries (counts, target_population,
 * pipelineBuildUp) against the tracked gold DB and exercises
 * page-filter cross-narrowing.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { query } from "../helpers/graphql.js";
import Database from "better-sqlite3";
import path from "path";

interface PipelineBuildUpRow {
  product_name: string;
  phase_name: string;
  sort_order: number;
  candidateCount: number;
}

interface Analysis {
  candidatesCount: number;
  approvedProductsCount: number;
  targetPopulation: string | null;
  pipelineBuildUp: PipelineBuildUpRow[];
}

const GQL = `
  query Q(
    $priorityKey: Int!,
    $globalHealthAreas: [String!],
    $primaryDiseaseNames: [String!]
  ) {
    individualPriorityAnalysis(
      priority_key: $priorityKey,
      global_health_areas: $globalHealthAreas,
      primary_disease_names: $primaryDiseaseNames
    ) {
      candidatesCount
      approvedProductsCount
      targetPopulation
      pipelineBuildUp {
        product_name
        phase_name
        sort_order
        candidateCount
      }
    }
  }
`;

let pickedPriorityKey: number;
let pickedTargetPopulation: string | null;
let pickedGha: string | null;

beforeAll(() => {
  const dbPath = path.resolve(__dirname, "../star_schema.db");
  const db = new Database(dbPath, { readonly: true });
  try {
    // Pick a non-stub priority with at least one bridged candidate AND a
    // non-null target_population so every sub-query returns non-trivial
    // data. Also capture its disease's GHA for the cross-filter case.
    const row = db
      .prepare(
        `SELECT p.priority_key, p.target_population, d.global_health_area
         FROM dim_priority p
         JOIN dim_disease d ON d.disease_key = p.disease_key
         WHERE p.priority_name IS NOT NULL
           AND TRIM(p.priority_name) != ''
           AND p.target_population IS NOT NULL
           AND p.priority_key IN (SELECT priority_key FROM bridge_candidate_priority)
         LIMIT 1`,
      )
      .get() as {
      priority_key: number;
      target_population: string;
      global_health_area: string | null;
    };
    pickedPriorityKey = row.priority_key;
    pickedTargetPopulation = row.target_population;
    pickedGha = row.global_health_area;
  } finally {
    db.close();
  }
});

describe("individualPriorityAnalysis", () => {
  it("returns counts + target_population + pipelineBuildUp for a known priority", async () => {
    const { data } = await query<{
      individualPriorityAnalysis: Analysis;
    }>(GQL, { priorityKey: pickedPriorityKey });
    const a = data.individualPriorityAnalysis;

    expect(a.targetPopulation).toBe(pickedTargetPopulation);
    expect(a.candidatesCount).toBeGreaterThanOrEqual(0);
    expect(a.approvedProductsCount).toBeGreaterThanOrEqual(0);
    expect(a.candidatesCount + a.approvedProductsCount).toBeGreaterThan(0);

    // Q3 confirms disjoint sets — chart rows sum to the total of both cards.
    const sumByRow = a.pipelineBuildUp.reduce((sum, r) => sum + r.candidateCount, 0);
    expect(sumByRow).toBe(a.candidatesCount + a.approvedProductsCount);
  });

  it("returns null targetPopulation when the priority has none", async () => {
    const dbPath = path.resolve(__dirname, "../star_schema.db");
    const db = new Database(dbPath, { readonly: true });
    let row: { priority_key: number } | undefined;
    try {
      row = db
        .prepare(
          `SELECT priority_key
           FROM dim_priority
           WHERE priority_name IS NOT NULL
             AND TRIM(priority_name) != ''
             AND (target_population IS NULL OR target_population = '')
           LIMIT 1`,
        )
        .get() as { priority_key: number } | undefined;
    } finally {
      db.close();
    }

    if (!row) return; // No null-target_population priorities in the gold DB; skip.

    const { data: d2 } = await query<{
      individualPriorityAnalysis: Analysis;
    }>(GQL, { priorityKey: row.priority_key });
    const a = d2.individualPriorityAnalysis;

    // The resolver returns null when target_population is null;
    // COALESCE in the silver→gold transformation may store '' instead,
    // so accept either shape.
    expect(a.targetPopulation === null || a.targetPopulation === "").toBe(true);
  });

  it("narrows counts when an incompatible global_health_areas filter is applied", async () => {
    // Use a GHA value the picked priority's disease does NOT belong to.
    // If the picked priority's disease has no GHA, fall back to a constant
    // out-of-band value that no row in dim_disease carries.
    const incompatible = pickedGha === "Neglected disease" ? "Womens Health" : "Neglected disease";

    const { data: d3 } = await query<{
      individualPriorityAnalysis: Analysis;
    }>(GQL, {
      priorityKey: pickedPriorityKey,
      globalHealthAreas: [incompatible],
    });
    const a = d3.individualPriorityAnalysis;

    expect(a.candidatesCount).toBe(0);
    expect(a.approvedProductsCount).toBe(0);
    expect(a.pipelineBuildUp).toEqual([]);
    // target_population is a property of the priority itself, not narrowed.
    expect(a.targetPopulation).toBe(pickedTargetPopulation);
  });

  it("returns all-zero shape for a non-existent priority_key", async () => {
    const { data: d4 } = await query<{
      individualPriorityAnalysis: Analysis;
    }>(GQL, { priorityKey: -1 });
    const a = d4.individualPriorityAnalysis;

    expect(a.candidatesCount).toBe(0);
    expect(a.approvedProductsCount).toBe(0);
    expect(a.targetPopulation).toBeNull();
    expect(a.pipelineBuildUp).toEqual([]);
  });
});
