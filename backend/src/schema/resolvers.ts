import type { Loaders } from "../utils/dataloader.js";
import type { DimCandidateCore, CandidateFilter, FactClinicalTrialEvent } from "../db/types.js";

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
  getActivePipelineFilterPairs,
} from "../db/queries/temporal.js";
import { getCandidates, getCandidateByKey } from "../db/queries/candidates.js";
import {
  getCandidateForSlideIn,
  getTrialForSlideIn,
  getDateString,
} from "../db/queries/slideIns.js";
import { getProductPhaseDistribution } from "../db/queries/productPhaseDistribution.js";
import { getTechnologyTypeDistribution } from "../db/queries/technologyTypeDistribution.js";
import { getProductDistribution } from "../db/queries/productDistribution.js";
import { getRegulatoryDistribution } from "../db/queries/regulatoryDistribution.js";
import { getPriorityAlignmentOverview } from "../db/queries/priorityAlignment.js";
import { getIndividualPriorityAnalysis } from "../db/queries/individualPriorityAnalysis.js";
import { getClinicalTrialStats } from "../db/queries/clinicalTrialStats.js";
import { getClinicalTrials } from "../db/queries/clinicalTrials.js";
import { getPortfolioCandidates } from "../db/queries/portfolioCandidates.js";
import { getRdPrioritiesWithCandidates, getRdPriorities } from "../db/queries/rdPriorities.js";
import { getDistinctValues } from "../db/queries/distinctValues.js";
import {
  getDiseases,
  getSecondaryDiseases,
  getDiseaseHierarchy,
  getPhases,
  getProducts,
  getCountries,
} from "../db/queries/lookups.js";
import { getLastSyncDate } from "../db/queries/metadata.js";

/**
 * Pull a single labelled value out of fact_clinical_trial_event.study_design,
 * whose source format is pipe-separated key:value pairs, e.g.
 *
 *   "Allocation: RANDOMIZED|Intervention Model: PARALLEL|Masking: TRIPLE (PARTICIPANT, CARE_PROVIDER, INVESTIGATOR)|Primary Purpose: PREVENTION"
 *
 * Returns the value for `label`, or null if absent. Case-sensitive on the
 * label, matching the source.
 */
function parseStudyDesignField(studyDesign: string | null, label: string): string | null {
  if (!studyDesign) return null;
  const parts = studyDesign.split("|").map((p) => p.trim());
  const prefix = `${label}:`;
  for (const part of parts) {
    if (part.startsWith(prefix)) {
      return part.slice(prefix.length).trim() || null;
    }
  }
  return null;
}

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
        primary_disease_names?: string[];
        secondary_disease_names?: string[];
        product_names?: string[];
        phase_names?: string[];
      },
    ) =>
      getPortfolioKPIs({
        global_health_areas: args.global_health_areas,
        primary_disease_names: args.primary_disease_names,
        secondary_disease_names: args.secondary_disease_names,
        product_names: args.product_names,
        phase_names: args.phase_names,
      }),

    // Bubble chart — four views share the same candidate_types filter shape
    globalHealthAreaSummaries: (_: unknown, args: { candidate_types?: string[] }) =>
      getGlobalHealthAreaSummaries({ candidate_types: args.candidate_types }),

    ghaProductTypeSummaries: (_: unknown, args: { candidate_types?: string[] }) =>
      getGhaProductTypeSummaries({ candidate_types: args.candidate_types }),

    diseaseSummaries: (
      _: unknown,
      args: { candidate_types?: string[]; product_names?: string[]; technology_types?: string[] },
    ) =>
      getDiseaseSummaries({
        candidate_types: args.candidate_types,
        product_names: args.product_names,
        technology_types: args.technology_types,
      }),

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
        primary_disease_names?: string[];
        secondary_disease_names?: string[];
        product_names?: string[];
        phase_names?: string[];
      },
    ) =>
      getGeographicDistribution(args.location_scope, args.statuses, {
        global_health_areas: args.global_health_areas,
        primary_disease_names: args.primary_disease_names,
        secondary_disease_names: args.secondary_disease_names,
        product_names: args.product_names,
        phase_names: args.phase_names,
      }),

    // Cross-pipeline temporal
    temporalSnapshots: (
      _: unknown,
      args: {
        years?: number[];
        primary_disease_names?: string[];
        secondary_disease_names?: string[];
        global_health_areas?: string[];
        product_keys?: number[];
        candidate_type?: string;
      },
    ) =>
      getTemporalSnapshots({
        years: args.years,
        primary_disease_names: args.primary_disease_names,
        secondary_disease_names: args.secondary_disease_names,
        global_health_areas: args.global_health_areas,
        product_keys: args.product_keys,
        candidate_type: args.candidate_type,
      }),

    // Pipeline filter pairs (disease×product) for cross-filtering
    pipelineFilterPairs: () => getPipelineFilterPairs(),

    // Active-pipeline filter pairs — restricted to active+typed candidates
    activePipelineFilterPairs: () => getActivePipelineFilterPairs(),

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
          primary_disease_names?: string[];
          secondary_disease_names?: string[];
          product_names?: string[];
          candidate_type?: string;
          phase_names?: string[];
          priority_keys?: number[];
          column_filters?: import("../db/queries/columnFilters.js").ColumnFilterInput[];
        };
        sort?: import("../db/queries/columnFilters.js").ColumnSortInput | null;
        limit?: number;
        offset?: number;
      },
    ) => getPortfolioCandidates(args.filter, args.sort ?? null, args.limit ?? 20, args.offset ?? 0),

    // Extract tab - R&D priorities with linked candidates (paginated)
    rdPrioritiesWithCandidates: (
      _: unknown,
      args: {
        filter?: {
          global_health_areas?: string[];
          primary_disease_names?: string[];
          secondary_disease_names?: string[];
          priority_keys?: number[];
          column_filters?: import("../db/queries/columnFilters.js").ColumnFilterInput[];
        };
        sort?: import("../db/queries/columnFilters.js").ColumnSortInput | null;
        limit?: number;
        offset?: number;
      },
    ) =>
      getRdPrioritiesWithCandidates(
        args.filter,
        args.sort ?? null,
        args.limit ?? 20,
        args.offset ?? 0,
      ),

    // Extract tab - R&D priorities only (paginated)
    rdPriorities: (
      _: unknown,
      args: {
        filter?: {
          global_health_areas?: string[];
          primary_disease_names?: string[];
          secondary_disease_names?: string[];
          priority_keys?: number[];
          column_filters?: import("../db/queries/columnFilters.js").ColumnFilterInput[];
        };
        sort?: import("../db/queries/columnFilters.js").ColumnSortInput | null;
        limit?: number;
        offset?: number;
      },
    ) => getRdPriorities(args.filter, args.sort ?? null, args.limit ?? 20, args.offset ?? 0),

    // DataTable category-filter dropdown options (one column at a time).
    distinctValues: (
      _: unknown,
      args: {
        table: import("../db/queries/columnRegistry.js").DataTableId;
        column: string;
        filter?: import("../db/queries/distinctValues.js").DistinctValuesFilter;
      },
    ) => getDistinctValues(args.table, args.column, args.filter),

    // Portfolio analysis - clinical trials list (paginated)
    clinicalTrials: (
      _: unknown,
      args: {
        filter?: {
          global_health_areas?: string[];
          primary_disease_names?: string[];
          secondary_disease_names?: string[];
          product_names?: string[];
          statuses?: string[];
          column_filters?: import("../db/queries/columnFilters.js").ColumnFilterInput[];
        };
        sort?: import("../db/queries/columnFilters.js").ColumnSortInput | null;
        limit?: number;
        offset?: number;
      },
    ) => getClinicalTrials(args.filter, args.sort ?? null, args.limit ?? 20, args.offset ?? 0),

    // Portfolio analysis - clinical trial stats (trials tab)
    clinicalTrialStats: (
      _: unknown,
      args: {
        global_health_areas?: string[];
        primary_disease_names?: string[];
        secondary_disease_names?: string[];
        product_names?: string[];
        phase_names?: string[];
      },
    ) =>
      getClinicalTrialStats({
        global_health_areas: args.global_health_areas,
        primary_disease_names: args.primary_disease_names,
        secondary_disease_names: args.secondary_disease_names,
        product_names: args.product_names,
        phase_names: args.phase_names,
      }),

    // Portfolio analysis - regulatory distribution (approved products tab)
    regulatoryDistribution: (
      _: unknown,
      args: {
        global_health_areas?: string[];
        primary_disease_names?: string[];
        secondary_disease_names?: string[];
        product_names?: string[];
        phase_names?: string[];
      },
    ) =>
      getRegulatoryDistribution({
        global_health_areas: args.global_health_areas,
        primary_disease_names: args.primary_disease_names,
        secondary_disease_names: args.secondary_disease_names,
        product_names: args.product_names,
        phase_names: args.phase_names,
      }),

    // WHO Priority alignment — single consolidated payload (Home + WHO page).
    priorityAlignmentOverview: (
      _: unknown,
      args: {
        global_health_areas?: string[] | null;
        primary_disease_names?: string[] | null;
        secondary_disease_names?: string[] | null;
        product_names?: string[] | null;
      },
    ) =>
      getPriorityAlignmentOverview({
        global_health_areas: args.global_health_areas ?? null,
        primary_disease_names: args.primary_disease_names ?? null,
        secondary_disease_names: args.secondary_disease_names ?? null,
        product_names: args.product_names ?? null,
      }),

    // WHO Priority alignment — single-priority drill-down (Individual priority analysis section).
    individualPriorityAnalysis: (
      _: unknown,
      args: {
        priority_key: number;
        global_health_areas?: string[] | null;
        primary_disease_names?: string[] | null;
        secondary_disease_names?: string[] | null;
        product_names?: string[] | null;
      },
    ) =>
      getIndividualPriorityAnalysis({
        priority_key: args.priority_key,
        global_health_areas: args.global_health_areas ?? null,
        primary_disease_names: args.primary_disease_names ?? null,
        secondary_disease_names: args.secondary_disease_names ?? null,
        product_names: args.product_names ?? null,
      }),

    // Portfolio analysis - product distribution (donut chart)
    productDistribution: (
      _: unknown,
      args: {
        global_health_areas?: string[];
        primary_disease_names?: string[];
        secondary_disease_names?: string[];
        product_names?: string[];
        candidate_type?: string;
        phase_names?: string[];
      },
    ) =>
      getProductDistribution({
        global_health_areas: args.global_health_areas,
        primary_disease_names: args.primary_disease_names,
        secondary_disease_names: args.secondary_disease_names,
        product_names: args.product_names,
        candidate_type: args.candidate_type,
        phase_names: args.phase_names,
      }),

    // Portfolio analysis - product phase distribution
    productPhaseDistribution: (
      _: unknown,
      args: {
        global_health_areas?: string[];
        primary_disease_names?: string[];
        secondary_disease_names?: string[];
        product_names?: string[];
        candidate_type?: string;
        phase_names?: string[];
      },
    ) =>
      getProductPhaseDistribution({
        global_health_areas: args.global_health_areas,
        primary_disease_names: args.primary_disease_names,
        secondary_disease_names: args.secondary_disease_names,
        product_names: args.product_names,
        candidate_type: args.candidate_type,
        phase_names: args.phase_names,
      }),

    // Portfolio analysis - technology type distribution
    technologyTypeDistribution: (
      _: unknown,
      args: {
        global_health_areas?: string[];
        primary_disease_names?: string[];
        secondary_disease_names?: string[];
        product_names?: string[];
        candidate_type?: string;
        phase_names?: string[];
      },
    ) =>
      getTechnologyTypeDistribution({
        global_health_areas: args.global_health_areas,
        primary_disease_names: args.primary_disease_names,
        secondary_disease_names: args.secondary_disease_names,
        product_names: args.product_names,
        candidate_type: args.candidate_type,
        phase_names: args.phase_names,
      }),

    // Aggregated Portfolio slide-ins
    slideInCandidate: (_: unknown, args: { candidate_key: number }) => {
      const candidate = getCandidateForSlideIn(args.candidate_key);
      if (!candidate) return null;
      return { candidate };
    },

    slideInProduct: (_: unknown, args: { candidate_key: number }) => {
      const candidate = getCandidateForSlideIn(args.candidate_key);
      if (!candidate) return null;
      return { candidate };
    },

    slideInTrial: (_: unknown, args: { trial_id: number }) => {
      const trial = getTrialForSlideIn(args.trial_id);
      if (!trial) return null;
      return { trial };
    },

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

  // Resolve date FKs and parse study_design into helper fields
  FactClinicalTrialEvent: {
    start_date: (parent: FactClinicalTrialEvent) => getDateString(parent.start_date_key),
    end_date: (parent: FactClinicalTrialEvent) => getDateString(parent.end_date_key),
    primary_completion_date: (parent: FactClinicalTrialEvent) =>
      getDateString(parent.primary_completion_date_key),
    allocation: (parent: FactClinicalTrialEvent) =>
      parseStudyDesignField(parent.study_design, "Allocation"),
    intervention_model: (parent: FactClinicalTrialEvent) =>
      parseStudyDesignField(parent.study_design, "Intervention Model"),
    masking: (parent: FactClinicalTrialEvent) =>
      parseStudyDesignField(parent.study_design, "Masking"),
    primary_purpose: (parent: FactClinicalTrialEvent) =>
      parseStudyDesignField(parent.study_design, "Primary Purpose"),
  },

  SlideInCandidate: {
    product: async (parent: { candidate: DimCandidateCore }, _: unknown, ctx: Context) => {
      const snapshot = await ctx.loaders.snapshotByCandidateLoader.load(
        parent.candidate.candidate_key,
      );
      if (!snapshot?.product_key) return null;
      return ctx.loaders.productLoader.load(snapshot.product_key);
    },
    subProduct: (parent: { candidate: DimCandidateCore }, _: unknown, ctx: Context) =>
      ctx.loaders.subProductByCandidateLoader.load(parent.candidate.candidate_key),
    technologyType: (parent: { candidate: DimCandidateCore }, _: unknown, ctx: Context) =>
      ctx.loaders.techByCandidateLoader.load(parent.candidate.candidate_key),
    diseases: async (parent: { candidate: DimCandidateCore }, _: unknown, ctx: Context) => {
      const snapshot = await ctx.loaders.snapshotByCandidateLoader.load(
        parent.candidate.candidate_key,
      );
      if (!snapshot?.disease_key) return { primary: "Unknown", secondary: null };
      const d = await ctx.loaders.diseaseLoader.load(snapshot.disease_key);
      return {
        primary: d?.disease_name || "Unknown",
        secondary: d?.secondary_disease_name || null,
      };
    },
    ageGroups: (parent: { candidate: DimCandidateCore }, _: unknown, ctx: Context) =>
      ctx.loaders.ageGroupsByCandidateLoader.load(parent.candidate.candidate_key),
    pipelineHistory: (parent: { candidate: DimCandidateCore }, _: unknown, ctx: Context) =>
      ctx.loaders.pipelineHistoryByCandidateLoader.load(parent.candidate.candidate_key),
    developers: async (parent: { candidate: DimCandidateCore }, _: unknown, ctx: Context) => {
      const [devs, orgs] = await Promise.all([
        ctx.loaders.developersByCandidateLoader.load(parent.candidate.candidate_key),
        ctx.loaders.organizationsByCandidateLoader.load(parent.candidate.candidate_key),
      ]);
      // Match developer name to org name on a normalised basis (lowercase,
      // collapsed whitespace) for the org_type subtype. Misses render org_type
      // as null, which the UI shows as "—". This is documented in the
      // unresolvable-data doc as a known fuzziness.
      const norm = (s: string | null | undefined) =>
        (s || "").trim().toLowerCase().replace(/\s+/g, " ");
      const orgMap = new Map<string, string | null>();
      for (const o of orgs) {
        if (o.org_name) orgMap.set(norm(o.org_name), o.org_type ?? null);
      }
      return devs.map((d) => ({
        name: d.developer_name || "",
        org_type: orgMap.get(norm(d.developer_name)) ?? null,
      }));
    },
    trials: (parent: { candidate: DimCandidateCore }, _: unknown, ctx: Context) =>
      ctx.loaders.clinicalTrialsByCandidateLoader.load(parent.candidate.candidate_key),
    priorities: (parent: { candidate: DimCandidateCore }, _: unknown, ctx: Context) =>
      ctx.loaders.prioritiesByCandidateLoader.load(parent.candidate.candidate_key),
    publications: (parent: { candidate: DimCandidateCore }, _: unknown, ctx: Context) =>
      ctx.loaders.publicationsByCandidateLoader.load(parent.candidate.candidate_key),
  },

  // SlideInProduct shares every field of SlideInCandidate plus regulatory.
  // GraphQL doesn't inherit resolvers across types, so duplicate the field
  // resolvers; only the `regulatory` field is product-specific.
  SlideInProduct: {
    product: async (parent: { candidate: DimCandidateCore }, _: unknown, ctx: Context) => {
      const snapshot = await ctx.loaders.snapshotByCandidateLoader.load(
        parent.candidate.candidate_key,
      );
      if (!snapshot?.product_key) return null;
      return ctx.loaders.productLoader.load(snapshot.product_key);
    },
    subProduct: (parent: { candidate: DimCandidateCore }, _: unknown, ctx: Context) =>
      ctx.loaders.subProductByCandidateLoader.load(parent.candidate.candidate_key),
    technologyType: (parent: { candidate: DimCandidateCore }, _: unknown, ctx: Context) =>
      ctx.loaders.techByCandidateLoader.load(parent.candidate.candidate_key),
    diseases: async (parent: { candidate: DimCandidateCore }, _: unknown, ctx: Context) => {
      const snapshot = await ctx.loaders.snapshotByCandidateLoader.load(
        parent.candidate.candidate_key,
      );
      if (!snapshot?.disease_key) return { primary: "Unknown", secondary: null };
      const d = await ctx.loaders.diseaseLoader.load(snapshot.disease_key);
      return {
        primary: d?.disease_name || "Unknown",
        secondary: d?.secondary_disease_name || null,
      };
    },
    ageGroups: (parent: { candidate: DimCandidateCore }, _: unknown, ctx: Context) =>
      ctx.loaders.ageGroupsByCandidateLoader.load(parent.candidate.candidate_key),
    pipelineHistory: (parent: { candidate: DimCandidateCore }, _: unknown, ctx: Context) =>
      ctx.loaders.pipelineHistoryByCandidateLoader.load(parent.candidate.candidate_key),
    developers: async (parent: { candidate: DimCandidateCore }, _: unknown, ctx: Context) => {
      const [devs, orgs] = await Promise.all([
        ctx.loaders.developersByCandidateLoader.load(parent.candidate.candidate_key),
        ctx.loaders.organizationsByCandidateLoader.load(parent.candidate.candidate_key),
      ]);
      const norm = (s: string | null | undefined) =>
        (s || "").trim().toLowerCase().replace(/\s+/g, " ");
      const orgMap = new Map<string, string | null>();
      for (const o of orgs) {
        if (o.org_name) orgMap.set(norm(o.org_name), o.org_type ?? null);
      }
      return devs.map((d) => ({
        name: d.developer_name || "",
        org_type: orgMap.get(norm(d.developer_name)) ?? null,
      }));
    },
    trials: (parent: { candidate: DimCandidateCore }, _: unknown, ctx: Context) =>
      ctx.loaders.clinicalTrialsByCandidateLoader.load(parent.candidate.candidate_key),
    priorities: (parent: { candidate: DimCandidateCore }, _: unknown, ctx: Context) =>
      ctx.loaders.prioritiesByCandidateLoader.load(parent.candidate.candidate_key),
    publications: (parent: { candidate: DimCandidateCore }, _: unknown, ctx: Context) =>
      ctx.loaders.publicationsByCandidateLoader.load(parent.candidate.candidate_key),
    regulatory: async (parent: { candidate: DimCandidateCore }, _: unknown, ctx: Context) => {
      const [reg, authorities] = await Promise.all([
        ctx.loaders.regulatoryByCandidateLoader.load(parent.candidate.candidate_key),
        ctx.loaders.approvingAuthoritiesByCandidateLoader.load(parent.candidate.candidate_key),
      ]);
      return {
        approval_status: reg?.approval_status ?? null,
        who_prequalification: reg?.who_prequalification ?? null,
        approving_authorities: authorities,
      };
    },
  },

  SlideInTrial: {
    candidate: (parent: { trial: FactClinicalTrialEvent }, _: unknown, ctx: Context) => {
      if (!parent.trial.candidate_key) return null;
      return ctx.loaders.candidateByKeyLoader.load(parent.trial.candidate_key);
    },
    disease: (parent: { trial: FactClinicalTrialEvent }, _: unknown, ctx: Context) => {
      if (!parent.trial.disease_key) return null;
      return ctx.loaders.diseaseLoader.load(parent.trial.disease_key);
    },
  },
};
