import type { Loaders } from "../utils/dataloader.js";
import type { DimCandidateCore, CandidateFilter } from "../db/types.js";

import { getPortfolioKPIs } from "../db/queries/kpis.js";
import { getGlobalHealthAreaSummaries } from "../db/queries/globalHealthArea.js";
import { getGhaProductTypeSummaries } from "../db/queries/ghaProductType.js";
import { getDiseaseSummaries } from "../db/queries/disease.js";
import { getDiseaseProductTypeSummaries } from "../db/queries/diseaseProductType.js";
import { getPhaseDistribution } from "../db/queries/phaseDistribution.js";
import { getCandidateTypeDistribution } from "../db/queries/candidateTypeDistribution.js";
import { getGeographicDistribution, getLocationScopes } from "../db/queries/geographic.js";
import {
  getTemporalSnapshots,
  getAvailableYears,
  getPipelineFilterPairs,
} from "../db/queries/temporal.js";
import { getCandidates, getCandidateByKey } from "../db/queries/candidates.js";
import { getProductPhaseDistribution } from "../db/queries/productPhaseDistribution.js";
import { getTechnologyTypeDistribution } from "../db/queries/technologyTypeDistribution.js";
import { getProductDistribution } from "../db/queries/productDistribution.js";
import { getRegulatoryDistribution } from "../db/queries/regulatoryDistribution.js";
import { getClinicalTrialStats } from "../db/queries/clinicalTrialStats.js";
import { getClinicalTrials } from "../db/queries/clinicalTrials.js";
import { getPortfolioCandidates } from "../db/queries/portfolioCandidates.js";
import { getRdPrioritiesWithCandidates, getRdPriorities } from "../db/queries/rdPriorities.js";
import {
  getDiseases,
  getSecondaryDiseases,
  getDiseaseHierarchy,
  getPhases,
  getProducts,
  getCountries,
} from "../db/queries/lookups.js";
import { getLastSyncDate } from "../db/queries/metadata.js";

// Context type for resolvers
interface Context {
  loaders: Loaders;
}

export const resolvers = {
  Query: {
    // KPIs (3 homepage cards)
    portfolioKPIs: (
      _: unknown,
      args: {
        global_health_areas?: string[];
        disease_names?: string[];
        product_names?: string[];
        phase_names?: string[];
      },
    ) =>
      getPortfolioKPIs({
        global_health_areas: args.global_health_areas,
        disease_names: args.disease_names,
        product_names: args.product_names,
        phase_names: args.phase_names,
      }),

    // Bubble chart — four views share the same candidate_types filter shape
    globalHealthAreaSummaries: (_: unknown, args: { candidate_types?: string[] }) =>
      getGlobalHealthAreaSummaries({ candidate_types: args.candidate_types }),

    ghaProductTypeSummaries: (_: unknown, args: { candidate_types?: string[] }) =>
      getGhaProductTypeSummaries({ candidate_types: args.candidate_types }),

    diseaseSummaries: (_: unknown, args: { candidate_types?: string[] }) =>
      getDiseaseSummaries({ candidate_types: args.candidate_types }),

    diseaseProductTypeSummaries: (_: unknown, args: { candidate_types?: string[] }) =>
      getDiseaseProductTypeSummaries({ candidate_types: args.candidate_types }),

    // Stacked bar chart
    phaseDistribution: (
      _: unknown,
      args: { global_health_area?: string; product_keys?: number[]; candidate_type?: string },
    ) =>
      getPhaseDistribution({
        global_health_area: args.global_health_area,
        product_keys: args.product_keys,
        candidate_type: args.candidate_type,
      }),

    // Portfolio overview - candidate type distribution
    candidateTypeDistribution: (
      _: unknown,
      args: { product_keys?: number[]; phase_names?: string[] },
    ) =>
      getCandidateTypeDistribution({
        product_keys: args.product_keys,
        phase_names: args.phase_names,
      }),

    // Map
    geographicDistribution: (
      _: unknown,
      args: {
        location_scope: string;
        statuses?: string[];
        global_health_areas?: string[];
        disease_names?: string[];
        product_names?: string[];
        phase_names?: string[];
      },
    ) =>
      getGeographicDistribution(args.location_scope, args.statuses, {
        global_health_areas: args.global_health_areas,
        disease_names: args.disease_names,
        product_names: args.product_names,
        phase_names: args.phase_names,
      }),

    // Cross-pipeline temporal
    temporalSnapshots: (
      _: unknown,
      args: {
        years?: number[];
        disease_group_names?: string[];
        global_health_areas?: string[];
        product_keys?: number[];
        candidate_type?: string;
      },
    ) =>
      getTemporalSnapshots({
        years: args.years,
        disease_group_names: args.disease_group_names,
        global_health_areas: args.global_health_areas,
        product_keys: args.product_keys,
        candidate_type: args.candidate_type,
      }),

    // Pipeline filter pairs (disease×product) for cross-filtering
    pipelineFilterPairs: () => getPipelineFilterPairs(),

    // Lists with pagination
    candidates: (_: unknown, args: { filter?: CandidateFilter; limit?: number; offset?: number }) =>
      getCandidates(args.filter, args.limit ?? 20, args.offset ?? 0),

    // Detail
    candidate: (_: unknown, args: { candidate_key: number }) =>
      getCandidateByKey(args.candidate_key),

    // Portfolio analysis - candidates list (paginated)
    portfolioCandidates: (
      _: unknown,
      args: {
        filter?: {
          global_health_areas?: string[];
          disease_names?: string[];
          product_names?: string[];
          candidate_type?: string;
        };
        limit?: number;
        offset?: number;
      },
    ) => getPortfolioCandidates(args.filter, args.limit ?? 20, args.offset ?? 0),

    // Extract tab - R&D priorities with linked candidates (paginated)
    rdPrioritiesWithCandidates: (
      _: unknown,
      args: {
        filter?: {
          global_health_areas?: string[];
          disease_names?: string[];
          search?: string;
        };
        limit?: number;
        offset?: number;
      },
    ) => getRdPrioritiesWithCandidates(args.filter, args.limit ?? 20, args.offset ?? 0),

    // Extract tab - R&D priorities only (paginated)
    rdPriorities: (
      _: unknown,
      args: {
        filter?: {
          global_health_areas?: string[];
          disease_names?: string[];
          search?: string;
        };
        limit?: number;
        offset?: number;
      },
    ) => getRdPriorities(args.filter, args.limit ?? 20, args.offset ?? 0),

    // Portfolio analysis - clinical trials list (paginated)
    clinicalTrials: (
      _: unknown,
      args: {
        filter?: {
          global_health_areas?: string[];
          disease_names?: string[];
          product_names?: string[];
          statuses?: string[];
          search?: string;
        };
        limit?: number;
        offset?: number;
      },
    ) => getClinicalTrials(args.filter, args.limit ?? 20, args.offset ?? 0),

    // Portfolio analysis - clinical trial stats (trials tab)
    clinicalTrialStats: (
      _: unknown,
      args: {
        global_health_areas?: string[];
        disease_names?: string[];
        product_names?: string[];
        phase_names?: string[];
      },
    ) =>
      getClinicalTrialStats({
        global_health_areas: args.global_health_areas,
        disease_names: args.disease_names,
        product_names: args.product_names,
        phase_names: args.phase_names,
      }),

    // Portfolio analysis - regulatory distribution (approved products tab)
    regulatoryDistribution: (
      _: unknown,
      args: {
        global_health_areas?: string[];
        disease_names?: string[];
        product_names?: string[];
        phase_names?: string[];
      },
    ) =>
      getRegulatoryDistribution({
        global_health_areas: args.global_health_areas,
        disease_names: args.disease_names,
        product_names: args.product_names,
        phase_names: args.phase_names,
      }),

    // Portfolio analysis - product distribution (donut chart)
    productDistribution: (
      _: unknown,
      args: {
        global_health_areas?: string[];
        disease_names?: string[];
        product_names?: string[];
        candidate_type?: string;
        phase_names?: string[];
      },
    ) =>
      getProductDistribution({
        global_health_areas: args.global_health_areas,
        disease_names: args.disease_names,
        product_names: args.product_names,
        candidate_type: args.candidate_type,
        phase_names: args.phase_names,
      }),

    // Portfolio analysis - product phase distribution
    productPhaseDistribution: (
      _: unknown,
      args: {
        global_health_areas?: string[];
        disease_names?: string[];
        product_names?: string[];
        candidate_type?: string;
        phase_names?: string[];
      },
    ) =>
      getProductPhaseDistribution({
        global_health_areas: args.global_health_areas,
        disease_names: args.disease_names,
        product_names: args.product_names,
        candidate_type: args.candidate_type,
        phase_names: args.phase_names,
      }),

    // Portfolio analysis - technology type distribution
    technologyTypeDistribution: (
      _: unknown,
      args: {
        global_health_areas?: string[];
        disease_names?: string[];
        product_names?: string[];
        candidate_type?: string;
        phase_names?: string[];
      },
    ) =>
      getTechnologyTypeDistribution({
        global_health_areas: args.global_health_areas,
        disease_names: args.disease_names,
        product_names: args.product_names,
        candidate_type: args.candidate_type,
        phase_names: args.phase_names,
      }),

    // Filter dropdowns
    diseases: () => getDiseases(),
    secondaryDiseases: () => getSecondaryDiseases(),
    diseaseHierarchy: () => getDiseaseHierarchy(),
    phases: () => getPhases(),
    products: () => getProducts(),
    countries: () => getCountries(),
    availableYears: () => getAvailableYears(),
    locationScopes: () => getLocationScopes(),
    lastSyncDate: () => getLastSyncDate(),
  },

  // Resolve nested relationships on DimCandidateCore
  DimCandidateCore: {
    disease: async (parent: DimCandidateCore, _: unknown, ctx: Context) => {
      // Get the snapshot to find disease_key
      const snapshot = await ctx.loaders.snapshotByCandidateLoader.load(parent.candidate_key);
      if (!snapshot?.disease_key) return null;
      return ctx.loaders.diseaseLoader.load(snapshot.disease_key);
    },

    phase: async (parent: DimCandidateCore, _: unknown, ctx: Context) => {
      const snapshot = await ctx.loaders.snapshotByCandidateLoader.load(parent.candidate_key);
      if (!snapshot?.phase_key) return null;
      return ctx.loaders.phaseLoader.load(snapshot.phase_key);
    },

    product: async (parent: DimCandidateCore, _: unknown, ctx: Context) => {
      const snapshot = await ctx.loaders.snapshotByCandidateLoader.load(parent.candidate_key);
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
