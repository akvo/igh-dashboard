import type { DimCandidateCore, CandidateConnection, CandidateFilter, FactPipelineSnapshot } from "../types.js";
/**
 * Get candidates with filtering and pagination.
 */
export declare function getCandidates(filter?: CandidateFilter, limit?: number, offset?: number): CandidateConnection;
/**
 * Get a single candidate by key.
 */
export declare function getCandidateByKey(candidate_key: number): DimCandidateCore | null;
/**
 * Get the pipeline snapshot for a candidate (for joining related dimensions).
 */
export declare function getCandidateSnapshot(candidate_key: number): FactPipelineSnapshot | null;
//# sourceMappingURL=candidates.d.ts.map