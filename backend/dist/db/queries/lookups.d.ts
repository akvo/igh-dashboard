import type { DimDisease, DimPhase, DimProduct, DimGeography, DimDeveloper, DimPriority, FactClinicalTrialEvent, CandidateGeography } from "../types.js";
/**
 * Get all diseases for filter dropdown.
 */
export declare function getDiseases(): DimDisease[];
/**
 * Get a disease by key.
 */
export declare function getDiseaseByKey(disease_key: number): DimDisease | null;
/**
 * Get all phases for filter dropdown.
 */
export declare function getPhases(): DimPhase[];
/**
 * Get a phase by key.
 */
export declare function getPhaseByKey(phase_key: number): DimPhase | null;
/**
 * Get all products for filter dropdown.
 */
export declare function getProducts(): DimProduct[];
/**
 * Get a product by key.
 */
export declare function getProductByKey(product_key: number): DimProduct | null;
/**
 * Get all countries for filter dropdown.
 */
export declare function getCountries(): DimGeography[];
/**
 * Get developers for a candidate via bridge table.
 */
export declare function getDevelopersByCandidateKey(candidate_key: number): DimDeveloper[];
/**
 * Get priorities for a candidate via bridge table.
 */
export declare function getPrioritiesByCandidateKey(candidate_key: number): DimPriority[];
/**
 * Get geographies for a candidate via bridge table.
 */
export declare function getGeographiesByCandidateKey(candidate_key: number): CandidateGeography[];
/**
 * Get clinical trials for a candidate.
 */
export declare function getClinicalTrialsByCandidateKey(candidate_key: number): FactClinicalTrialEvent[];
//# sourceMappingURL=lookups.d.ts.map