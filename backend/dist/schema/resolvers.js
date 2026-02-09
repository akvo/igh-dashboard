import { getPortfolioKPIs } from "../db/queries/kpis.js";
import { getGlobalHealthAreaSummaries } from "../db/queries/globalHealthArea.js";
import { getPhaseDistribution } from "../db/queries/phaseDistribution.js";
import { getGeographicDistribution, getLocationScopes } from "../db/queries/geographic.js";
import { getTemporalSnapshots, getAvailableYears } from "../db/queries/temporal.js";
import { getCandidates, getCandidateByKey } from "../db/queries/candidates.js";
import { getDiseases, getPhases, getProducts, getCountries } from "../db/queries/lookups.js";
export const resolvers = {
    Query: {
        // KPIs (3 homepage cards)
        portfolioKPIs: () => getPortfolioKPIs(),
        // Bubble chart
        globalHealthAreaSummaries: () => getGlobalHealthAreaSummaries(),
        // Stacked bar chart
        phaseDistribution: (_, args) => getPhaseDistribution({
            global_health_area: args.global_health_area,
            product_key: args.product_key,
        }),
        // Map
        geographicDistribution: (_, args) => getGeographicDistribution(args.location_scope),
        // Cross-pipeline temporal
        temporalSnapshots: (_, args) => getTemporalSnapshots({
            years: args.years,
            disease_key: args.disease_key,
        }),
        // Lists with pagination
        candidates: (_, args) => getCandidates(args.filter, args.limit ?? 20, args.offset ?? 0),
        // Detail
        candidate: (_, args) => getCandidateByKey(args.candidate_key),
        // Filter dropdowns
        diseases: () => getDiseases(),
        phases: () => getPhases(),
        products: () => getProducts(),
        countries: () => getCountries(),
        availableYears: () => getAvailableYears(),
        locationScopes: () => getLocationScopes(),
    },
    // Resolve nested relationships on DimCandidateCore
    DimCandidateCore: {
        disease: async (parent, _, ctx) => {
            // Get the snapshot to find disease_key
            const snapshot = await ctx.loaders.snapshotByCandidateLoader.load(parent.candidate_key);
            if (!snapshot?.disease_key)
                return null;
            return ctx.loaders.diseaseLoader.load(snapshot.disease_key);
        },
        phase: async (parent, _, ctx) => {
            const snapshot = await ctx.loaders.snapshotByCandidateLoader.load(parent.candidate_key);
            if (!snapshot?.phase_key)
                return null;
            return ctx.loaders.phaseLoader.load(snapshot.phase_key);
        },
        product: async (parent, _, ctx) => {
            const snapshot = await ctx.loaders.snapshotByCandidateLoader.load(parent.candidate_key);
            if (!snapshot?.product_key)
                return null;
            return ctx.loaders.productLoader.load(snapshot.product_key);
        },
        developers: (parent, _, ctx) => ctx.loaders.developersByCandidateLoader.load(parent.candidate_key),
        geographies: (parent, _, ctx) => ctx.loaders.geographiesByCandidateLoader.load(parent.candidate_key),
        priorities: (parent, _, ctx) => ctx.loaders.prioritiesByCandidateLoader.load(parent.candidate_key),
        clinicalTrials: (parent, _, ctx) => ctx.loaders.clinicalTrialsByCandidateLoader.load(parent.candidate_key),
    },
};
//# sourceMappingURL=resolvers.js.map