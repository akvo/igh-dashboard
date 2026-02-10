/**
 * Fixture Capture Script
 *
 * Runs each query against the real API and saves responses as JSON fixtures.
 * Run with: npm run test:capture
 */

import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ApolloServer } from "@apollo/server";
import { typeDefs } from "../../src/schema/typeDefs.js";
import { resolvers } from "../../src/schema/resolvers.js";
import { createLoaders } from "../../src/utils/dataloader.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Ensure fixtures directory exists
mkdirSync(__dirname, { recursive: true });

// Queries to capture
const QUERIES: Record<string, { query: string; variables?: Record<string, unknown> }> = {
  portfolioKPIs: {
    query: `{
      portfolioKPIs {
        totalDiseases
        totalCandidates
        approvedProducts
      }
    }`,
  },

  globalHealthAreaSummaries: {
    query: `{
      globalHealthAreaSummaries {
        global_health_area
        candidateCount
        diseaseCount
        productCount
      }
    }`,
  },

  "geographicDistribution-trials": {
    query: `{
      geographicDistribution(location_scope: "Trial Location") {
        country_key
        country_name
        iso_code
        location_scope
        candidateCount
      }
    }`,
  },

  "geographicDistribution-dev": {
    query: `{
      geographicDistribution(location_scope: "Developer Location") {
        country_key
        country_name
        iso_code
        location_scope
        candidateCount
      }
    }`,
  },

  phaseDistribution: {
    query: `{
      phaseDistribution {
        global_health_area
        phase_name
        sort_order
        candidateCount
      }
    }`,
  },

  "phaseDistribution-filtered": {
    query: `{
      phaseDistribution(global_health_area: "Neglected disease") {
        global_health_area
        phase_name
        sort_order
        candidateCount
      }
    }`,
  },

  filterOptions: {
    query: `{
      products {
        product_key
        product_name
      }
      availableYears
      locationScopes
    }`,
  },

  "candidates-default": {
    query: `{
      candidates(limit: 5) {
        nodes {
          candidate_key
          candidate_name
          vin_candidateid
          vin_candidate_code
          developers_agg
        }
        totalCount
        hasNextPage
      }
    }`,
  },

  "candidates-filtered": {
    query: `{
      candidates(filter: { global_health_area: "Neglected disease" }, limit: 5) {
        nodes {
          candidate_key
          candidate_name
        }
        totalCount
        hasNextPage
      }
    }`,
  },
};

async function captureFixtures() {
  console.log("Starting fixture capture...\n");

  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  // First, get available years for temporal query
  const yearsResponse = await server.executeOperation(
    { query: `{ availableYears }` },
    { contextValue: { loaders: createLoaders() } },
  );

  let availableYears: number[] = [];
  if (yearsResponse.body.kind === "single" && yearsResponse.body.singleResult.data) {
    availableYears = (yearsResponse.body.singleResult.data as { availableYears: number[] })
      .availableYears;
  }

  // Add temporal query with actual years from the database
  const yearsToCapture = availableYears.slice(0, 5); // Take first 5 years
  QUERIES["temporalSnapshots"] = {
    query: `query GetSnapshots($years: [Int!]) {
      temporalSnapshots(years: $years) {
        year
        phase_name
        sort_order
        candidateCount
      }
    }`,
    variables: { years: yearsToCapture },
  };

  // Get a candidate key for the detail fixture
  const candidateListResponse = await server.executeOperation(
    {
      query: `{ candidates(limit: 1) { nodes { candidate_key } } }`,
    },
    { contextValue: { loaders: createLoaders() } },
  );

  let firstCandidateKey: number | null = null;
  if (
    candidateListResponse.body.kind === "single" &&
    candidateListResponse.body.singleResult.data
  ) {
    const listData = candidateListResponse.body.singleResult.data as {
      candidates: { nodes: Array<{ candidate_key: number }> };
    };
    if (listData.candidates.nodes.length > 0) {
      firstCandidateKey = listData.candidates.nodes[0].candidate_key;
    }
  }

  if (firstCandidateKey !== null) {
    QUERIES["candidate-detail"] = {
      query: `query GetCandidate($key: Int!) {
        candidate(candidate_key: $key) {
          candidate_key
          candidate_name
          vin_candidateid
          vin_candidate_code
          developers_agg
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
            indication
            intended_use
          }
          clinicalTrials {
            trial_id
            trial_phase
            enrollment_count
            status
          }
        }
      }`,
      variables: { key: firstCandidateKey },
    };
  }

  const results: Record<string, unknown> = {};

  for (const [name, { query, variables }] of Object.entries(QUERIES)) {
    try {
      const response = await server.executeOperation(
        { query, variables },
        { contextValue: { loaders: createLoaders() } },
      );

      if (response.body.kind === "single") {
        const { data, errors } = response.body.singleResult;

        if (errors && errors.length > 0) {
          console.error(`❌ ${name}: ${errors.map((e) => e.message).join(", ")}`);
          continue;
        }

        results[name] = data;

        // Write individual fixture file
        const filePath = join(__dirname, `${name}.json`);
        writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`✅ ${name}.json`);
      }
    } catch (error) {
      console.error(`❌ ${name}: ${error}`);
    }
  }

  // Write combined fixtures file
  const combinedPath = join(__dirname, "_all.json");
  writeFileSync(combinedPath, JSON.stringify(results, null, 2));
  console.log(`\n✅ _all.json (combined)`);

  console.log("\nFixture capture complete!");
  console.log(`\nCaptured ${Object.keys(results).length} fixtures.`);

  // Validation summary
  console.log("\n--- Validation Summary ---");
  validateFixtures(results);
}

function validateFixtures(fixtures: Record<string, unknown>) {
  const checks: Array<{ name: string; pass: boolean; message: string }> = [];

  // portfolioKPIs: 3 non-negative integers
  const kpis = fixtures.portfolioKPIs as
    | {
        portfolioKPIs: { totalDiseases: number; totalCandidates: number; approvedProducts: number };
      }
    | undefined;
  if (kpis?.portfolioKPIs) {
    const { totalDiseases, totalCandidates, approvedProducts } = kpis.portfolioKPIs;
    checks.push({
      name: "portfolioKPIs",
      pass: totalDiseases >= 0 && totalCandidates >= 0 && approvedProducts >= 0,
      message: `totalDiseases=${totalDiseases}, totalCandidates=${totalCandidates}, approvedProducts=${approvedProducts}`,
    });
  }

  // globalHealthAreaSummaries: Exactly 3 items
  const summaries = fixtures.globalHealthAreaSummaries as
    | { globalHealthAreaSummaries: Array<{ global_health_area: string }> }
    | undefined;
  if (summaries?.globalHealthAreaSummaries) {
    checks.push({
      name: "globalHealthAreaSummaries",
      pass: summaries.globalHealthAreaSummaries.length === 3,
      message: `${summaries.globalHealthAreaSummaries.length} areas: ${summaries.globalHealthAreaSummaries.map((s) => s.global_health_area).join(", ")}`,
    });
  }

  // geographicDistribution-trials: Has iso_code
  const trials = fixtures["geographicDistribution-trials"] as
    | { geographicDistribution: Array<{ iso_code: string | null }> }
    | undefined;
  if (trials?.geographicDistribution) {
    const withIso = trials.geographicDistribution.filter((r) => r.iso_code).length;
    checks.push({
      name: "geographicDistribution-trials",
      pass: withIso > 0,
      message: `${trials.geographicDistribution.length} countries, ${withIso} with ISO codes`,
    });
  }

  // phaseDistribution: Has sort_order
  const phases = fixtures.phaseDistribution as
    | { phaseDistribution: Array<{ sort_order: number }> }
    | undefined;
  if (phases?.phaseDistribution) {
    const allHaveSortOrder = phases.phaseDistribution.every(
      (r) => typeof r.sort_order === "number",
    );
    checks.push({
      name: "phaseDistribution",
      pass: allHaveSortOrder && phases.phaseDistribution.length > 0,
      message: `${phases.phaseDistribution.length} rows, all have sort_order: ${allHaveSortOrder}`,
    });
  }

  // temporalSnapshots: Multiple years
  const temporal = fixtures.temporalSnapshots as
    | { temporalSnapshots: Array<{ year: number }> }
    | undefined;
  if (temporal?.temporalSnapshots) {
    const years = [...new Set(temporal.temporalSnapshots.map((r) => r.year))];
    checks.push({
      name: "temporalSnapshots",
      pass: years.length > 0,
      message: `Years: ${years.sort().join(", ")}`,
    });
  }

  // filterOptions: Non-empty products and years
  const filters = fixtures.filterOptions as
    | { products: unknown[]; availableYears: number[]; locationScopes: string[] }
    | undefined;
  if (filters) {
    checks.push({
      name: "filterOptions.products",
      pass: filters.products.length > 0,
      message: `${filters.products.length} products`,
    });
    checks.push({
      name: "filterOptions.availableYears",
      pass: filters.availableYears.length > 0,
      message: `Years: ${filters.availableYears.join(", ")}`,
    });
    checks.push({
      name: "filterOptions.locationScopes",
      pass: filters.locationScopes.length >= 2,
      message: `Scopes: ${filters.locationScopes.join(", ")}`,
    });
  }

  // Print results
  checks.forEach(({ name, pass, message }) => {
    const icon = pass ? "✅" : "❌";
    console.log(`${icon} ${name}: ${message}`);
  });
}

// Run the capture
captureFixtures().catch(console.error);
