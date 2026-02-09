import DataLoader from "dataloader";
import type { DimDisease, DimPhase, DimProduct, DimDeveloper, DimPriority, CandidateGeography, FactClinicalTrialEvent, FactPipelineSnapshot } from "../db/types.js";
/**
 * Create DataLoaders for batch loading related entities.
 * Prevents N+1 query problems when resolving nested relationships.
 */
export declare function createLoaders(): {
    diseaseLoader: DataLoader<number, DimDisease | null, number>;
    phaseLoader: DataLoader<number, DimPhase | null, number>;
    productLoader: DataLoader<number, DimProduct | null, number>;
    developersByCandidateLoader: DataLoader<number, DimDeveloper[], number>;
    prioritiesByCandidateLoader: DataLoader<number, DimPriority[], number>;
    geographiesByCandidateLoader: DataLoader<number, CandidateGeography[], number>;
    clinicalTrialsByCandidateLoader: DataLoader<number, FactClinicalTrialEvent[], number>;
    snapshotByCandidateLoader: DataLoader<number, FactPipelineSnapshot | null, number>;
};
export type Loaders = ReturnType<typeof createLoaders>;
//# sourceMappingURL=dataloader.d.ts.map