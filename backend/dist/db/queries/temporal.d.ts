import type { TemporalSnapshotRow } from "../types.js";
interface TemporalSnapshotFilters {
    years?: number[];
    disease_key?: number;
}
/**
 * Get temporal snapshots for cross-pipeline analysis.
 * Returns candidate counts by year and phase.
 */
export declare function getTemporalSnapshots(filters?: TemporalSnapshotFilters): TemporalSnapshotRow[];
/**
 * Get available years in the dataset.
 */
export declare function getAvailableYears(): number[];
export {};
//# sourceMappingURL=temporal.d.ts.map