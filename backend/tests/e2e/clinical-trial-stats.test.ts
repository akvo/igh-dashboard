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

interface ClinicalTrialStats {
  totalTrials: number;
  statusDistribution: ClinicalTrialStatusRow[];
  ageGroupDistribution: AgeGroupDistributionRow[];
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
  }
}`;

describe("Clinical Trial Stats", () => {
  it("totalTrials equals the Active count from statusDistribution", async () => {
    const { data } = await query<{ clinicalTrialStats: ClinicalTrialStats }>(STATS_QUERY);

    const activeRow = data.clinicalTrialStats.statusDistribution.find(
      (r) => r.status === "Active",
    );
    expect(activeRow).toBeDefined();
    expect(data.clinicalTrialStats.totalTrials).toBe(activeRow!.trialCount);
  });

  it("statusDistribution includes multiple statuses (not just Active)", async () => {
    const { data } = await query<{ clinicalTrialStats: ClinicalTrialStats }>(STATS_QUERY);

    const statuses = data.clinicalTrialStats.statusDistribution.map((r) => r.status);
    expect(statuses).toContain("Active");
    expect(statuses).toContain("Completed");
    expect(statuses.length).toBeGreaterThan(2);
  });

  it("totalTrials is less than the sum of all statusDistribution counts", async () => {
    const { data } = await query<{ clinicalTrialStats: ClinicalTrialStats }>(STATS_QUERY);

    const totalAllStatuses = data.clinicalTrialStats.statusDistribution.reduce(
      (sum, r) => sum + r.trialCount,
      0,
    );
    expect(data.clinicalTrialStats.totalTrials).toBeLessThan(totalAllStatuses);
  });

  it("ageGroupDistribution returns non-empty results", async () => {
    const { data } = await query<{ clinicalTrialStats: ClinicalTrialStats }>(STATS_QUERY);

    expect(data.clinicalTrialStats.ageGroupDistribution.length).toBeGreaterThan(0);
    data.clinicalTrialStats.ageGroupDistribution.forEach((row) => {
      expect(row.candidateCount).toBeGreaterThan(0);
    });
  });
});
