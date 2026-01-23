import type { Loaders } from "../utils/dataloader.js";
import type { DimCandidateCore, CandidateFilter } from "../db/types.js";

import { getPortfolioKPIs } from "../db/queries/kpis.js";
import { getGlobalHealthAreaSummaries } from "../db/queries/globalHealthArea.js";
import { getPhaseDistribution } from "../db/queries/phaseDistribution.js";
import {
  getGeographicDistribution,
  getLocationScopes,
} from "../db/queries/geographic.js";
import {
  getTemporalSnapshots,
  getAvailableYears,
} from "../db/queries/temporal.js";
import { getCandidates, getCandidateByKey } from "../db/queries/candidates.js";
import {
  getDiseases,
  getPhases,
  getProducts,
  getCountries,
} from "../db/queries/lookups.js";

// Context type for resolvers
interface Context {
  loaders: Loaders;
}

export const resolvers = {
  Query: {
    // KPIs (3 homepage cards)
    portfolioKPIs: () => getPortfolioKPIs(),

    // Bubble chart
    globalHealthAreaSummaries: () => getGlobalHealthAreaSummaries(),

    // Stacked bar chart
    phaseDistribution: (
      _: unknown,
      args: { global_health_area?: string; product_key?: number }
    ) =>
      getPhaseDistribution({
        global_health_area: args.global_health_area,
        product_key: args.product_key,
      }),

    // Map
    geographicDistribution: (
      _: unknown,
      args: { location_scope: string }
    ) => getGeographicDistribution(args.location_scope),

    // Cross-pipeline temporal
    temporalSnapshots: (
      _: unknown,
      args: { years?: number[]; disease_key?: number }
    ) =>
      getTemporalSnapshots({
        years: args.years,
        disease_key: args.disease_key,
      }),

    // Lists with pagination
    candidates: (
      _: unknown,
      args: { filter?: CandidateFilter; limit?: number; offset?: number }
    ) => getCandidates(args.filter, args.limit ?? 20, args.offset ?? 0),

    // Detail
    candidate: (_: unknown, args: { candidate_key: number }) =>
      getCandidateByKey(args.candidate_key),

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
    disease: async (parent: DimCandidateCore, _: unknown, ctx: Context) => {
      // Get the snapshot to find disease_key
      const snapshot = await ctx.loaders.snapshotByCandidateLoader.load(
        parent.candidate_key
      );
      if (!snapshot?.disease_key) return null;
      return ctx.loaders.diseaseLoader.load(snapshot.disease_key);
    },

    phase: async (parent: DimCandidateCore, _: unknown, ctx: Context) => {
      const snapshot = await ctx.loaders.snapshotByCandidateLoader.load(
        parent.candidate_key
      );
      if (!snapshot?.phase_key) return null;
      return ctx.loaders.phaseLoader.load(snapshot.phase_key);
    },

    product: async (parent: DimCandidateCore, _: unknown, ctx: Context) => {
      const snapshot = await ctx.loaders.snapshotByCandidateLoader.load(
        parent.candidate_key
      );
      if (!snapshot?.product_key) return null;
      return ctx.loaders.productLoader.load(snapshot.product_key);
    },

    developers: (parent: DimCandidateCore, _: unknown, ctx: Context) =>
      ctx.loaders.developersByCandidateLoader.load(parent.candidate_key),

    geographies: (parent: DimCandidateCore, _: unknown, ctx: Context) =>
      ctx.loaders.geographiesByCandidateLoader.load(parent.candidate_key),

    priorities: (parent: DimCandidateCore, _: unknown, ctx: Context) =>
      ctx.loaders.prioritiesByCandidateLoader.load(parent.candidate_key),

    clinicalTrials: (parent: DimCandidateCore, _: unknown, ctx: Context) =>
      ctx.loaders.clinicalTrialsByCandidateLoader.load(parent.candidate_key),
  },
};
