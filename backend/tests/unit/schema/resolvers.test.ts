/**
 * Unit tests for DimCandidateCore nested resolvers.
 * Mocks DataLoaders — no real DB access.
 */

import { describe, it, expect, vi } from "vitest";
import { resolvers } from "../../../src/schema/resolvers.js";
import type { DimCandidateCore } from "../../../src/db/types.js";

// Shorthand for the nested resolvers
const { DimCandidateCore: candidateResolvers } = resolvers;

function makeParent(overrides?: Partial<DimCandidateCore>): DimCandidateCore {
  return {
    candidate_key: 1,
    vin_candidateid: null,
    candidate_name: "Test",
    vin_candidate_code: null,
    developers_agg: null,
    ...overrides,
  };
}

function makeContext(loaderOverrides: Record<string, { load: ReturnType<typeof vi.fn> }> = {}) {
  return {
    loaders: {
      diseaseLoader: { load: vi.fn() },
      phaseLoader: { load: vi.fn() },
      productLoader: { load: vi.fn() },
      developersByCandidateLoader: { load: vi.fn() },
      geographiesByCandidateLoader: { load: vi.fn() },
      prioritiesByCandidateLoader: { load: vi.fn() },
      clinicalTrialsByCandidateLoader: { load: vi.fn() },
      snapshotByCandidateLoader: { load: vi.fn() },
      ...loaderOverrides,
    },
  };
}

// =============================================================================
// disease resolver
// =============================================================================

describe("disease resolver", () => {
  it("returns disease when snapshot has disease_key", async () => {
    const disease = { disease_key: 10, disease_name: "Malaria", global_health_area: "Neglected disease" };
    const ctx = makeContext({
      snapshotByCandidateLoader: {
        load: vi.fn().mockResolvedValue({ disease_key: 10, phase_key: null, product_key: null }),
      },
      diseaseLoader: { load: vi.fn().mockResolvedValue(disease) },
    });

    const result = await candidateResolvers.disease(makeParent(), undefined, ctx);

    expect(result).toEqual(disease);
    expect(ctx.loaders.diseaseLoader.load).toHaveBeenCalledWith(10);
  });

  it("returns null when snapshot has no disease_key", async () => {
    const ctx = makeContext({
      snapshotByCandidateLoader: {
        load: vi.fn().mockResolvedValue({ disease_key: null, phase_key: null, product_key: null }),
      },
    });

    const result = await candidateResolvers.disease(makeParent(), undefined, ctx);

    expect(result).toBeNull();
    expect(ctx.loaders.diseaseLoader.load).not.toHaveBeenCalled();
  });

  it("returns null when no snapshot exists", async () => {
    const ctx = makeContext({
      snapshotByCandidateLoader: { load: vi.fn().mockResolvedValue(null) },
    });

    const result = await candidateResolvers.disease(makeParent(), undefined, ctx);

    expect(result).toBeNull();
  });
});

// =============================================================================
// phase resolver
// =============================================================================

describe("phase resolver", () => {
  it("returns phase when snapshot has phase_key", async () => {
    const phase = { phase_key: 3, phase_name: "Phase III", sort_order: 50 };
    const ctx = makeContext({
      snapshotByCandidateLoader: {
        load: vi.fn().mockResolvedValue({ disease_key: null, phase_key: 3, product_key: null }),
      },
      phaseLoader: { load: vi.fn().mockResolvedValue(phase) },
    });

    const result = await candidateResolvers.phase(makeParent(), undefined, ctx);

    expect(result).toEqual(phase);
    expect(ctx.loaders.phaseLoader.load).toHaveBeenCalledWith(3);
  });

  it("returns null when snapshot has no phase_key", async () => {
    const ctx = makeContext({
      snapshotByCandidateLoader: {
        load: vi.fn().mockResolvedValue({ disease_key: null, phase_key: null, product_key: null }),
      },
    });

    const result = await candidateResolvers.phase(makeParent(), undefined, ctx);

    expect(result).toBeNull();
    expect(ctx.loaders.phaseLoader.load).not.toHaveBeenCalled();
  });

  it("returns null when no snapshot exists", async () => {
    const ctx = makeContext({
      snapshotByCandidateLoader: { load: vi.fn().mockResolvedValue(null) },
    });

    const result = await candidateResolvers.phase(makeParent(), undefined, ctx);

    expect(result).toBeNull();
  });
});

// =============================================================================
// product resolver
// =============================================================================

describe("product resolver", () => {
  it("returns product when snapshot has product_key", async () => {
    const product = { product_key: 88, product_name: "Vaccine X" };
    const ctx = makeContext({
      snapshotByCandidateLoader: {
        load: vi.fn().mockResolvedValue({ disease_key: null, phase_key: null, product_key: 88 }),
      },
      productLoader: { load: vi.fn().mockResolvedValue(product) },
    });

    const result = await candidateResolvers.product(makeParent(), undefined, ctx);

    expect(result).toEqual(product);
    expect(ctx.loaders.productLoader.load).toHaveBeenCalledWith(88);
  });

  it("returns null when snapshot has no product_key", async () => {
    const ctx = makeContext({
      snapshotByCandidateLoader: {
        load: vi.fn().mockResolvedValue({ disease_key: null, phase_key: null, product_key: null }),
      },
    });

    const result = await candidateResolvers.product(makeParent(), undefined, ctx);

    expect(result).toBeNull();
    expect(ctx.loaders.productLoader.load).not.toHaveBeenCalled();
  });

  it("returns null when no snapshot exists", async () => {
    const ctx = makeContext({
      snapshotByCandidateLoader: { load: vi.fn().mockResolvedValue(null) },
    });

    const result = await candidateResolvers.product(makeParent(), undefined, ctx);

    expect(result).toBeNull();
  });
});

// =============================================================================
// Array resolvers (developers, geographies, priorities, clinicalTrials)
// =============================================================================

describe("developers resolver", () => {
  it("calls developersByCandidateLoader with parent.candidate_key", async () => {
    const devs = [{ developer_key: 1, developer_name: "Org A" }];
    const ctx = makeContext({
      developersByCandidateLoader: { load: vi.fn().mockResolvedValue(devs) },
    });
    const parent = makeParent({ candidate_key: 42 });

    const result = await candidateResolvers.developers(parent, undefined, ctx);

    expect(result).toEqual(devs);
    expect(ctx.loaders.developersByCandidateLoader.load).toHaveBeenCalledWith(42);
  });
});

describe("geographies resolver", () => {
  it("calls geographiesByCandidateLoader with parent.candidate_key", async () => {
    const geos = [{ country_key: 1, country_name: "Kenya", iso_code: "KE", location_scope: "Trial Location" }];
    const ctx = makeContext({
      geographiesByCandidateLoader: { load: vi.fn().mockResolvedValue(geos) },
    });
    const parent = makeParent({ candidate_key: 7 });

    const result = await candidateResolvers.geographies(parent, undefined, ctx);

    expect(result).toEqual(geos);
    expect(ctx.loaders.geographiesByCandidateLoader.load).toHaveBeenCalledWith(7);
  });
});

describe("priorities resolver", () => {
  it("calls prioritiesByCandidateLoader with parent.candidate_key", async () => {
    const pris = [{ priority_key: 5, priority_name: "High", indication: null, intended_use: null }];
    const ctx = makeContext({
      prioritiesByCandidateLoader: { load: vi.fn().mockResolvedValue(pris) },
    });
    const parent = makeParent({ candidate_key: 99 });

    const result = await candidateResolvers.priorities(parent, undefined, ctx);

    expect(result).toEqual(pris);
    expect(ctx.loaders.prioritiesByCandidateLoader.load).toHaveBeenCalledWith(99);
  });
});

describe("clinicalTrials resolver", () => {
  it("calls clinicalTrialsByCandidateLoader with parent.candidate_key", async () => {
    const trials = [{ trial_id: 1, candidate_key: 3, trial_phase: "Phase I", enrollment_count: 100, status: "Active" }];
    const ctx = makeContext({
      clinicalTrialsByCandidateLoader: { load: vi.fn().mockResolvedValue(trials) },
    });
    const parent = makeParent({ candidate_key: 3 });

    const result = await candidateResolvers.clinicalTrials(parent, undefined, ctx);

    expect(result).toEqual(trials);
    expect(ctx.loaders.clinicalTrialsByCandidateLoader.load).toHaveBeenCalledWith(3);
  });
});
