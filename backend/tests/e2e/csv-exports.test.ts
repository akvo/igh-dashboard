/**
 * E2E Tests — CSV export data flow.
 *
 * Validates the four paginated GraphQL queries that back CSV exports:
 *   1. portfolioCandidates  (Candidates tab + Approved Products tab)
 *   2. clinicalTrials       (Trials tab)
 *   3. rdPrioritiesWithCandidates (R&D Priorities tab)
 *   4. rdPriorities         (R&D Only tab)
 *
 * Each test group checks:
 *   - All CSV column fields are queryable (schema coverage)
 *   - Filters narrow results and returned rows match
 *   - Pagination produces consistent, non-overlapping pages
 *   - Fixture CSV output matches expected data
 */

import { describe, it, expect } from "vitest";
import { query } from "../helpers/graphql.js";
import {
  buildTestCSV,
  expectMatchesFixture,
  type CSVColumn,
} from "../helpers/csv.js";

// =========================================================
// Type definitions (inline, test-scoped)
// =========================================================

interface PageInfo {
  totalCount: number;
  hasNextPage: boolean;
}

interface CandidateNode {
  candidate_key: number;
  candidate_name: string | null;
  candidate_type: string | null;
  candidateid: string | null;
  alternative_names: string | null;
  current_rd_stage: string | null;
  countries_approved_count: number | null;
  countries_approved_agg: string | null;
  indication: string | null;
  target: string | null;
  developers_agg: string | null;
  mechanism_of_action: string | null;
  key_features: string | null;
  known_funders_agg: string | null;
  technology_type: string | null;
  indication_type: string | null;
  healthcare_facility_level: string | null;
  preclinical_results_status: string | null;
  type_of_preclinical_results: string | null;
  preclinical_results_source: string | null;
  recent_updates: string | null;
  test_format: string | null;
  global_health_area: string | null;
  disease_name: string | null;
  secondary_disease_name: string | null;
  product_name: string | null;
  sub_product_name: string | null;
  phase_name: string | null;
  approval_status: string | null;
  who_prequalification: string | null;
  nra_approval_status: string | null;
  sra_approval_status: string | null;
  ema_approval_status: string | null;
  japanese_mhlw_approval_status: string | null;
  us_fda_approval_status: string | null;
  approving_authorities_agg: string | null;
  technology_principle: string | null;
  target_population: string | null;
  route_of_administration: string | null;
  platform: string | null;
  chim_study: string | null;
  key_clinical_trial: string | null;
  rd_stage_2023: string | null;
  rd_stage_2019: string | null;
}

interface CandidateConnection extends PageInfo {
  nodes: CandidateNode[];
}

interface TrialNode {
  trial_id: number;
  clinicaltrialid: string | null;
  trial_name: string | null;
  trial_title: string | null;
  trial_phase: string | null;
  status: string | null;
  candidate_name: string | null;
  disease_name: string | null;
  product_name: string | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  ct_results_status: string | null;
  collaborator: string | null;
  locations: string | null;
  sponsor: string | null;
  source_text: string | null;
  age_groups: string | null;
  enrollment_count: number | null;
  study_type: string | null;
  funder_type: string | null;
  interventions: string | null;
  outcome_measure: string | null;
  sex: string | null;
  study_design: string | null;
  ct_results_type: string | null;
  ct_terminated_reason: string | null;
}

interface TrialConnection extends PageInfo {
  nodes: TrialNode[];
}

interface PriorityWithCandidateNode {
  priority_key: number;
  rdpriorityid: string | null;
  priority_name: string | null;
  indication: string | null;
  intended_use: string | null;
  disease_name: string | null;
  global_health_area: string | null;
  author: string | null;
  publication_date: string | null;
  target_population: string | null;
  efficacy: string | null;
  safety: string | null;
  source: string | null;
  product_name: string | null;
  candidate_name: string | null;
  current_rd_stage: string | null;
}

interface PriorityWithCandidateConnection extends PageInfo {
  nodes: PriorityWithCandidateNode[];
}

interface PriorityNode {
  priority_key: number;
  rdpriorityid: string | null;
  priority_name: string | null;
  indication: string | null;
  intended_use: string | null;
  disease_name: string | null;
  global_health_area: string | null;
  author: string | null;
  publication_date: string | null;
  target_population: string | null;
  efficacy: string | null;
  safety: string | null;
  source: string | null;
  product_name: string | null;
}

interface PriorityConnection extends PageInfo {
  nodes: PriorityNode[];
}

// =========================================================
// GraphQL queries — mirror the frontend query field lists
// =========================================================

const CANDIDATES_QUERY = `
  query PortfolioCandidates($filter: PortfolioCandidateFilter, $limit: Int, $offset: Int) {
    portfolioCandidates(filter: $filter, limit: $limit, offset: $offset) {
      nodes {
        candidate_key candidate_name candidate_type candidateid alternative_names
        current_rd_stage countries_approved_count countries_approved_agg
        indication target developers_agg mechanism_of_action key_features
        known_funders_agg technology_type indication_type healthcare_facility_level
        preclinical_results_status type_of_preclinical_results preclinical_results_source
        recent_updates test_format global_health_area disease_name secondary_disease_name
        product_name sub_product_name phase_name
        approval_status who_prequalification nra_approval_status sra_approval_status
        ema_approval_status japanese_mhlw_approval_status us_fda_approval_status
        approving_authorities_agg technology_principle target_population
        route_of_administration platform chim_study key_clinical_trial
        rd_stage_2023 rd_stage_2019
      }
      totalCount
      hasNextPage
    }
  }
`;

const TRIALS_QUERY = `
  query ClinicalTrials($filter: ClinicalTrialFilter, $limit: Int, $offset: Int) {
    clinicalTrials(filter: $filter, limit: $limit, offset: $offset) {
      nodes {
        trial_id clinicaltrialid trial_name trial_title trial_phase status
        candidate_name disease_name product_name start_date end_date description
        ct_results_status collaborator locations sponsor source_text
        age_groups enrollment_count study_type funder_type interventions
        outcome_measure sex study_design ct_results_type ct_terminated_reason
      }
      totalCount
      hasNextPage
    }
  }
`;

const RD_PRIORITIES_WITH_CANDIDATES_QUERY = `
  query RdPrioritiesWithCandidates($filter: RdPriorityFilter, $limit: Int, $offset: Int) {
    rdPrioritiesWithCandidates(filter: $filter, limit: $limit, offset: $offset) {
      nodes {
        priority_key rdpriorityid priority_name indication intended_use
        disease_name global_health_area author publication_date
        target_population efficacy safety source product_name
        candidate_name current_rd_stage
      }
      totalCount
      hasNextPage
    }
  }
`;

const RD_PRIORITIES_QUERY = `
  query RdPriorities($filter: RdPriorityFilter, $limit: Int, $offset: Int) {
    rdPriorities(filter: $filter, limit: $limit, offset: $offset) {
      nodes {
        priority_key rdpriorityid priority_name indication intended_use
        disease_name global_health_area author publication_date
        target_population efficacy safety source product_name
      }
      totalCount
      hasNextPage
    }
  }
`;

// =========================================================
// CSV column definitions — mirror exploreColumnConfig.js
// and extractColumnConfig.js
// =========================================================

const CANDIDATE_CSV_COLUMNS: CSVColumn[] = [
  { label: "Name", accessor: "candidate_name" },
  { label: "GHA", accessor: "global_health_area" },
  { label: "Disease", accessor: "disease_name" },
  { label: "Secondary disease", accessor: "secondary_disease_name" },
  { label: "Product", accessor: "product_name" },
  { label: "R&D stage", accessor: "current_rd_stage" },
  { label: "Developers", accessor: "developers_agg" },
  { label: "Indication", accessor: "indication" },
  { label: "Indication type", accessor: "indication_type" },
  { label: "Health care facility level", accessor: "healthcare_facility_level" },
  { label: "Target", accessor: "target" },
  { label: "Mechanism of action", accessor: "mechanism_of_action" },
  { label: "Technology type", accessor: "technology_type" },
  { label: "Test format", accessor: "test_format" },
  { label: "Preclinical results status", accessor: "preclinical_results_status" },
  { label: "Type of preclinical results", accessor: "type_of_preclinical_results" },
  { label: "Preclinical results source", accessor: "preclinical_results_source" },
  { label: "Key features and challenges", accessor: "key_features" },
  { label: "Recent updates", accessor: "recent_updates" },
];

const APPROVED_PRODUCT_CSV_COLUMNS: CSVColumn[] = [
  { label: "Name", accessor: "candidate_name" },
  { label: "GHA", accessor: "global_health_area" },
  { label: "Disease", accessor: "disease_name" },
  { label: "Secondary disease", accessor: "secondary_disease_name" },
  { label: "Product", accessor: "product_name" },
  { label: "R&D stage", accessor: "current_rd_stage" },
  { label: "Developers", accessor: "developers_agg" },
  { label: "Indication", accessor: "indication" },
  { label: "Indication type", accessor: "indication_type" },
  { label: "Health care facility level", accessor: "healthcare_facility_level" },
  { label: "Target", accessor: "target" },
  { label: "Mechanism of action", accessor: "mechanism_of_action" },
  { label: "Technology type", accessor: "technology_type" },
  { label: "Key features and challenges", accessor: "key_features" },
  { label: "Recent updates", accessor: "recent_updates" },
  { label: "Approval status", accessor: "approval_status" },
  { label: "Approving authority", accessor: "approving_authorities_agg" },
  { label: "National regulatory authority approval status", accessor: "nra_approval_status" },
  { label: "Stringent regulatory authority approval status", accessor: "sra_approval_status" },
  { label: "EMA approval status", accessor: "ema_approval_status" },
  { label: "Japanese MHLW approval status", accessor: "japanese_mhlw_approval_status" },
  { label: "US FDA approval status", accessor: "us_fda_approval_status" },
];

const TRIAL_CSV_COLUMNS: CSVColumn[] = [
  { label: "CT number", accessor: "clinicaltrialid" },
  { label: "Candidate / product name", accessor: "candidate_name" },
  { label: "Title", accessor: "trial_title" },
  { label: "Description", accessor: "description" },
  { label: "CT phase", accessor: "trial_phase" },
  { label: "CT status", accessor: "status" },
  { label: "Locations", accessor: "locations" },
  { label: "CT results status", accessor: "ct_results_status" },
  { label: "Start date", accessor: "start_date" },
  { label: "End date", accessor: "end_date" },
  { label: "Sponsor", accessor: "sponsor" },
  { label: "Collaborator", accessor: "collaborator" },
  { label: "Source", accessor: "source_text" },
];

const RD_PRIORITY_WITH_CANDIDATE_CSV_COLUMNS: CSVColumn[] = [
  { label: "Priority ID", accessor: "rdpriorityid" },
  { label: "Title", accessor: "priority_name" },
  { label: "TPP/PPC", accessor: "intended_use" },
  { label: "Disease", accessor: "disease_name" },
  { label: "Product", accessor: "product_name" },
  { label: "Global Health area", accessor: "global_health_area" },
  { label: "Author", accessor: "author" },
  { label: "Publication data", accessor: "publication_date" },
  { label: "Indication", accessor: "indication" },
  { label: "Intended use", accessor: "intended_use" },
  { label: "Target population", accessor: "target_population" },
  { label: "Efficacy", accessor: "efficacy" },
  { label: "Safety", accessor: "safety" },
  { label: "Source", accessor: "source" },
  { label: "Candidate name", accessor: "candidate_name" },
  { label: "RD Stage", accessor: "current_rd_stage" },
];

const RD_PRIORITY_ONLY_CSV_COLUMNS: CSVColumn[] = [
  { label: "Priority ID", accessor: "rdpriorityid" },
  { label: "Title", accessor: "priority_name" },
  { label: "TPP/PPC", accessor: "intended_use" },
  { label: "Disease", accessor: "disease_name" },
  { label: "Product", accessor: "product_name" },
  { label: "Global Health area", accessor: "global_health_area" },
  { label: "Author", accessor: "author" },
  { label: "Publication data", accessor: "publication_date" },
  { label: "Indication", accessor: "indication" },
  { label: "Intended use", accessor: "intended_use" },
  { label: "Target population", accessor: "target_population" },
  { label: "Efficacy", accessor: "efficacy" },
  { label: "Safety", accessor: "safety" },
  { label: "Source", accessor: "source" },
];

// =========================================================
// Helper to fetch all pages
// =========================================================

async function fetchAllPages<T>(
  gqlQuery: string,
  rootField: string,
  filter?: Record<string, unknown>,
  batchSize = 100,
): Promise<{ nodes: T[]; totalCount: number }> {
  let allNodes: T[] = [];
  let offset = 0;
  let hasMore = true;
  let totalCount = 0;

  while (hasMore) {
    const { data } = await query<Record<string, PageInfo & { nodes: T[] }>>(
      gqlQuery,
      {
        filter,
        limit: batchSize,
        offset,
      },
    );

    const result = data[rootField];
    totalCount = result.totalCount;
    allNodes = allNodes.concat(result.nodes);
    hasMore = result.hasNextPage && result.nodes.length > 0;
    offset += batchSize;
  }

  return { nodes: allNodes, totalCount };
}

// =========================================================
// Tests
// =========================================================

describe("CSV export — portfolioCandidates (Candidates tab)", () => {
  it("returns all candidate column fields", async () => {
    const { data } = await query<{
      portfolioCandidates: CandidateConnection;
    }>(CANDIDATES_QUERY, { limit: 1 });

    expect(data.portfolioCandidates.totalCount).toBeGreaterThan(0);
    const node = data.portfolioCandidates.nodes[0];
    // Every CSV column accessor must exist as a key in the response
    for (const col of CANDIDATE_CSV_COLUMNS) {
      expect(node).toHaveProperty(col.accessor);
    }
  });

  it("candidate_type='Candidate' filters correctly", async () => {
    const { data: allData } = await query<{
      portfolioCandidates: CandidateConnection;
    }>(CANDIDATES_QUERY, { limit: 1 });

    const { data: filtered } = await query<{
      portfolioCandidates: CandidateConnection;
    }>(CANDIDATES_QUERY, {
      filter: { candidate_type: "Candidate" },
      limit: 5,
    });

    expect(filtered.portfolioCandidates.totalCount).toBeGreaterThan(0);
    expect(filtered.portfolioCandidates.totalCount).toBeLessThan(
      allData.portfolioCandidates.totalCount,
    );
    filtered.portfolioCandidates.nodes.forEach((node) => {
      expect(node.candidate_type).toBe("Candidate");
    });
  });

  it("candidate_type='Product' filters correctly", async () => {
    const { data: allData } = await query<{
      portfolioCandidates: CandidateConnection;
    }>(CANDIDATES_QUERY, { limit: 1 });

    const { data: filtered } = await query<{
      portfolioCandidates: CandidateConnection;
    }>(CANDIDATES_QUERY, {
      filter: { candidate_type: "Product" },
      limit: 5,
    });

    expect(filtered.portfolioCandidates.totalCount).toBeGreaterThan(0);
    expect(filtered.portfolioCandidates.totalCount).toBeLessThan(
      allData.portfolioCandidates.totalCount,
    );
    filtered.portfolioCandidates.nodes.forEach((node) => {
      expect(node.candidate_type).toBe("Product");
    });
  });

  it("GHA filter narrows results and rows match", async () => {
    const { data: allData } = await query<{
      portfolioCandidates: CandidateConnection;
    }>(CANDIDATES_QUERY, { limit: 1 });

    const gha = "Emerging infectious disease";
    const { data: filtered } = await query<{
      portfolioCandidates: CandidateConnection;
    }>(CANDIDATES_QUERY, {
      filter: { global_health_areas: [gha] },
      limit: 5,
    });

    expect(filtered.portfolioCandidates.totalCount).toBeGreaterThan(0);
    expect(filtered.portfolioCandidates.totalCount).toBeLessThanOrEqual(
      allData.portfolioCandidates.totalCount,
    );
    filtered.portfolioCandidates.nodes.forEach((node) => {
      expect(node.global_health_area).toBe(gha);
    });
  });

  it("disease_names filter narrows results", async () => {
    // First get a disease name that exists in the data
    const { data: sample } = await query<{
      portfolioCandidates: CandidateConnection;
    }>(CANDIDATES_QUERY, { limit: 10 });

    const disease = sample.portfolioCandidates.nodes.find(
      (n) => n.disease_name,
    )?.disease_name;
    expect(disease).toBeTruthy();

    const { data: filtered } = await query<{
      portfolioCandidates: CandidateConnection;
    }>(CANDIDATES_QUERY, {
      filter: { disease_names: [disease] },
      limit: 5,
    });

    expect(filtered.portfolioCandidates.totalCount).toBeGreaterThan(0);
    expect(filtered.portfolioCandidates.totalCount).toBeLessThanOrEqual(
      sample.portfolioCandidates.totalCount,
    );
  });

  it("pagination returns consistent pages", async () => {
    const pageSize = 3;

    const { data: page1 } = await query<{
      portfolioCandidates: CandidateConnection;
    }>(CANDIDATES_QUERY, { limit: pageSize, offset: 0 });

    expect(page1.portfolioCandidates.hasNextPage).toBe(true);
    expect(page1.portfolioCandidates.nodes).toHaveLength(pageSize);

    const { data: page2 } = await query<{
      portfolioCandidates: CandidateConnection;
    }>(CANDIDATES_QUERY, { limit: pageSize, offset: pageSize });

    expect(page2.portfolioCandidates.nodes).toHaveLength(pageSize);

    // No overlapping keys between pages
    const page1Keys = new Set(
      page1.portfolioCandidates.nodes.map((n) => n.candidate_key),
    );
    page2.portfolioCandidates.nodes.forEach((n) => {
      expect(page1Keys.has(n.candidate_key)).toBe(false);
    });
  });

  it("candidate CSV matches fixture", async () => {
    const { nodes } = await fetchAllPages<CandidateNode>(
      CANDIDATES_QUERY,
      "portfolioCandidates",
      { candidate_type: "Candidate" },
    );

    const csv = buildTestCSV(CANDIDATE_CSV_COLUMNS, nodes);
    const headerLine = csv.split("\n")[0];
    expect(headerLine).toBe(
      "Name,GHA,Disease,Secondary disease,Product,R&D stage,Developers," +
        "Indication,Indication type,Health care facility level,Target," +
        "Mechanism of action,Technology type,Test format," +
        "Preclinical results status,Type of preclinical results," +
        "Preclinical results source,Key features and challenges,Recent updates",
    );
    expectMatchesFixture(csv, "candidates.csv");
  });

  it("approved products CSV matches fixture", async () => {
    const { nodes } = await fetchAllPages<CandidateNode>(
      CANDIDATES_QUERY,
      "portfolioCandidates",
      { candidate_type: "Product" },
    );

    const csv = buildTestCSV(APPROVED_PRODUCT_CSV_COLUMNS, nodes);
    const headerLine = csv.split("\n")[0];
    expect(headerLine).toBe(
      "Name,GHA,Disease,Secondary disease,Product,R&D stage,Developers," +
        "Indication,Indication type,Health care facility level,Target," +
        "Mechanism of action,Technology type,Key features and challenges," +
        "Recent updates,Approval status,Approving authority," +
        "National regulatory authority approval status," +
        "Stringent regulatory authority approval status," +
        "EMA approval status,Japanese MHLW approval status," +
        "US FDA approval status",
    );
    expectMatchesFixture(csv, "approved-products.csv");
  });
});

describe("CSV export — clinicalTrials (Trials tab)", () => {
  it("returns all trial column fields", async () => {
    const { data } = await query<{
      clinicalTrials: TrialConnection;
    }>(TRIALS_QUERY, { limit: 1 });

    expect(data.clinicalTrials.totalCount).toBeGreaterThan(0);
    const node = data.clinicalTrials.nodes[0];
    for (const col of TRIAL_CSV_COLUMNS) {
      expect(node).toHaveProperty(col.accessor);
    }
  });

  it("statuses filter returns only matching rows", async () => {
    const { data: allData } = await query<{
      clinicalTrials: TrialConnection;
    }>(TRIALS_QUERY, { limit: 1 });

    const { data: filtered } = await query<{
      clinicalTrials: TrialConnection;
    }>(TRIALS_QUERY, {
      filter: { statuses: ["Active"] },
      limit: 10,
    });

    expect(filtered.clinicalTrials.totalCount).toBeGreaterThan(0);
    expect(filtered.clinicalTrials.totalCount).toBeLessThan(
      allData.clinicalTrials.totalCount,
    );
    filtered.clinicalTrials.nodes.forEach((node) => {
      expect(node.status).toBe("Active");
    });
  });

  it("combined GHA + statuses filter narrows results", async () => {
    const { data: statusOnly } = await query<{
      clinicalTrials: TrialConnection;
    }>(TRIALS_QUERY, {
      filter: { statuses: ["Active"] },
      limit: 1,
    });

    const { data: combined } = await query<{
      clinicalTrials: TrialConnection;
    }>(TRIALS_QUERY, {
      filter: {
        statuses: ["Active"],
        global_health_areas: ["Emerging infectious disease"],
      },
      limit: 5,
    });

    expect(combined.clinicalTrials.totalCount).toBeGreaterThan(0);
    expect(combined.clinicalTrials.totalCount).toBeLessThanOrEqual(
      statusOnly.clinicalTrials.totalCount,
    );
    combined.clinicalTrials.nodes.forEach((node) => {
      expect(node.status).toBe("Active");
    });
  });

  it("pagination returns consistent pages", async () => {
    const pageSize = 3;

    const { data: page1 } = await query<{
      clinicalTrials: TrialConnection;
    }>(TRIALS_QUERY, { limit: pageSize, offset: 0 });

    expect(page1.clinicalTrials.hasNextPage).toBe(true);
    expect(page1.clinicalTrials.nodes).toHaveLength(pageSize);

    const { data: page2 } = await query<{
      clinicalTrials: TrialConnection;
    }>(TRIALS_QUERY, { limit: pageSize, offset: pageSize });

    expect(page2.clinicalTrials.nodes).toHaveLength(pageSize);

    const page1Ids = new Set(
      page1.clinicalTrials.nodes.map((n) => n.trial_id),
    );
    page2.clinicalTrials.nodes.forEach((n) => {
      expect(page1Ids.has(n.trial_id)).toBe(false);
    });
  });

  it("clinical trials CSV matches fixture", async () => {
    const { nodes } = await fetchAllPages<TrialNode>(
      TRIALS_QUERY,
      "clinicalTrials",
    );

    const csv = buildTestCSV(TRIAL_CSV_COLUMNS, nodes);
    const headerLine = csv.split("\n")[0];
    expect(headerLine).toBe(
      "CT number,Candidate / product name,Title,Description,CT phase," +
        "CT status,Locations,CT results status,Start date,End date," +
        "Sponsor,Collaborator,Source",
    );
    expectMatchesFixture(csv, "clinical-trials.csv");
  });

  it("active trials CSV matches fixture", async () => {
    const { nodes } = await fetchAllPages<TrialNode>(
      TRIALS_QUERY,
      "clinicalTrials",
      { statuses: ["Active"] },
    );

    const csv = buildTestCSV(TRIAL_CSV_COLUMNS, nodes);
    nodes.forEach((node) => {
      expect(node.status).toBe("Active");
    });
    expectMatchesFixture(csv, "clinical-trials-active.csv");
  });
});

describe("CSV export — rdPrioritiesWithCandidates (R&D Priorities tab)", () => {
  it("returns all priority column fields", async () => {
    const { data } = await query<{
      rdPrioritiesWithCandidates: PriorityWithCandidateConnection;
    }>(RD_PRIORITIES_WITH_CANDIDATES_QUERY, { limit: 1 });

    expect(data.rdPrioritiesWithCandidates.totalCount).toBeGreaterThan(0);
    const node = data.rdPrioritiesWithCandidates.nodes[0];
    for (const col of RD_PRIORITY_WITH_CANDIDATE_CSV_COLUMNS) {
      expect(node).toHaveProperty(col.accessor);
    }
  });

  it("GHA filter narrows results", async () => {
    const { data: allData } = await query<{
      rdPrioritiesWithCandidates: PriorityWithCandidateConnection;
    }>(RD_PRIORITIES_WITH_CANDIDATES_QUERY, { limit: 1 });

    const { data: filtered } = await query<{
      rdPrioritiesWithCandidates: PriorityWithCandidateConnection;
    }>(RD_PRIORITIES_WITH_CANDIDATES_QUERY, {
      filter: { global_health_areas: ["Emerging infectious disease"] },
      limit: 5,
    });

    expect(filtered.rdPrioritiesWithCandidates.totalCount).toBeGreaterThan(0);
    expect(filtered.rdPrioritiesWithCandidates.totalCount).toBeLessThanOrEqual(
      allData.rdPrioritiesWithCandidates.totalCount,
    );
  });

  it("R&D priorities CSV matches fixture", async () => {
    const { nodes } = await fetchAllPages<PriorityWithCandidateNode>(
      RD_PRIORITIES_WITH_CANDIDATES_QUERY,
      "rdPrioritiesWithCandidates",
    );

    const csv = buildTestCSV(RD_PRIORITY_WITH_CANDIDATE_CSV_COLUMNS, nodes);
    const headerLine = csv.split("\n")[0];
    expect(headerLine).toBe(
      "Priority ID,Title,TPP/PPC,Disease,Product," +
        "Global Health area,Author,Publication data,Indication," +
        "Intended use,Target population,Efficacy,Safety,Source," +
        "Candidate name,RD Stage",
    );
    expectMatchesFixture(csv, "rd-priorities.csv");
  });
});

describe("CSV export — rdPriorities (R&D Only tab)", () => {
  it("returns all priority column fields", async () => {
    const { data } = await query<{
      rdPriorities: PriorityConnection;
    }>(RD_PRIORITIES_QUERY, { limit: 1 });

    expect(data.rdPriorities.totalCount).toBeGreaterThan(0);
    const node = data.rdPriorities.nodes[0];
    for (const col of RD_PRIORITY_ONLY_CSV_COLUMNS) {
      expect(node).toHaveProperty(col.accessor);
    }
  });

  it("GHA filter narrows results", async () => {
    const { data: allData } = await query<{
      rdPriorities: PriorityConnection;
    }>(RD_PRIORITIES_QUERY, { limit: 1 });

    const { data: filtered } = await query<{
      rdPriorities: PriorityConnection;
    }>(RD_PRIORITIES_QUERY, {
      filter: { global_health_areas: ["Emerging infectious disease"] },
      limit: 5,
    });

    expect(filtered.rdPriorities.totalCount).toBeGreaterThan(0);
    expect(filtered.rdPriorities.totalCount).toBeLessThanOrEqual(
      allData.rdPriorities.totalCount,
    );
  });

  it("R&D only CSV matches fixture", async () => {
    const { nodes } = await fetchAllPages<PriorityNode>(
      RD_PRIORITIES_QUERY,
      "rdPriorities",
    );

    const csv = buildTestCSV(RD_PRIORITY_ONLY_CSV_COLUMNS, nodes);
    const headerLine = csv.split("\n")[0];
    expect(headerLine).toBe(
      "Priority ID,Title,TPP/PPC,Disease,Product," +
        "Global Health area,Author,Publication data,Indication," +
        "Intended use,Target population,Efficacy,Safety,Source",
    );
    expectMatchesFixture(csv, "rd-only.csv");
  });
});
