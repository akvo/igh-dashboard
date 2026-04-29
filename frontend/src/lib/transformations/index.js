// Transformation functions barrel export

export * from './constants';
export { transformPortfolioKPIs } from './portfolioKPIs';
export { transformGlobalHealthAreaSummaries } from './globalHealthAreaSummaries';
export {
  phaseNameToKey,
} from './phaseDistribution';
export {
  transformCandidateTypeDistribution,
  extractCandidateTypes,
  groupByHealthArea as groupByHealthAreaCandidateType,
} from './candidateTypeDistribution';
export {
  transformProductPhaseDistribution,
  groupByProductName,
} from './productPhaseDistribution';
export {
  transformTechnologyTypeDistribution,
  groupByTechnologyType,
} from './technologyTypeDistribution';
export {
  transformGeographicDistribution,
  transformToMapData,
} from './geographicDistribution';
export {
  transformTemporalSnapshots,
  extractPhases as extractTemporalPhases,
  groupByYear,
  AGGREGATE_PHASE_MAPPING,
  AGGREGATE_STAGE_LABELS,
  AGGREGATE_STAGE_COLORS,
  aggregateTemporalPhases,
  computeGrowthTable,
} from './temporalSnapshots';
