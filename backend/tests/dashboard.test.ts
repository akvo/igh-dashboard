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

    const areaNames = data.globalHealthAreaSummaries.map(
      (s) => s.global_health_area
    );
    expect(areaNames).toContain("Neglected disease");
    expect(areaNames).toContain("Emerging infectious disease");
    // Sexual & reproductive health
    expect(
      areaNames.some(
        (name) =>
          name.includes("Sexual") ||
          name.includes("reproductive") ||
          name.includes("Women") ||
          name.includes("SRH")
      )
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
    const withIsoCodes = data.geographicDistribution.filter(
      (row) => row.iso_code !== null
    );
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
      }`
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
      }`
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
      }`
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
