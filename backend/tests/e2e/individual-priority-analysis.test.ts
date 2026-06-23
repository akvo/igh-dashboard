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
           AND p.priority_key IN (
             SELECT bp.priority_key
             FROM bridge_candidate_priority bp
             JOIN fact_pipeline_snapshot f ON f.candidate_key = bp.candidate_key
             JOIN dim_candidate_core c ON c.candidate_key = f.candidate_key
             WHERE f.is_active_flag = 1 AND f.include_in_pipeline = 1
               AND c.candidate_type = 'Candidate'
               AND c.new_include_in_pipeline_2025 = 1
           )
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
  it("counts only strict-2025 candidates and excludes products", async () => {
    const { data } = await query<{ individualPriorityAnalysis: Analysis }>(GQL, {
      priorityKey: pickedPriorityKey,
    });
    const a = data.individualPriorityAnalysis;

    // Build-up is candidate-only now, so its sum equals candidatesCount.
    const sumByRow = a.pipelineBuildUp.reduce((s, r) => s + r.candidateCount, 0);
    expect(sumByRow).toBe(a.candidatesCount);

    // candidatesCount equals the strict SQL count for this priority.
    const db = new Database(path.resolve(__dirname, "../star_schema.db"), { readonly: true });
    try {
      const { n } = db
        .prepare(
          `SELECT COUNT(DISTINCT f.candidate_key) AS n
           FROM fact_pipeline_snapshot f
           JOIN dim_candidate_core c ON c.candidate_key = f.candidate_key
           JOIN bridge_candidate_priority bp ON bp.candidate_key = f.candidate_key
           WHERE f.is_active_flag = 1 AND f.include_in_pipeline = 1
             AND c.candidate_type = 'Candidate'
             AND c.new_include_in_pipeline_2025 = 1
             AND bp.priority_key = ?`,
        )
        .get(pickedPriorityKey) as { n: number };
      expect(a.candidatesCount).toBe(n);
      // Confirm the picked priority genuinely has strict candidates, so the
      // assertions above are not trivially satisfied by 0 === 0.
      expect(a.candidatesCount).toBeGreaterThan(0);
    } finally {
      db.close();
    }
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
    expect(a.targetPopulation).toBeNull();
    expect(a.pipelineBuildUp).toEqual([]);
  });
});

describe("phase_names filter", () => {
  it("filtered candidatesCount <= unfiltered candidatesCount", async () => {
    const ask = (phaseNames?: string[]) =>
      query<{ individualPriorityAnalysis: { candidatesCount: number } }>(
        `query ($k: Int!, $phaseNames: [String!]) {
           individualPriorityAnalysis(priority_key: $k, phase_names: $phaseNames) {
             candidatesCount
           }
         }`,
        { k: pickedPriorityKey, phaseNames },
      );

    const all = (await ask()).data.individualPriorityAnalysis.candidatesCount;
    const phase1 = (await ask(["Phase I"])).data.individualPriorityAnalysis.candidatesCount;
    expect(phase1).toBeLessThanOrEqual(all);
  });

  it("pipelineBuildUp rows are restricted to the selected phase", async () => {
    const { data } = await query<{ individualPriorityAnalysis: { pipelineBuildUp: { phase_name: string }[] } }>(
      `query ($k: Int!, $phaseNames: [String!]) {
         individualPriorityAnalysis(priority_key: $k, phase_names: $phaseNames) {
           pipelineBuildUp { phase_name }
         }
       }`,
      { k: pickedPriorityKey, phaseNames: ["Phase I"] },
    );
    for (const r of data.individualPriorityAnalysis.pipelineBuildUp) {
      expect(r.phase_name).toBe("Phase I");
    }
  });
});
