import type { PhaseDistributionRow } from "../types.js";
interface PhaseDistributionFilters {
    global_health_area?: string;
    product_key?: number;
}
/**
 * Get phase distribution for stacked bar chart visualization.
 * Returns candidate counts grouped by global health area and phase.
 */
export declare function getPhaseDistribution(filters?: PhaseDistributionFilters): PhaseDistributionRow[];
export {};
//# sourceMappingURL=phaseDistribution.d.ts.map