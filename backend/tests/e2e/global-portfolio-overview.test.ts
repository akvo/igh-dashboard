/**
 * E2E Tests — Dashboard charts, map, and lookup queries.
 */

import { describe, it, expect } from "vitest";
import { query } from "../helpers/graphql.js";
import type {
  PortfolioKPIs,
  GlobalHealthAreaSummary,
  GhaProductTypeSummary,
  DiseaseSummary,
  DiseaseProductTypeSummary,
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
    expect(data.portfolioKPIs.approvedProducts).toBeGreaterThan(0);
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

  it("totalDiseases counts hierarchy leaves (childless primaries + sub-diseases)", async () => {
    const { data } = await query<{ portfolioKPIs: PortfolioKPIs }>(`{
      portfolioKPIs { totalDiseases }
    }`);
    // Locks the leaf-count semantic. Bounds chosen so:
    //   - > 50: catches a regression to primary-only (~42).
    //   - < 80: catches a regression to a UNION of both columns
    //     (~81), which would over-count parented primaries.
    expect(data.portfolioKPIs.totalDiseases).toBeGreaterThan(50);
    expect(data.portfolioKPIs.totalDiseases).toBeLessThan(80);
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

  it("filters by candidate_types=['Candidate']", async () => {
    const { data: allData } = await query<{
      globalHealthAreaSummaries: GlobalHealthAreaSummary[];
    }>(`{
      globalHealthAreaSummaries {
        global_health_area
        candidateCount
        productCount
      }
    }`);

    const { data } = await query<{
      globalHealthAreaSummaries: GlobalHealthAreaSummary[];
    }>(
      `query ($candidateTypes: [String!]) {
        globalHealthAreaSummaries(candidate_types: $candidateTypes) {
          global_health_area
          candidateCount
          productCount
        }
      }`,
      { candidateTypes: ["Candidate"] },
    );

    expect(data.globalHealthAreaSummaries.length).toBeGreaterThan(0);
    const filteredTotal = data.globalHealthAreaSummaries.reduce(
      (sum, r) => sum + r.candidateCount + r.productCount,
      0,
    );
    const unfilteredTotal = allData.globalHealthAreaSummaries.reduce(
      (sum, r) => sum + r.candidateCount + r.productCount,
      0,
    );
    // Filtering to Candidates only drops productCount to 0, reducing the total
    expect(filteredTotal).toBeGreaterThan(0);
    expect(filteredTotal).toBeLessThan(unfilteredTotal);
    const filteredProducts = data.globalHealthAreaSummaries.reduce(
      (sum, r) => sum + r.productCount,
      0,
    );
    expect(filteredProducts).toBe(0);
  });

  it("filters by candidate_types=['Product']", async () => {
    const { data: allData } = await query<{
      globalHealthAreaSummaries: GlobalHealthAreaSummary[];
    }>(`{
      globalHealthAreaSummaries {
        global_health_area
        candidateCount
        productCount
      }
    }`);

    const { data } = await query<{
      globalHealthAreaSummaries: GlobalHealthAreaSummary[];
    }>(
      `query ($candidateTypes: [String!]) {
        globalHealthAreaSummaries(candidate_types: $candidateTypes) {
          global_health_area
          candidateCount
          productCount
        }
      }`,
      { candidateTypes: ["Product"] },
    );

    expect(data.globalHealthAreaSummaries.length).toBeGreaterThan(0);
    const filteredTotal = data.globalHealthAreaSummaries.reduce(
      (sum, r) => sum + r.candidateCount + r.productCount,
      0,
    );
    const unfilteredTotal = allData.globalHealthAreaSummaries.reduce(
      (sum, r) => sum + r.candidateCount + r.productCount,
      0,
    );
    // Filtering to Products only drops candidateCount to 0, reducing the total
    expect(filteredTotal).toBeGreaterThan(0);
    expect(filteredTotal).toBeLessThan(unfilteredTotal);
    const filteredCandidates = data.globalHealthAreaSummaries.reduce(
      (sum, r) => sum + r.candidateCount,
      0,
    );
    expect(filteredCandidates).toBe(0);
  });

  it("both types combined closely matches unfiltered baseline", async () => {
    const { data: allData } = await query<{
      globalHealthAreaSummaries: GlobalHealthAreaSummary[];
    }>(`{
      globalHealthAreaSummaries {
        global_health_area
        candidateCount
        productCount
      }
    }`);

    const { data: bothData } = await query<{
      globalHealthAreaSummaries: GlobalHealthAreaSummary[];
    }>(
      `query ($candidateTypes: [String!]) {
        globalHealthAreaSummaries(candidate_types: $candidateTypes) {
          global_health_area
          candidateCount
          productCount
        }
      }`,
      { candidateTypes: ["Candidate", "Product"] },
    );

    const unfilteredTotal = allData.globalHealthAreaSummaries.reduce(
      (sum, r) => sum + r.candidateCount + r.productCount,
      0,
    );
    const bothTotal = bothData.globalHealthAreaSummaries.reduce(
      (sum, r) => sum + r.candidateCount + r.productCount,
      0,
    );

    expect(bothData.globalHealthAreaSummaries.length).toBe(
      allData.globalHealthAreaSummaries.length,
    );
    expect(bothTotal).toBeLessThanOrEqual(unfilteredTotal);
    expect(bothTotal).toBeGreaterThan(unfilteredTotal * 0.95);
  });
});

describe("Bubble Chart — GHA × Product Type view", () => {
  it("returns rows with a product_type and counts per (area, product_type) bucket", async () => {
    const { data } = await query<{
      ghaProductTypeSummaries: GhaProductTypeSummary[];
    }>(`{
      ghaProductTypeSummaries {
        global_health_area
        product_type
        candidateCount
        productCount
      }
    }`);

    expect(data.ghaProductTypeSummaries.length).toBeGreaterThan(0);
    // More rows than the 3-row GHA-only view because we split each area by product type.
    expect(data.ghaProductTypeSummaries.length).toBeGreaterThan(3);
    const first = data.ghaProductTypeSummaries[0];
    expect(typeof first.global_health_area).toBe("string");
    expect(typeof first.product_type).toBe("string");
    expect(first.product_type.length).toBeGreaterThan(0);
    // Every row should have at least one candidate or product counted.
    data.ghaProductTypeSummaries.forEach((row) => {
      expect(row.candidateCount + row.productCount).toBeGreaterThan(0);
    });
  });

  it("filters by candidate_types=['Candidate'] — zeroes productCount", async () => {
    const { data } = await query<{
      ghaProductTypeSummaries: GhaProductTypeSummary[];
    }>(
      `query ($candidateTypes: [String!]) {
        ghaProductTypeSummaries(candidate_types: $candidateTypes) {
          global_health_area
          product_type
          candidateCount
          productCount
        }
      }`,
      { candidateTypes: ["Candidate"] },
    );

    expect(data.ghaProductTypeSummaries.length).toBeGreaterThan(0);
    const totalProducts = data.ghaProductTypeSummaries.reduce((s, r) => s + r.productCount, 0);
    const totalCandidates = data.ghaProductTypeSummaries.reduce((s, r) => s + r.candidateCount, 0);
    expect(totalProducts).toBe(0);
    expect(totalCandidates).toBeGreaterThan(0);
  });

  it("filters by candidate_types=['Product'] — zeroes candidateCount", async () => {
    const { data } = await query<{
      ghaProductTypeSummaries: GhaProductTypeSummary[];
    }>(
      `query ($candidateTypes: [String!]) {
        ghaProductTypeSummaries(candidate_types: $candidateTypes) {
          global_health_area
          product_type
          candidateCount
          productCount
        }
      }`,
      { candidateTypes: ["Product"] },
    );

    expect(data.ghaProductTypeSummaries.length).toBeGreaterThan(0);
    const totalCandidates = data.ghaProductTypeSummaries.reduce((s, r) => s + r.candidateCount, 0);
    const totalProducts = data.ghaProductTypeSummaries.reduce((s, r) => s + r.productCount, 0);
    expect(totalCandidates).toBe(0);
    expect(totalProducts).toBeGreaterThan(0);
  });
});

describe("Bubble Chart — Disease view", () => {
  it("returns a row per disease_group_name with counts and GHA", async () => {
    const { data } = await query<{
      diseaseSummaries: DiseaseSummary[];
    }>(`{
      diseaseSummaries {
        disease_group_name
        global_health_area
        candidateCount
        productCount
      }
    }`);

    expect(data.diseaseSummaries.length).toBeGreaterThan(0);
    data.diseaseSummaries.forEach((row) => {
      expect(typeof row.disease_group_name).toBe("string");
      expect(typeof row.global_health_area).toBe("string");
      expect(row.candidateCount + row.productCount).toBeGreaterThan(0);
    });

    // Each disease_group_name should be unique within the list (the grouping).
    const groupNames = data.diseaseSummaries.map((r) => r.disease_group_name);
    expect(new Set(groupNames).size).toBe(groupNames.length);
  });

  it("filters by candidate_types=['Candidate'] — zeroes productCount", async () => {
    const { data } = await query<{
      diseaseSummaries: DiseaseSummary[];
    }>(
      `query ($candidateTypes: [String!]) {
        diseaseSummaries(candidate_types: $candidateTypes) {
          disease_group_name
          candidateCount
          productCount
        }
      }`,
      { candidateTypes: ["Candidate"] },
    );

    expect(data.diseaseSummaries.length).toBeGreaterThan(0);
    const totalProducts = data.diseaseSummaries.reduce((s, r) => s + r.productCount, 0);
    expect(totalProducts).toBe(0);
  });

  it("filters by candidate_types=['Product'] — zeroes candidateCount", async () => {
    const { data } = await query<{
      diseaseSummaries: DiseaseSummary[];
    }>(
      `query ($candidateTypes: [String!]) {
        diseaseSummaries(candidate_types: $candidateTypes) {
          disease_group_name
          candidateCount
          productCount
        }
      }`,
      { candidateTypes: ["Product"] },
    );

    expect(data.diseaseSummaries.length).toBeGreaterThan(0);
    const totalCandidates = data.diseaseSummaries.reduce((s, r) => s + r.candidateCount, 0);
    expect(totalCandidates).toBe(0);
  });
});

describe("Bubble Chart — Disease × Product Type view", () => {
  it("returns one row per (disease, product_type) bucket", async () => {
    const { data } = await query<{
      diseaseProductTypeSummaries: DiseaseProductTypeSummary[];
    }>(`{
      diseaseProductTypeSummaries {
        disease_group_name
        global_health_area
        product_type
        candidateCount
        productCount
      }
    }`);

    expect(data.diseaseProductTypeSummaries.length).toBeGreaterThan(0);
    data.diseaseProductTypeSummaries.forEach((row) => {
      expect(typeof row.disease_group_name).toBe("string");
      expect(typeof row.product_type).toBe("string");
      expect(row.candidateCount + row.productCount).toBeGreaterThan(0);
    });

    // Every (disease_group_name, product_type) pair should appear at most once.
    const keys = data.diseaseProductTypeSummaries.map(
      (r) => `${r.disease_group_name}|${r.product_type}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("expands over the Disease-only view — never fewer rows", async () => {
    const { data: dxp } = await query<{
      diseaseProductTypeSummaries: DiseaseProductTypeSummary[];
    }>(`{
      diseaseProductTypeSummaries { disease_group_name product_type }
    }`);
    const { data: diseaseOnly } = await query<{
      diseaseSummaries: DiseaseSummary[];
    }>(`{
      diseaseSummaries { disease_group_name }
    }`);

    // Each disease can fan out into multiple product types, so (disease × type)
    // must have at least as many rows as disease-only.
    expect(dxp.diseaseProductTypeSummaries.length).toBeGreaterThanOrEqual(
      diseaseOnly.diseaseSummaries.length,
    );
  });

  it("filters by candidate_types=['Product'] — zeroes candidateCount", async () => {
    const { data } = await query<{
      diseaseProductTypeSummaries: DiseaseProductTypeSummary[];
    }>(
      `query ($candidateTypes: [String!]) {
        diseaseProductTypeSummaries(candidate_types: $candidateTypes) {
          disease_group_name
          product_type
          candidateCount
          productCount
        }
      }`,
      { candidateTypes: ["Product"] },
    );

    expect(data.diseaseProductTypeSummaries.length).toBeGreaterThan(0);
    const totalCandidates = data.diseaseProductTypeSummaries.reduce(
      (s, r) => s + r.candidateCount,
      0,
    );
    expect(totalCandidates).toBe(0);
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
        location_scope
        candidateCount
      }
    }`);

    expect(data.geographicDistribution.length).toBeGreaterThan(0);
    expect(data.geographicDistribution[0].country_name).toBeDefined();
    data.geographicDistribution.forEach((row) => {
      expect(row.location_scope).toBe("Trial Location");
    });
  });

  it("returns countries for Developer Location tab", async () => {
    const { data } = await query<{
      geographicDistribution: GeographicDistributionRow[];
    }>(`{
      geographicDistribution(location_scope: "Developer Location") {
        country_key
        country_name
        iso_code
        location_scope
        candidateCount
      }
    }`);

    expect(data.geographicDistribution.length).toBeGreaterThan(0);
    data.geographicDistribution.forEach((row) => {
      expect(row.location_scope).toBe("Developer Location");
    });
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

  it("filters by product_keys", async () => {
    const { data: baselineData } = await query<{
      phaseDistribution: PhaseDistributionRow[];
    }>(`{
      phaseDistribution {
        candidateCount
      }
    }`);

    const unfilteredTotal = baselineData.phaseDistribution.reduce(
      (sum, r) => sum + r.candidateCount,
      0,
    );

    const { data: lookupData } = await query<{
      products: Array<{ product_key: number }>;
    }>(`{ products { product_key } }`);

    expect(lookupData.products.length).toBeGreaterThan(0);
    const productKeys = [lookupData.products[0].product_key];

    const { data } = await query<{
      phaseDistribution: PhaseDistributionRow[];
    }>(
      `query ($productKeys: [Int!]) {
        phaseDistribution(product_keys: $productKeys) {
          global_health_area
          phase_name
          sort_order
          candidateCount
        }
      }`,
      { productKeys },
    );

    const filteredTotal = data.phaseDistribution.reduce((sum, r) => sum + r.candidateCount, 0);
    expect(filteredTotal).toBeGreaterThan(0);
    expect(filteredTotal).toBeLessThan(unfilteredTotal);
  });
});

describe("Phase Distribution — candidate_type filter", () => {
  it("filters by candidate_type", async () => {
    const { data: allData } = await query<{
      phaseDistribution: PhaseDistributionRow[];
    }>(`{
      phaseDistribution {
        candidateCount
      }
    }`);

    const { data } = await query<{
      phaseDistribution: PhaseDistributionRow[];
    }>(`{
      phaseDistribution(candidate_type: "Candidate") {
        global_health_area
        phase_name
        sort_order
        candidateCount
      }
    }`);

    expect(data.phaseDistribution.length).toBeGreaterThan(0);
    const filteredTotal = data.phaseDistribution.reduce((sum, r) => sum + r.candidateCount, 0);
    const unfilteredTotal = allData.phaseDistribution.reduce((sum, r) => sum + r.candidateCount, 0);
    expect(filteredTotal).toBeGreaterThan(0);
    expect(filteredTotal).toBeLessThan(unfilteredTotal);
  });
});

describe("Lookup Queries", () => {
  it("diseases returns non-empty array of primary disease groups", async () => {
    const { data } = await query<{
      diseases: Array<{ disease_filter: string | null; global_health_area: string | null }>;
    }>(`{
      diseases {
        disease_filter
        global_health_area
      }
    }`);

    expect(data.diseases.length).toBeGreaterThan(0);
    expect(data.diseases[0].disease_filter).toBeDefined();
    expect(typeof data.diseases[0].disease_filter).toBe("string");
  });

  it("secondaryDiseases returns rows joined to their primary parent", async () => {
    const { data } = await query<{
      secondaryDiseases: Array<{
        disease_filter: string;
        secondary_disease_name: string;
        global_health_area: string | null;
      }>;
    }>(`{
      secondaryDiseases {
        disease_filter
        secondary_disease_name
        global_health_area
      }
    }`);

    expect(data.secondaryDiseases.length).toBeGreaterThan(0);
    data.secondaryDiseases.forEach((row) => {
      expect(typeof row.disease_filter).toBe("string");
      expect(typeof row.secondary_disease_name).toBe("string");
    });
  });

  it("diseaseHierarchy emits self-row for childless primaries", async () => {
    const { data } = await query<{
      diseaseHierarchy: Array<{
        primary_disease: string;
        secondary_disease: string;
        global_health_area: string;
      }>;
    }>(`{
      diseaseHierarchy {
        primary_disease
        secondary_disease
        global_health_area
      }
    }`);

    expect(data.diseaseHierarchy.length).toBeGreaterThan(0);

    // Some primaries (e.g. "Tuberculosis") have no children. The
    // sidebar's existing "leaf with no `+`" rule needs them to appear
    // as a row where secondary == primary.
    const selfRow = data.diseaseHierarchy.find((r) => r.secondary_disease === r.primary_disease);
    expect(selfRow).toBeDefined();

    // Some primaries (e.g. "Malaria") have multiple secondaries.
    const groupedByPrimary = new Map<string, string[]>();
    for (const row of data.diseaseHierarchy) {
      const prev = groupedByPrimary.get(row.primary_disease) ?? [];
      prev.push(row.secondary_disease);
      groupedByPrimary.set(row.primary_disease, prev);
    }
    const branchingPrimary = Array.from(groupedByPrimary.values()).find((cs) => cs.length > 1);
    expect(branchingPrimary).toBeDefined();
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

describe("diseaseSummaries filtering", () => {
  const DISEASE_SUMMARIES = `
    query DS($gha: [String!], $primary: [String!], $phase: [String!]) {
      diseaseSummaries(
        global_health_areas: $gha
        primary_disease_names: $primary
        phase_names: $phase
      ) {
        disease_group_name
        global_health_area
        candidateCount
        productCount
      }
    }`;

  it("unfiltered returns rows across multiple health areas", async () => {
    const { data } = await query<{ diseaseSummaries: DiseaseSummary[] }>(DISEASE_SUMMARIES);
    expect(data.diseaseSummaries.length).toBeGreaterThan(0);
  });

  it("restricting to one global health area returns only that area's rows", async () => {
    const { data } = await query<{ diseaseSummaries: DiseaseSummary[] }>(
      DISEASE_SUMMARIES,
      { gha: ["Neglected disease"] },
    );
    expect(data.diseaseSummaries.length).toBeGreaterThan(0);
    data.diseaseSummaries.forEach((row) => {
      expect(row.global_health_area).toBe("Neglected disease");
    });
  });

  it("a GHA filter yields no more rows than unfiltered", async () => {
    const all = await query<{ diseaseSummaries: DiseaseSummary[] }>(DISEASE_SUMMARIES);
    const filtered = await query<{ diseaseSummaries: DiseaseSummary[] }>(
      DISEASE_SUMMARIES,
      { gha: ["Neglected disease"] },
    );
    expect(filtered.data.diseaseSummaries.length).toBeLessThanOrEqual(
      all.data.diseaseSummaries.length,
    );
  });
});
