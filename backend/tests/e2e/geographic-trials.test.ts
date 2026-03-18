/**
 * E2E Tests — Geographic map: Trial Location scope counts trials (not candidates),
 * and the clinical trials table respects multi-status filtering.
 */

import { describe, it, expect } from "vitest";
import { query } from "../helpers/graphql.js";

interface GeographicDistributionRow {
  country_key: number;
  country_name: string;
  iso_code: string | null;
  candidateCount: number;
}

interface ClinicalTrialNode {
  trial_id: number;
  status: string | null;
}

interface ClinicalTrialConnection {
  nodes: ClinicalTrialNode[];
  totalCount: number;
}

const MAP_QUERY = `
  query TrialMap($scope: String!, $statuses: [String!], $gha: [String!], $diseases: [String!]) {
    geographicDistribution(location_scope: $scope, statuses: $statuses, global_health_areas: $gha, disease_names: $diseases) {
      country_key
      country_name
      iso_code
      candidateCount
    }
  }
`;

const TRIALS_QUERY = `
  query Trials($filter: ClinicalTrialFilter, $limit: Int) {
    clinicalTrials(filter: $filter, limit: $limit) {
      nodes { trial_id status }
      totalCount
    }
  }
`;

describe("Trial Location map — counts trials not candidates", () => {
  it("returns trial counts for Trial Location scope", async () => {
    const { data } = await query<{
      geographicDistribution: GeographicDistributionRow[];
    }>(MAP_QUERY, { scope: "Trial Location" });

    expect(data.geographicDistribution.length).toBeGreaterThan(0);
    // candidateCount should be positive integers
    data.geographicDistribution.forEach((row) => {
      expect(row.candidateCount).toBeGreaterThan(0);
    });
  });

  it("status filter reduces trial counts on the map", async () => {
    const { data: allData } = await query<{
      geographicDistribution: GeographicDistributionRow[];
    }>(MAP_QUERY, { scope: "Trial Location" });

    const { data: filteredData } = await query<{
      geographicDistribution: GeographicDistributionRow[];
    }>(MAP_QUERY, { scope: "Trial Location", statuses: ["Active"] });

    const allTotal = allData.geographicDistribution.reduce((s, r) => s + r.candidateCount, 0);
    const filteredTotal = filteredData.geographicDistribution.reduce(
      (s, r) => s + r.candidateCount,
      0,
    );

    expect(filteredTotal).toBeGreaterThan(0);
    expect(filteredTotal).toBeLessThanOrEqual(allTotal);
  });
});

describe("Clinical trials table — multi-status filter", () => {
  it("filters by a single status via statuses array", async () => {
    const { data } = await query<{
      clinicalTrials: ClinicalTrialConnection;
    }>(TRIALS_QUERY, {
      filter: { statuses: ["Active"] },
      limit: 5,
    });

    expect(data.clinicalTrials.totalCount).toBeGreaterThan(0);
    data.clinicalTrials.nodes.forEach((trial) => {
      expect(trial.status).toBe("Active");
    });
  });

  it("filters by multiple statuses", async () => {
    const { data: activeData } = await query<{
      clinicalTrials: ClinicalTrialConnection;
    }>(TRIALS_QUERY, {
      filter: { statuses: ["Active"] },
      limit: 1,
    });

    const { data: completedData } = await query<{
      clinicalTrials: ClinicalTrialConnection;
    }>(TRIALS_QUERY, {
      filter: { statuses: ["Completed"] },
      limit: 1,
    });

    const { data: bothData } = await query<{
      clinicalTrials: ClinicalTrialConnection;
    }>(TRIALS_QUERY, {
      filter: { statuses: ["Active", "Completed"] },
      limit: 1,
    });

    // Combined count should equal sum of individual counts
    expect(bothData.clinicalTrials.totalCount).toBe(
      activeData.clinicalTrials.totalCount + completedData.clinicalTrials.totalCount,
    );
  });

  it("returns all trials when no status filter is provided", async () => {
    const { data: noFilter } = await query<{
      clinicalTrials: ClinicalTrialConnection;
    }>(TRIALS_QUERY, { limit: 1 });

    const { data: activeOnly } = await query<{
      clinicalTrials: ClinicalTrialConnection;
    }>(TRIALS_QUERY, {
      filter: { statuses: ["Active"] },
      limit: 1,
    });

    expect(noFilter.clinicalTrials.totalCount).toBeGreaterThan(
      activeOnly.clinicalTrials.totalCount,
    );
  });
});
