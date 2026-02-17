// Transformation functions barrel export

export * from './constants';
export { transformPortfolioKPIs } from './portfolioKPIs';
export { transformGlobalHealthAreaSummaries } from './globalHealthAreaSummaries';
export {
  transformPhaseDistribution,
  extractPhases as extractPhaseDistributionPhases,
  groupByHealthArea,
  phaseNameToKey,
} from './phaseDistribution';
export {
  transformCandidateTypeDistribution,
  extractCandidateTypes,
  groupByHealthArea as groupByHealthAreaCandidateType,
} from './candidateTypeDistribution';
export {
  transformGeographicDistribution,
  transformToMapData,
} from './geographicDistribution';
export {
  transformTemporalSnapshots,
  extractPhases as extractTemporalPhases,
  groupByYear,
} from './temporalSnapshots';
