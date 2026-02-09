import type { GeographicDistributionRow } from "../types.js";
/**
 * Get geographic distribution for map visualization.
 * Returns candidate counts grouped by country for a specific location scope.
 *
 * @param location_scope - "Trial Location", "Target Country", or "Developer Location"
 */
export declare function getGeographicDistribution(location_scope: string): GeographicDistributionRow[];
/**
 * Get distinct location scopes available in the data.
 */
export declare function getLocationScopes(): string[];
//# sourceMappingURL=geographic.d.ts.map