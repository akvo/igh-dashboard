/**
 * Unit tests for candidates query logic.
 * Mocks the database — no real DB access.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getDatabase before importing the module under test
const mockGet = vi.fn();
const mockAll = vi.fn();

vi.mock("../../../../src/db/connection.js", () => ({
  getDatabase: vi.fn(() => ({
    prepare: vi.fn(() => ({
      get: mockGet,
      all: mockAll,
    })),
  })),
}));

import { getCandidates, getCandidateByKey } from "../../../../src/db/queries/candidates.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getCandidates", () => {
  it("caps limit at 100", () => {
    mockGet.mockReturnValue({ total: 0 });
    mockAll.mockReturnValue([]);

    getCandidates(undefined, 200, 0);

    // The last two args to .all() are limit and offset
    const allCallArgs = mockAll.mock.calls[0];
    const limitArg = allCallArgs[allCallArgs.length - 2];
    expect(limitArg).toBe(100);
  });

  it("hasNextPage is true when more results exist", () => {
    mockGet.mockReturnValue({ total: 50 });
    mockAll.mockReturnValue(
      Array.from({ length: 20 }, (_, i) => ({
        candidate_key: i + 1,
        candidate_name: `Candidate ${i + 1}`,
        vin_candidateid: null,
        vin_candidate_code: null,
        developers_agg: null,
      })),
    );

    const result = getCandidates(undefined, 20, 0);

    expect(result.hasNextPage).toBe(true);
    expect(result.totalCount).toBe(50);
  });

  it("hasNextPage is false when all results are returned", () => {
    mockGet.mockReturnValue({ total: 5 });
    mockAll.mockReturnValue(
      Array.from({ length: 5 }, (_, i) => ({
        candidate_key: i + 1,
        candidate_name: `Candidate ${i + 1}`,
        vin_candidateid: null,
        vin_candidate_code: null,
        developers_agg: null,
      })),
    );

    const result = getCandidates(undefined, 20, 0);

    expect(result.hasNextPage).toBe(false);
    expect(result.totalCount).toBe(5);
  });

  it("defaults to is_active_flag = 1 when no filter provided", () => {
    mockGet.mockReturnValue({ total: 0 });
    mockAll.mockReturnValue([]);

    getCandidates();

    // The count query should have is_active_flag = 1 in it
    // We verify by checking no is_active param was explicitly passed but the query still runs
    // The get() call is for count — its args should be empty (no filter params besides is_active default)
    expect(mockGet).toHaveBeenCalledTimes(1);
    // No explicit params for is_active (it's baked into the WHERE clause as a literal)
    expect(mockGet.mock.calls[0]).toEqual([]);
  });

  it("uses is_active_flag = 0 when filter.is_active is false", () => {
    mockGet.mockReturnValue({ total: 0 });
    mockAll.mockReturnValue([]);

    getCandidates({ is_active: false }, 20, 0);

    // When is_active is explicitly set, it's a parameterised ? with value 0
    const getCallArgs = mockGet.mock.calls[0];
    expect(getCallArgs).toContain(0);
  });

  it("uses is_active_flag = 1 when filter.is_active is true", () => {
    mockGet.mockReturnValue({ total: 0 });
    mockAll.mockReturnValue([]);

    getCandidates({ is_active: true }, 20, 0);

    const getCallArgs = mockGet.mock.calls[0];
    expect(getCallArgs).toContain(1);
  });
});

describe("getCandidateByKey", () => {
  it("returns a candidate when found", () => {
    const mockCandidate = {
      candidate_key: 42,
      candidate_name: "Test Candidate",
      vin_candidateid: "VIN-42",
      vin_candidate_code: "TC",
      developers_agg: "Org A",
    };
    mockGet.mockReturnValue(mockCandidate);

    const result = getCandidateByKey(42);

    expect(result).toEqual(mockCandidate);
    expect(mockGet).toHaveBeenCalledWith(42);
  });

  it("returns null when candidate not found", () => {
    mockGet.mockReturnValue(undefined);

    const result = getCandidateByKey(999999);

    expect(result).toBeNull();
  });
});
