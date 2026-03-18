/**
 * E2E Tests — regulatoryDistribution query (Portfolio Analysis → Approved Product tab).
 *
 * Validates that Approval Status and WHO Prequalification chart totals match
 * the KPI approved-products count, including NULLs rendered as 'Unknown'.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { query } from "../helpers/graphql.js";
import type {
  RegulatoryDistribution,
  PortfolioKPIs,
  ApprovalStatusRow,
  WHOPrequalRow,
} from "../helpers/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const REGULATORY_QUERY = `
  query ($globalHealthAreas: [String!], $diseaseNames: [String!], $productNames: [String!]) {
    regulatoryDistribution(
      global_health_areas: $globalHealthAreas,
      disease_names: $diseaseNames,
      product_names: $productNames
    ) {
      approvalStatus { approval_status candidateCount }
      whoPrequalification { who_prequalification candidateCount }
      approvingAuthorities { authority_type who_prequalified no_who_listing }
    }
  }
`;

const KPI_QUERY = `
  query ($globalHealthAreas: [String!], $diseaseNames: [String!], $productNames: [String!]) {
    portfolioKPIs(
      global_health_areas: $globalHealthAreas,
      disease_names: $diseaseNames,
      product_names: $productNames
    ) {
      totalDiseases totalCandidates approvedProducts
    }
  }
`;

async function queryRegulatory(
  variables: {
    globalHealthAreas?: string[];
    diseaseNames?: string[];
    productNames?: string[];
  } = {},
): Promise<RegulatoryDistribution> {
  const { data } = await query<{ regulatoryDistribution: RegulatoryDistribution }>(
    REGULATORY_QUERY,
    variables,
  );
  return data.regulatoryDistribution;
}

async function queryKPIs(
  variables: {
    globalHealthAreas?: string[];
    diseaseNames?: string[];
    productNames?: string[];
  } = {},
): Promise<PortfolioKPIs> {
  const { data } = await query<{ portfolioKPIs: PortfolioKPIs }>(KPI_QUERY, variables);
  return data.portfolioKPIs;
}

function sumApprovalStatus(rows: ApprovalStatusRow[]): number {
  return rows.reduce((sum, r) => sum + r.candidateCount, 0);
}

function sumWHOPrequal(rows: WHOPrequalRow[]): number {
  return rows.reduce((sum, r) => sum + r.candidateCount, 0);
}

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------

let baseline: RegulatoryDistribution;
let baselineKPIs: PortfolioKPIs;

beforeAll(async () => {
  [baseline, baselineKPIs] = await Promise.all([queryRegulatory(), queryKPIs()]);
});

// ---------------------------------------------------------------------------
// 1. Baseline structural invariants
// ---------------------------------------------------------------------------

describe("Baseline (no filters)", () => {
  it("returns non-empty approval status breakdown", () => {
    expect(baseline.approvalStatus.length).toBeGreaterThan(0);
  });

  it("returns non-empty WHO prequalification breakdown", () => {
    expect(baseline.whoPrequalification.length).toBeGreaterThan(0);
  });

  it("returns non-empty approving authorities", () => {
    expect(baseline.approvingAuthorities.length).toBeGreaterThan(0);
  });

  it("all candidateCounts are positive integers", () => {
    for (const row of baseline.approvalStatus) {
      expect(row.candidateCount).toBeGreaterThan(0);
      expect(Number.isInteger(row.candidateCount)).toBe(true);
    }
    for (const row of baseline.whoPrequalification) {
      expect(row.candidateCount).toBeGreaterThan(0);
      expect(Number.isInteger(row.candidateCount)).toBe(true);
    }
  });

  it("approval_status values are non-empty strings", () => {
    for (const row of baseline.approvalStatus) {
      expect(typeof row.approval_status).toBe("string");
      expect(row.approval_status.length).toBeGreaterThan(0);
    }
  });

  it("who_prequalification values are non-empty strings", () => {
    for (const row of baseline.whoPrequalification) {
      expect(typeof row.who_prequalification).toBe("string");
      expect(row.who_prequalification.length).toBeGreaterThan(0);
    }
  });

  it("no duplicate approval_status values", () => {
    const values = baseline.approvalStatus.map((r) => r.approval_status);
    expect(new Set(values).size).toBe(values.length);
  });

  it("no duplicate who_prequalification values", () => {
    const values = baseline.whoPrequalification.map((r) => r.who_prequalification);
    expect(new Set(values).size).toBe(values.length);
  });
});

// ---------------------------------------------------------------------------
// 2. Chart totals match KPI approved products
// ---------------------------------------------------------------------------

describe("Chart totals match KPI", () => {
  it("approval status total equals KPI approvedProducts", () => {
    const total = sumApprovalStatus(baseline.approvalStatus);
    console.log(
      `[regulatory] Approval Status total: ${total}, KPI approvedProducts: ${baselineKPIs.approvedProducts}`,
    );
    expect(total).toBe(baselineKPIs.approvedProducts);
  });

  it("WHO prequalification total equals KPI approvedProducts", () => {
    const total = sumWHOPrequal(baseline.whoPrequalification);
    console.log(
      `[regulatory] WHO Prequalification total: ${total}, KPI approvedProducts: ${baselineKPIs.approvedProducts}`,
    );
    expect(total).toBe(baselineKPIs.approvedProducts);
  });

  it("approving authorities total is a subset (≤ KPI)", () => {
    const sraTotal = baseline.approvingAuthorities.find(
      (r) => r.authority_type === "Stringent Regulatory Authority",
    );
    const nraTotal = baseline.approvingAuthorities.find(
      (r) => r.authority_type === "National Regulatory Authority",
    );

    if (sraTotal) {
      const sraSum = sraTotal.who_prequalified + sraTotal.no_who_listing;
      expect(sraSum).toBeLessThanOrEqual(baselineKPIs.approvedProducts);
    }
    if (nraTotal) {
      const nraSum = nraTotal.who_prequalified + nraTotal.no_who_listing;
      expect(nraSum).toBeLessThanOrEqual(baselineKPIs.approvedProducts);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Unknown category present (COALESCE working)
// ---------------------------------------------------------------------------

describe("Unknown category (COALESCE)", () => {
  it("'Unknown' appears as an approval_status value", () => {
    const unknowns = baseline.approvalStatus.filter((r) => r.approval_status === "Unknown");
    expect(unknowns.length, "Expected 'Unknown' in approval_status breakdown").toBe(1);
  });

  it("'Unknown' appears as a who_prequalification value", () => {
    const unknowns = baseline.whoPrequalification.filter(
      (r) => r.who_prequalification === "Unknown",
    );
    expect(unknowns.length, "Expected 'Unknown' in WHO prequalification breakdown").toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 4. Filter tests — GHA filter
// ---------------------------------------------------------------------------

describe("GHA filter", () => {
  it("filtering by a single GHA reduces or maintains totals", async () => {
    const filtered = await queryRegulatory({ globalHealthAreas: ["Neglected disease"] });
    const filteredKPIs = await queryKPIs({ globalHealthAreas: ["Neglected disease"] });

    const approvalTotal = sumApprovalStatus(filtered.approvalStatus);
    const whoTotal = sumWHOPrequal(filtered.whoPrequalification);

    expect(approvalTotal).toBeLessThanOrEqual(sumApprovalStatus(baseline.approvalStatus));
    expect(whoTotal).toBeLessThanOrEqual(sumWHOPrequal(baseline.whoPrequalification));

    // Filtered chart totals should still match filtered KPI
    expect(approvalTotal).toBe(filteredKPIs.approvedProducts);
    expect(whoTotal).toBe(filteredKPIs.approvedProducts);

    console.log(
      `[GHA=Neglected disease] Approval: ${approvalTotal}, WHO: ${whoTotal}, KPI: ${filteredKPIs.approvedProducts}`,
    );
  });
});

// ---------------------------------------------------------------------------
// 5. Filter tests — disease filter
// ---------------------------------------------------------------------------

describe("Disease filter", () => {
  it("filtering by disease reduces or maintains totals", async () => {
    const filtered = await queryRegulatory({ diseaseNames: ["Malaria"] });
    const filteredKPIs = await queryKPIs({ diseaseNames: ["Malaria"] });

    const approvalTotal = sumApprovalStatus(filtered.approvalStatus);
    const whoTotal = sumWHOPrequal(filtered.whoPrequalification);

    expect(approvalTotal).toBeLessThanOrEqual(sumApprovalStatus(baseline.approvalStatus));
    expect(whoTotal).toBeLessThanOrEqual(sumWHOPrequal(baseline.whoPrequalification));

    expect(approvalTotal).toBe(filteredKPIs.approvedProducts);
    expect(whoTotal).toBe(filteredKPIs.approvedProducts);

    console.log(
      `[disease=Malaria] Approval: ${approvalTotal}, WHO: ${whoTotal}, KPI: ${filteredKPIs.approvedProducts}`,
    );
  });
});

// ---------------------------------------------------------------------------
// 6. Filter tests — product filter
// ---------------------------------------------------------------------------

describe("Product filter", () => {
  it("filtering by product name reduces or maintains totals", async () => {
    // Use a known product category
    const filtered = await queryRegulatory({ productNames: ["Vaccine"] });
    const filteredKPIs = await queryKPIs({ productNames: ["Vaccine"] });

    const approvalTotal = sumApprovalStatus(filtered.approvalStatus);
    const whoTotal = sumWHOPrequal(filtered.whoPrequalification);

    expect(approvalTotal).toBeLessThanOrEqual(sumApprovalStatus(baseline.approvalStatus));
    expect(whoTotal).toBeLessThanOrEqual(sumWHOPrequal(baseline.whoPrequalification));

    expect(approvalTotal).toBe(filteredKPIs.approvedProducts);
    expect(whoTotal).toBe(filteredKPIs.approvedProducts);

    console.log(
      `[product=Vaccine] Approval: ${approvalTotal}, WHO: ${whoTotal}, KPI: ${filteredKPIs.approvedProducts}`,
    );
  });
});
