/**
 * E2E Tests — Dashboard charts, map, and lookup queries.
 */

import { describe, it, expect } from "vitest";
import { query } from "../helpers/graphql.js";
import type {
  PortfolioKPIs,
  GlobalHealthAreaSummary,
  GeographicDistributionRow,
  PhaseDistributionRow,
  Product,
} from "../helpers/types.js";

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

describe("Phase Distribution", () => {
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
});

describe("Phase Distribution — filters", () => {
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

  it("filters by product_key", async () => {
    const { data: lookupData } = await query<{
      products: Array<{ product_key: number }>;
    }>(`{ products { product_key } }`);

    expect(lookupData.products.length).toBeGreaterThan(0);
    const productKey = lookupData.products[0].product_key;

    const { data } = await query<{
      phaseDistribution: PhaseDistributionRow[];
    }>(
      `query ($productKey: Int) {
        phaseDistribution(product_key: $productKey) {
          global_health_area
          phase_name
          sort_order
          candidateCount
        }
      }`,
      { productKey },
    );

    expect(Array.isArray(data.phaseDistribution)).toBe(true);
  });
});

describe("Lookup Queries", () => {
  it("diseases returns non-empty array", async () => {
    const { data } = await query<{
      diseases: Array<{ disease_key: number; disease_name: string | null }>;
    }>(`{
      diseases {
        disease_key
        disease_name
      }
    }`);

    expect(data.diseases.length).toBeGreaterThan(0);
    expect(data.diseases[0].disease_key).toBeDefined();
  });

  it("phases returns non-empty array", async () => {
    const { data } = await query<{
      phases: Array<{ phase_key: number; phase_name: string | null }>;
    }>(`{
      phases {
        phase_key
        phase_name
      }
    }`);

    expect(data.phases.length).toBeGreaterThan(0);
    expect(data.phases[0].phase_key).toBeDefined();
  });

  it("countries returns non-empty array", async () => {
    const { data } = await query<{
      countries: Array<{ country_key: number; country_name: string | null }>;
    }>(`{
      countries {
        country_key
        country_name
      }
    }`);

    expect(data.countries.length).toBeGreaterThan(0);
    expect(data.countries[0].country_key).toBeDefined();
  });
});
