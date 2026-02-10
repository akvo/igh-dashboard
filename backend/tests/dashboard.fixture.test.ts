/**
 * Fixture-based Tests for Dashboard API
 *
 * These tests use mocked database calls with captured fixtures.
 * They can run without a database connection.
 * Run with: npm run test
 */

import { describe, it, expect, vi, beforeAll } from "vitest";
import { ApolloServer } from "@apollo/server";
import { typeDefs } from "../src/schema/typeDefs.js";
import {
  fixtures,
  type PortfolioKPIsFixture,
  type GlobalHealthAreaSummariesFixture,
  type GeographicDistributionFixture,
  type PhaseDistributionFixture,
  type TemporalSnapshotsFixture,
} from "./fixtures/index.js";

// Mock all database query modules BEFORE importing resolvers
vi.mock("../src/db/queries/kpis.js", () => ({
  getPortfolioKPIs: vi.fn(() => fixtures.portfolioKPIs.portfolioKPIs),
}));

vi.mock("../src/db/queries/globalHealthArea.js", () => ({
  getGlobalHealthAreaSummaries: vi.fn(
    () => fixtures.globalHealthAreaSummaries.globalHealthAreaSummaries,
  ),
}));

vi.mock("../src/db/queries/geographic.js", () => ({
  getGeographicDistribution: vi.fn((scope: string) =>
    scope === "Trial Location"
      ? fixtures.geographicDistributionTrials.geographicDistribution
      : fixtures.geographicDistributionDev.geographicDistribution,
  ),
  getLocationScopes: vi.fn(() => fixtures.filterOptions.locationScopes),
}));

vi.mock("../src/db/queries/phaseDistribution.js", () => ({
  getPhaseDistribution: vi.fn((filters?: { global_health_area?: string; product_key?: number }) => {
    if (filters?.global_health_area === "Neglected disease") {
      return fixtures.phaseDistributionFiltered.phaseDistribution;
    }
    return fixtures.phaseDistribution.phaseDistribution;
  }),
}));

vi.mock("../src/db/queries/temporal.js", () => ({
  getTemporalSnapshots: vi.fn(() => fixtures.temporalSnapshots.temporalSnapshots),
  getAvailableYears: vi.fn(() => fixtures.filterOptions.availableYears),
}));

vi.mock("../src/db/queries/lookups.js", () => ({
  getDiseases: vi.fn(() => []),
  getPhases: vi.fn(() => []),
  getProducts: vi.fn(() => fixtures.filterOptions.products),
  getCountries: vi.fn(() => []),
  getDiseaseByKey: vi.fn(() => null),
  getPhaseByKey: vi.fn(() => null),
  getProductByKey: vi.fn(() => null),
  getDevelopersByCandidateKey: vi.fn(() => []),
  getPrioritiesByCandidateKey: vi.fn(() => []),
  getGeographiesByCandidateKey: vi.fn(() => []),
  getClinicalTrialsByCandidateKey: vi.fn(() => []),
}));

vi.mock("../src/db/queries/candidates.js", () => ({
  getCandidates: vi.fn(() => ({ nodes: [], totalCount: 0, hasNextPage: false })),
  getCandidateByKey: vi.fn(() => null),
  getCandidateSnapshot: vi.fn(() => null),
}));

// Now import resolvers (after mocks are set up)
import { resolvers } from "../src/schema/resolvers.js";

// Create a test server
let server: ApolloServer;

beforeAll(() => {
  server = new ApolloServer({
    typeDefs,
    resolvers,
  });
});

async function query<T = unknown>(
  queryString: string,
  variables?: Record<string, unknown>,
): Promise<{ data: T; errors?: Array<{ message: string }> }> {
  const response = await server.executeOperation(
    {
      query: queryString,
      variables,
    },
    {
      contextValue: {
        loaders: {
          diseaseLoader: { load: vi.fn() },
          phaseLoader: { load: vi.fn() },
          productLoader: { load: vi.fn() },
          developersByCandidateLoader: { load: vi.fn(() => []) },
          prioritiesByCandidateLoader: { load: vi.fn(() => []) },
          geographiesByCandidateLoader: { load: vi.fn(() => []) },
          clinicalTrialsByCandidateLoader: { load: vi.fn(() => []) },
          snapshotByCandidateLoader: { load: vi.fn(() => null) },
        },
      },
    },
  );

  if (response.body.kind === "single") {
    return {
      data: response.body.singleResult.data as T,
      errors: response.body.singleResult.errors as Array<{ message: string }> | undefined,
    };
  }

  throw new Error("Unexpected incremental response");
}

// =============================================================================
// KPI Cards
// =============================================================================

describe("KPI Cards (Fixtures)", () => {
  it("returns all three KPI values", async () => {
    const { data } = await query<PortfolioKPIsFixture>(`{
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
    const { data } = await query<PortfolioKPIsFixture>(`{
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

describe("Bubble Chart (Fixtures)", () => {
  it("returns 3 global health areas with counts", async () => {
    const { data } = await query<GlobalHealthAreaSummariesFixture>(`{
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
    const { data } = await query<GlobalHealthAreaSummariesFixture>(`{
      globalHealthAreaSummaries {
        global_health_area
        candidateCount
      }
    }`);

    const areaNames = data.globalHealthAreaSummaries.map((s) => s.global_health_area);
    expect(areaNames).toContain("Neglected disease");
    expect(areaNames).toContain("Emerging infectious disease");
  });

  it("has positive candidate counts for each area", async () => {
    const { data } = await query<GlobalHealthAreaSummariesFixture>(`{
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

describe("Geographic Map (Fixtures)", () => {
  it("returns countries for Trial Location tab", async () => {
    const { data } = await query<GeographicDistributionFixture>(`{
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
    const { data } = await query<GeographicDistributionFixture>(`{
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
    const { data } = await query<GeographicDistributionFixture>(`{
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

describe("Phase Distribution (Fixtures)", () => {
  it("returns phase breakdown by health area", async () => {
    const { data } = await query<PhaseDistributionFixture>(`{
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
    const { data } = await query<PhaseDistributionFixture>(`{
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
    const { data } = await query<PhaseDistributionFixture>(`{
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
    const { data } = await query<{
      products: Array<{ product_key: number; product_name: string | null }>;
    }>(`{
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

describe("Temporal Analysis (Fixtures)", () => {
  it("returns available years for selector", async () => {
    const { data } = await query<{ availableYears: number[] }>(`{
      availableYears
    }`);

    expect(data.availableYears.length).toBeGreaterThan(0);
  });

  it("returns snapshots with year and phase data", async () => {
    const { data } = await query<TemporalSnapshotsFixture>(
      `query GetSnapshots($years: [Int!]) {
        temporalSnapshots(years: $years) {
          year
          phase_name
          sort_order
          candidateCount
        }
      }`,
      { years: [2024] },
    );

    expect(data.temporalSnapshots.length).toBeGreaterThan(0);
  });

  it("includes sort_order for phase ordering", async () => {
    const { data } = await query<TemporalSnapshotsFixture>(
      `query GetSnapshots($years: [Int!]) {
        temporalSnapshots(years: $years) {
          year
          phase_name
          sort_order
          candidateCount
        }
      }`,
      { years: [2024] },
    );

    data.temporalSnapshots.forEach((row) => {
      expect(typeof row.sort_order).toBe("number");
    });
  });
});
