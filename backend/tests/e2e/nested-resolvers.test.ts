/**
 * E2E Tests — Nested resolvers on DimCandidateCore.
 */

import { describe, it, expect } from "vitest";
import { query } from "../helpers/graphql.js";
import type {
  CandidateConnection,
  CandidateDetail,
  DimDisease,
  DimPhase,
  DimProduct,
  DimDeveloper,
  CandidateGeography,
  DimPriority,
  FactClinicalTrialEvent,
} from "../helpers/types.js";

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

describe("Nested Resolvers — disease", () => {
  it("resolves disease on a candidate", async () => {
    const { data } = await query<{
      candidates: {
        nodes: Array<{ candidate_key: number; disease: DimDisease | null }>;
      };
    }>(`{
      candidates(limit: 50) {
        nodes {
          candidate_key
          disease {
            disease_key
            disease_name
            global_health_area
          }
        }
      }
    }`);

    const withDisease = data.candidates.nodes.find((c) => c.disease !== null);
    expect(withDisease).toBeDefined();
    expect(withDisease!.disease!.disease_key).toBeDefined();
    expect(typeof withDisease!.disease!.disease_name).toBe("string");
  });
});

describe("Nested Resolvers — phase and product", () => {
  it("resolves phase on a candidate", async () => {
    const { data } = await query<{
      candidates: {
        nodes: Array<{ candidate_key: number; phase: DimPhase | null }>;
      };
    }>(`{
      candidates(limit: 50) {
        nodes {
          candidate_key
          phase {
            phase_key
            phase_name
            sort_order
          }
        }
      }
    }`);

    const withPhase = data.candidates.nodes.find((c) => c.phase !== null);
    expect(withPhase).toBeDefined();
    expect(withPhase!.phase!.phase_key).toBeDefined();
  });

  it("resolves product on a candidate", async () => {
    const { data } = await query<{
      candidates: {
        nodes: Array<{ candidate_key: number; product: DimProduct | null }>;
      };
    }>(`{
      candidates(limit: 50) {
        nodes {
          candidate_key
          product {
            product_key
            product_name
          }
        }
      }
    }`);

    const withProduct = data.candidates.nodes.find((c) => c.product !== null);
    expect(withProduct).toBeDefined();
    expect(withProduct!.product!.product_key).toBeDefined();
  });
});

describe("Nested Resolvers — developers and geographies", () => {
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

    const { data } = await query<{
      candidate: { geographies: CandidateGeography[] } | null;
    }>(
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
});

describe("Nested Resolvers — priorities and clinical trials", () => {
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
});

describe("Nested Resolvers — DataLoader batching", () => {
  it("resolves all nested fields in a single query", async () => {
    const { data } = await query<{ candidates: { nodes: CandidateDetail[] } }>(`{
      candidates(limit: 3) {
        nodes {
          candidate_key
          candidate_name
          disease { disease_key disease_name global_health_area }
          phase { phase_key phase_name sort_order }
          product { product_key product_name }
          developers { developer_key developer_name }
          geographies { country_key country_name iso_code location_scope }
          priorities { priority_key priority_name }
          clinicalTrials { trial_id trial_phase status }
        }
      }
    }`);

    expect(data.candidates.nodes.length).toBeGreaterThan(0);

    for (const candidate of data.candidates.nodes) {
      expect(candidate.candidate_key).toBeDefined();
      expect(Array.isArray(candidate.developers)).toBe(true);
      expect(Array.isArray(candidate.geographies)).toBe(true);
      expect(Array.isArray(candidate.priorities)).toBe(true);
      expect(Array.isArray(candidate.clinicalTrials)).toBe(true);
    }
  });
});

describe("Nested Resolvers — batch non-null check", () => {
  it("batch query has at least one non-null disease, phase, and product", async () => {
    const { data } = await query<{ candidates: { nodes: CandidateDetail[] } }>(`{
      candidates(limit: 50) {
        nodes {
          candidate_key
          disease { disease_key disease_name }
          phase { phase_key phase_name }
          product { product_key product_name }
        }
      }
    }`);

    expect(data.candidates.nodes.length).toBeGreaterThan(0);
    expect(data.candidates.nodes.some((c) => c.disease !== null)).toBe(true);
    expect(data.candidates.nodes.some((c) => c.phase !== null)).toBe(true);
    expect(data.candidates.nodes.some((c) => c.product !== null)).toBe(true);
  });
});
