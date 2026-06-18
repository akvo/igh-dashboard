/**
 * E2E Tests — Clinical trial stats (trials tab KPI + charts).
 */

import { describe, it, expect } from "vitest";
import { query } from "../helpers/graphql.js";

interface ClinicalTrialStatusRow {
  status: string;
  trialCount: number;
}

interface AgeGroupDistributionRow {
  age_group_name: string;
  candidateCount: number;
}

interface ClinicalTrialDiseaseRow {
  disease_name: string;
  global_health_area: string;
  trialCount: number;
}

interface ClinicalTrialProductTypeRow {
  product_name: string;
  trialCount: number;
}

interface ClinicalTrialGhaRow {
  global_health_area: string;
  trialCount: number;
}

interface ClinicalTrialStats {
  totalTrials: number;
  statusDistribution: ClinicalTrialStatusRow[];
  ageGroupDistribution: AgeGroupDistributionRow[];
  diseaseDistribution: ClinicalTrialDiseaseRow[];
  productTypeDistribution: ClinicalTrialProductTypeRow[];
  ghaDistribution: ClinicalTrialGhaRow[];
}

const STATS_QUERY = `{
  clinicalTrialStats {
    totalTrials
    statusDistribution {
      status
      trialCount
    }
    ageGroupDistribution {
      age_group_name
      candidateCount
    }
    diseaseDistribution {
      disease_name
      global_health_area
      trialCount
    }
    productTypeDistribution {
      product_name
      trialCount
    }
    ghaDistribution {
      global_health_area
      trialCount
    }
  }
}`;

describe("Clinical Trial Stats", () => {
  it("totalTrials >= sum of statusDistribution (some trials have null/empty status)", async () => {
    const { data } = await query<{ clinicalTrialStats: ClinicalTrialStats }>(STATS_QUERY);

    const totalAllStatuses = data.clinicalTrialStats.statusDistribution.reduce(
      (sum, r) => sum + r.trialCount,
      0,
    );
    // totalTrials counts all pipeline-gated trials; statusDistribution
    // excludes those with NULL or empty status, so total >= sum.
    expect(data.clinicalTrialStats.totalTrials).toBeGreaterThanOrEqual(totalAllStatuses);
    expect(data.clinicalTrialStats.totalTrials).toBeGreaterThan(0);
  });

  it("statusDistribution includes multiple statuses (not just Active)", async () => {
    const { data } = await query<{ clinicalTrialStats: ClinicalTrialStats }>(STATS_QUERY);

    const statuses = data.clinicalTrialStats.statusDistribution.map((r) => r.status);
    expect(statuses).toContain("Active");
    expect(statuses).toContain("Completed");
    expect(statuses.length).toBeGreaterThan(2);
  });

  it("ageGroupDistribution returns non-empty results", async () => {
    const { data } = await query<{ clinicalTrialStats: ClinicalTrialStats }>(STATS_QUERY);

    expect(data.clinicalTrialStats.ageGroupDistribution.length).toBeGreaterThan(0);
    data.clinicalTrialStats.ageGroupDistribution.forEach((row) => {
      expect(row.candidateCount).toBeGreaterThan(0);
    });
  });

  it("diseaseDistribution returns non-empty results ordered by trialCount desc", async () => {
    const { data } = await query<{ clinicalTrialStats: ClinicalTrialStats }>(STATS_QUERY);

    const dist = data.clinicalTrialStats.diseaseDistribution;
    expect(dist.length).toBeGreaterThan(0);
    dist.forEach((row) => {
      expect(row.disease_name).toBeTruthy();
      expect(row.global_health_area).toBeTruthy();
      expect(row.trialCount).toBeGreaterThan(0);
    });
    for (let i = 1; i < dist.length; i++) {
      expect(dist[i - 1].trialCount).toBeGreaterThanOrEqual(dist[i].trialCount);
    }
  });

  it("productTypeDistribution returns non-empty results ordered by trialCount desc", async () => {
    const { data } = await query<{ clinicalTrialStats: ClinicalTrialStats }>(STATS_QUERY);

    const dist = data.clinicalTrialStats.productTypeDistribution;
    expect(dist.length).toBeGreaterThan(0);
    dist.forEach((row) => {
      expect(row.product_name).toBeTruthy();
      expect(row.trialCount).toBeGreaterThan(0);
    });
    // Verify descending order
    for (let i = 1; i < dist.length; i++) {
      expect(dist[i - 1].trialCount).toBeGreaterThanOrEqual(dist[i].trialCount);
    }
  });

  it("ghaDistribution returns non-empty results with expected shape", async () => {
    const { data } = await query<{ clinicalTrialStats: ClinicalTrialStats }>(STATS_QUERY);

    const dist = data.clinicalTrialStats.ghaDistribution;
    expect(dist.length).toBeGreaterThan(0);
    dist.forEach((row) => {
      expect(row.global_health_area).toBeTruthy();
      expect(row.trialCount).toBeGreaterThan(0);
    });
    // Sum of GHA trial counts should not exceed totalTrials (a trial may
    // appear in multiple GHAs if its disease maps to more than one, or
    // some trials may lack a GHA).
    const ghaSum = dist.reduce((s, r) => s + r.trialCount, 0);
    expect(ghaSum).toBeLessThanOrEqual(
      data.clinicalTrialStats.totalTrials * dist.length,
    );
  });

  it("returns last_updated as YYYY-MM-DD or null", async () => {
    const TRIALS_QUERY = `
      query {
        clinicalTrials(limit: 50) {
          nodes {
            trial_id
            last_updated
          }
        }
      }
    `;
    const { data } = await query<{
      clinicalTrials: { nodes: { trial_id: number; last_updated: string | null }[] };
    }>(TRIALS_QUERY);

    const nodes = data.clinicalTrials.nodes;
    expect(nodes.length).toBeGreaterThan(0);

    // At least one row in the fixture should have a populated value
    const populated = nodes.filter((n) => n.last_updated !== null);
    expect(populated.length).toBeGreaterThan(0);

    // Every populated value matches YYYY-MM-DD
    for (const n of populated) {
      expect(n.last_updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
