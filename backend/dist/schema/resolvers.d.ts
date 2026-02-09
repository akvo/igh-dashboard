import type { Loaders } from "../utils/dataloader.js";
import type { DimCandidateCore, CandidateFilter } from "../db/types.js";
interface Context {
    loaders: Loaders;
}
export declare const resolvers: {
    Query: {
        portfolioKPIs: () => import("../db/types.js").PortfolioKPIs;
        globalHealthAreaSummaries: () => import("../db/types.js").GlobalHealthAreaSummary[];
        phaseDistribution: (_: unknown, args: {
            global_health_area?: string;
            product_key?: number;
        }) => import("../db/types.js").PhaseDistributionRow[];
        geographicDistribution: (_: unknown, args: {
            location_scope: string;
        }) => import("../db/types.js").GeographicDistributionRow[];
        temporalSnapshots: (_: unknown, args: {
            years?: number[];
            disease_key?: number;
        }) => import("../db/types.js").TemporalSnapshotRow[];
        candidates: (_: unknown, args: {
            filter?: CandidateFilter;
            limit?: number;
            offset?: number;
        }) => import("../db/types.js").CandidateConnection;
        candidate: (_: unknown, args: {
            candidate_key: number;
        }) => DimCandidateCore | null;
        diseases: () => import("../db/types.js").DimDisease[];
        phases: () => import("../db/types.js").DimPhase[];
        products: () => import("../db/types.js").DimProduct[];
        countries: () => import("../db/types.js").DimGeography[];
        availableYears: () => number[];
        locationScopes: () => string[];
    };
    DimCandidateCore: {
        disease: (parent: DimCandidateCore, _: unknown, ctx: Context) => Promise<import("../db/types.js").DimDisease | null>;
        phase: (parent: DimCandidateCore, _: unknown, ctx: Context) => Promise<import("../db/types.js").DimPhase | null>;
        product: (parent: DimCandidateCore, _: unknown, ctx: Context) => Promise<import("../db/types.js").DimProduct | null>;
        developers: (parent: DimCandidateCore, _: unknown, ctx: Context) => Promise<import("../db/types.js").DimDeveloper[]>;
        geographies: (parent: DimCandidateCore, _: unknown, ctx: Context) => Promise<import("../db/types.js").CandidateGeography[]>;
        priorities: (parent: DimCandidateCore, _: unknown, ctx: Context) => Promise<import("../db/types.js").DimPriority[]>;
        clinicalTrials: (parent: DimCandidateCore, _: unknown, ctx: Context) => Promise<import("../db/types.js").FactClinicalTrialEvent[]>;
    };
};
export {};
//# sourceMappingURL=resolvers.d.ts.map