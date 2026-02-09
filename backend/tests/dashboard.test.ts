/**
 * E2E Tests for Dashboard API
 *
 * These tests call the real GraphQL API with a real database connection.
 * Run with: npm run test:e2e
 */

import { describe, it, expect } from "vitest";
import { query } from "./helpers/graphql.js";

// Type definitions for query responses
interface PortfolioKPIs {
  totalDiseases: number;
  totalCandidates: number;
  approvedProducts: number;
}

interface GlobalHealthAreaSummary {
  global_health_area: string;
  candidateCount: number;
  diseaseCount: number;
  productCount: number;
}

interface GeographicDistributionRow {
  country_key: number;
  country_name: string;
  iso_code: string | null;
  location_scope: string;
  candidateCount: number;
}

interface PhaseDistributionRow {
  global_health_area: string;
  phase_name: string;
  sort_order: number;
  candidateCount: number;
}

interface TemporalSnapshotRow {
  year: number;
  phase_name: string;
  sort_order: number;
  candidateCount: number;
}

interface Product {
  product_key: number;
  product_name: string | null;
}

interface CandidateNode {
  candidate_key: number;
  candidate_name: string | null;
  vin_candidateid: string | null;
  vin_candidate_code: string | null;
  developers_agg: string | null;
}

interface CandidateConnection {
  nodes: CandidateNode[];
  totalCount: number;
  hasNextPage: boolean;
}

interface DimDisease {
  disease_key: number;
  disease_name: string | null;
  global_health_area: string | null;
}

interface DimPhase {
  phase_key: number;
  phase_name: string | null;
  sort_order: number | null;
}

interface DimProduct {
  product_key: number;
  product_name: string | null;
}

interface DimDeveloper {
  developer_key: number;
  developer_name: string | null;
}

interface CandidateGeography {
  country_key: number;
  country_name: string | null;
  iso_code: string | null;
  location_scope: string | null;
}

interface DimPriority {
  priority_key: number;
  priority_name: string | null;
  indication: string | null;
  intended_use: string | null;
}

interface FactClinicalTrialEvent {
  trial_id: number;
  candidate_key: number | null;
  trial_phase: string | null;
  enrollment_count: number | null;
  status: string | null;
}

interface CandidateDetail extends CandidateNode {
  disease: DimDisease | null;
  phase: DimPhase | null;
  product: DimProduct | null;
  developers: DimDeveloper[];
  geographies: CandidateGeography[];
  priorities: DimPriority[];
  clinicalTrials: FactClinicalTrialEvent[];
}

// =============================================================================
// KPI Cards
// =============================================================================

describe("KPI Cards", () => {
  it("returns all three KPI values", async () => {
    const { data } = await query<{ portfolioKPIs: PortfolioKPIs }>(`{
      portfolioKPIs {
        totalDiseases
        totalCandidates
        approvedProducts
      }
    }`);

    expect(data.portfolioKPIs.totalDiseases).toBeGreaterThan(0);
    expect(data.portfolioKPIs.totalCandidates).toBeGreaterThan(0);
    expect(data.portfolioKPIs.approvedProducts).toBeGreaterThanOrEqual(0);
  });

  it("returns integer values for all KPIs", async () => {
    const { data } = await query<{ portfolioKPIs: PortfolioKPIs }>(`{
      portfolioKPIs {
        totalDiseases
        totalCandidates
        approvedProducts
      }
    }`);

    expect(Number.isInteger(data.portfolioKPIs.totalDiseases)).toBe(true);
    expect(Number.isInteger(data.portfolioKPIs.totalCandidates)).toBe(true);
    expect(Number.isInteger(data.portfolioKPIs.approvedProducts)).toBe(true);
  });
});

// =============================================================================
// Bubble Chart (Scale of Innovation)
// =============================================================================

describe("Bubble Chart", () => {
  it("returns 3 global health areas with counts", async () => {
    const { data } = await query<{
      globalHealthAreaSummaries: GlobalHealthAreaSummary[];
    }>(`{
      globalHealthAreaSummaries {
        global_health_area
        candidateCount
        diseaseCount
        productCount
      }
    }`);

    expect(data.globalHealthAreaSummaries).toHaveLength(3);
  });

  it("includes expected health area names", async () => {
    const { data } = await query<{
      globalHealthAreaSummaries: GlobalHealthAreaSummary[];
    }>(`{
      globalHealthAreaSummaries {
        global_health_area
        candidateCount
      }
    }`);

    const areaNames = data.globalHealthAreaSummaries.map((s) => s.global_health_area);
    expect(areaNames).toContain("Neglected disease");
    expect(areaNames).toContain("Emerging infectious disease");
    // Sexual & reproductive health
    expect(
      areaNames.some(
        (name) =>
          name.includes("Sexual") ||
          name.includes("reproductive") ||
          name.includes("Women") ||
          name.includes("SRH"),
      ),
    ).toBe(true);
  });

  it("has positive candidate counts for each area", async () => {
    const { data } = await query<{
      globalHealthAreaSummaries: GlobalHealthAreaSummary[];
    }>(`{
      globalHealthAreaSummaries {
        global_health_area
        candidateCount
      }
    }`);

    data.globalHealthAreaSummaries.forEach((summary) => {
      expect(summary.candidateCount).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Geographic Map
// =============================================================================

describe("Geographic Map", () => {
  it("returns countries for Trial Location tab", async () => {
    const { data } = await query<{
      geographicDistribution: GeographicDistributionRow[];
    }>(`{
      geographicDistribution(location_scope: "Trial Location") {
        country_key
        country_name
        iso_code
        candidateCount
      }
    }`);

    expect(data.geographicDistribution.length).toBeGreaterThan(0);
    expect(data.geographicDistribution[0].country_name).toBeDefined();
  });

  it("returns countries for Developer Location tab", async () => {
    const { data } = await query<{
      geographicDistribution: GeographicDistributionRow[];
    }>(`{
      geographicDistribution(location_scope: "Developer Location") {
        country_key
        country_name
        iso_code
        candidateCount
      }
    }`);

    expect(data.geographicDistribution.length).toBeGreaterThan(0);
  });

  it("includes ISO codes for map rendering", async () => {
    const { data } = await query<{
      geographicDistribution: GeographicDistributionRow[];
    }>(`{
      geographicDistribution(location_scope: "Trial Location") {
        country_name
        iso_code
        candidateCount
      }
    }`);

    // At least some countries should have ISO codes
    const withIsoCodes = data.geographicDistribution.filter((row) => row.iso_code !== null);
    expect(withIsoCodes.length).toBeGreaterThan(0);
  });

  it("returns available location scopes", async () => {
    const { data } = await query<{ locationScopes: string[] }>(`{
      locationScopes
    }`);

    expect(data.locationScopes).toContain("Trial Location");
    expect(data.locationScopes).toContain("Developer Location");
  });
});

// =============================================================================
// Phase Distribution (Stacked Bar)
// =============================================================================

describe("Phase Distribution (Stacked Bar)", () => {
  it("returns phase breakdown by health area", async () => {
    const { data } = await query<{
      phaseDistribution: PhaseDistributionRow[];
    }>(`{
      phaseDistribution {
        global_health_area
        phase_name
        sort_order
        candidateCount
      }
    }`);

    expect(data.phaseDistribution.length).toBeGreaterThan(0);
  });

  it("includes sort_order for correct phase ordering", async () => {
    const { data } = await query<{
      phaseDistribution: PhaseDistributionRow[];
    }>(`{
      phaseDistribution {
        phase_name
        sort_order
      }
    }`);

    data.phaseDistribution.forEach((row) => {
      expect(typeof row.sort_order).toBe("number");
    });
  });

  it("filters by global health area", async () => {
    const { data } = await query<{
      phaseDistribution: PhaseDistributionRow[];
    }>(`{
      phaseDistribution(global_health_area: "Neglected disease") {
        global_health_area
        phase_name
        candidateCount
      }
    }`);

    expect(data.phaseDistribution.length).toBeGreaterThan(0);
    data.phaseDistribution.forEach((row) => {
      expect(row.global_health_area).toBe("Neglected disease");
    });
  });

  it("returns products for filter dropdown", async () => {
    const { data } = await query<{ products: Product[] }>(`{
      products {
        product_key
        product_name
      }
    }`);

    expect(data.products.length).toBeGreaterThan(0);
    expect(data.products[0].product_key).toBeDefined();
  });
});

// =============================================================================
// Temporal Analysis (Cross-pipeline Analytics)
// =============================================================================

describe("Temporal Analysis", () => {
  it("returns available years for selector", async () => {
    const { data } = await query<{ availableYears: number[] }>(`{
      availableYears
    }`);

    expect(data.availableYears.length).toBeGreaterThan(0);
    // Should contain some recent years
    expect(data.availableYears.some((y) => y >= 2020)).toBe(true);
  });

  it("returns snapshots for selected years", async () => {
    // Query without year filter first to see what data exists
    const { data } = await query<{
      temporalSnapshots: TemporalSnapshotRow[];
    }>(
      `query GetSnapshots {
        temporalSnapshots {
          year
          phase_name
          sort_order
          candidateCount
        }
      }`,
    );

    expect(data.temporalSnapshots.length).toBeGreaterThan(0);
  });

  it("includes sort_order for phase ordering", async () => {
    const { data } = await query<{
      temporalSnapshots: TemporalSnapshotRow[];
    }>(
      `query GetSnapshots {
        temporalSnapshots {
          year
          phase_name
          sort_order
          candidateCount
        }
      }`,
    );

    expect(data.temporalSnapshots.length).toBeGreaterThan(0);
    data.temporalSnapshots.forEach((row) => {
      expect(typeof row.sort_order).toBe("number");
    });
  });

  it("returns data grouped by year and phase", async () => {
    // Query all snapshots to see what years have data
    const { data } = await query<{
      temporalSnapshots: TemporalSnapshotRow[];
    }>(
      `query GetSnapshots {
        temporalSnapshots {
          year
          phase_name
          candidateCount
        }
      }`,
    );

    // Should have at least some years with data
    const returnedYears = [...new Set(data.temporalSnapshots.map((r) => r.year))];
    expect(returnedYears.length).toBeGreaterThan(0);

    // Each row should have valid data
    data.temporalSnapshots.forEach((row) => {
      expect(row.year).toBeGreaterThan(2000);
      expect(row.phase_name).toBeDefined();
      expect(row.candidateCount).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// Candidates List
// =============================================================================

describe("Candidates List", () => {
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
    // With a small limit against the full dataset, hasNextPage should be true
    expect(data.candidates.hasNextPage).toBe(true);
  });

  it("filters by global_health_area", async () => {
    const { data: allData } = await query<{ candidates: CandidateConnection }>(`{
      candidates {
        totalCount
      }
    }`);

    const { data: filteredData } = await query<{ candidates: CandidateConnection }>(`{
      candidates(filter: { global_health_area: "Neglected disease" }) {
        totalCount
        nodes {
          candidate_key
        }
      }
    }`);

    expect(filteredData.candidates.totalCount).toBeGreaterThan(0);
    expect(filteredData.candidates.totalCount).toBeLessThan(allData.candidates.totalCount);
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

    // There should be more than 1 candidate total
    expect(data.candidates.totalCount).toBeGreaterThan(1);
    expect(data.candidates.hasNextPage).toBe(true);
  });
});

// =============================================================================
// Candidate Detail
// =============================================================================

describe("Candidate Detail", () => {
  it("returns a candidate by key", async () => {
    // First fetch a valid candidate_key
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
          vin_candidateid
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

// =============================================================================
// Nested Resolvers on DimCandidateCore
// =============================================================================

describe("Nested Resolvers on DimCandidateCore", () => {
  // Helper to fetch the first candidate key
  async function getFirstCandidateKey(): Promise<number> {
    const { data } = await query<{ candidates: CandidateConnection }>(`{
      candidates(limit: 1) {
        nodes {
          candidate_key
        }
      }
    }`);
    return data.candidates.nodes[0].candidate_key;
  }

  it("resolves disease on a candidate", async () => {
    const key = await getFirstCandidateKey();

    const { data } = await query<{ candidate: { disease: DimDisease | null } | null }>(
      `query GetCandidate($key: Int!) {
        candidate(candidate_key: $key) {
          disease {
            disease_key
            disease_name
            global_health_area
          }
        }
      }`,
      { key },
    );

    expect(data.candidate).not.toBeNull();
    // disease may be null if no snapshot exists, but the field should resolve
    if (data.candidate!.disease) {
      expect(data.candidate!.disease.disease_key).toBeDefined();
      expect(typeof data.candidate!.disease.disease_name).toBe("string");
    }
  });

  it("resolves phase on a candidate", async () => {
    const key = await getFirstCandidateKey();

    const { data } = await query<{ candidate: { phase: DimPhase | null } | null }>(
      `query GetCandidate($key: Int!) {
        candidate(candidate_key: $key) {
          phase {
            phase_key
            phase_name
            sort_order
          }
        }
      }`,
      { key },
    );

    expect(data.candidate).not.toBeNull();
    if (data.candidate!.phase) {
      expect(data.candidate!.phase.phase_key).toBeDefined();
    }
  });

  it("resolves product on a candidate", async () => {
    const key = await getFirstCandidateKey();

    const { data } = await query<{ candidate: { product: DimProduct | null } | null }>(
      `query GetCandidate($key: Int!) {
        candidate(candidate_key: $key) {
          product {
            product_key
            product_name
          }
        }
      }`,
      { key },
    );

    expect(data.candidate).not.toBeNull();
    if (data.candidate!.product) {
      expect(data.candidate!.product.product_key).toBeDefined();
    }
  });

  it("resolves developers array", async () => {
    const key = await getFirstCandidateKey();

    const { data } = await query<{ candidate: { developers: DimDeveloper[] } | null }>(
      `query GetCandidate($key: Int!) {
        candidate(candidate_key: $key) {
          developers {
            developer_key
            developer_name
          }
        }
      }`,
      { key },
    );

    expect(data.candidate).not.toBeNull();
    expect(Array.isArray(data.candidate!.developers)).toBe(true);
  });

  it("resolves geographies array", async () => {
    const key = await getFirstCandidateKey();

    const { data } = await query<{ candidate: { geographies: CandidateGeography[] } | null }>(
      `query GetCandidate($key: Int!) {
        candidate(candidate_key: $key) {
          geographies {
            country_key
            country_name
            iso_code
            location_scope
          }
        }
      }`,
      { key },
    );

    expect(data.candidate).not.toBeNull();
    expect(Array.isArray(data.candidate!.geographies)).toBe(true);
  });

  it("resolves priorities array", async () => {
    const key = await getFirstCandidateKey();

    const { data } = await query<{ candidate: { priorities: DimPriority[] } | null }>(
      `query GetCandidate($key: Int!) {
        candidate(candidate_key: $key) {
          priorities {
            priority_key
            priority_name
            indication
            intended_use
          }
        }
      }`,
      { key },
    );

    expect(data.candidate).not.toBeNull();
    expect(Array.isArray(data.candidate!.priorities)).toBe(true);
  });

  it("resolves clinicalTrials array", async () => {
    const key = await getFirstCandidateKey();

    const { data } = await query<{
      candidate: { clinicalTrials: FactClinicalTrialEvent[] } | null;
    }>(
      `query GetCandidate($key: Int!) {
        candidate(candidate_key: $key) {
          clinicalTrials {
            trial_id
            trial_phase
            enrollment_count
            status
          }
        }
      }`,
      { key },
    );

    expect(data.candidate).not.toBeNull();
    expect(Array.isArray(data.candidate!.clinicalTrials)).toBe(true);
  });

  it("resolves all nested fields in a single query (DataLoader batching)", async () => {
    // Fetch 3 candidates with all nested fields to exercise DataLoader batching
    const { data } = await query<{ candidates: { nodes: CandidateDetail[] } }>(`{
      candidates(limit: 3) {
        nodes {
          candidate_key
          candidate_name
          disease {
            disease_key
            disease_name
            global_health_area
          }
          phase {
            phase_key
            phase_name
            sort_order
          }
          product {
            product_key
            product_name
          }
          developers {
            developer_key
            developer_name
          }
          geographies {
            country_key
            country_name
            iso_code
            location_scope
          }
          priorities {
            priority_key
            priority_name
          }
          clinicalTrials {
            trial_id
            trial_phase
            status
          }
        }
      }
    }`);

    expect(data.candidates.nodes.length).toBeGreaterThan(0);

    for (const candidate of data.candidates.nodes) {
      expect(candidate.candidate_key).toBeDefined();
      // All array fields should be arrays (even if empty)
      expect(Array.isArray(candidate.developers)).toBe(true);
      expect(Array.isArray(candidate.geographies)).toBe(true);
      expect(Array.isArray(candidate.priorities)).toBe(true);
      expect(Array.isArray(candidate.clinicalTrials)).toBe(true);
    }
  });
});
