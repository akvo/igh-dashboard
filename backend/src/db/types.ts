/**
 * TypeScript interfaces mirroring the star_schema.db tables exactly.
 * Column names match DB column names for transparent mapping.
 */

// =============================================================================
// DIMENSION TABLES
// =============================================================================

export interface DimProduct {
  product_key: number;
  vin_productid: string | null;
  product_name: string | null;
  product_type: string | null;
}

export interface DimDisease {
  disease_key: number;
  diseaseid: string | null;
  disease_name: string | null;
  disease_group_name: string | null;
  global_health_area: string | null;
  disease_type: string | null;
}

export interface DimPhase {
  phase_key: number;
  vin_rdstageid: string | null;
  phase_name: string | null;
  sort_order: number | null;
}

export interface DimGeography {
  country_key: number;
  vin_countryid: string | null;
  country_name: string | null;
  iso_code: string | null;
  region_name: string | null;
}

export interface DimOrganization {
  organization_key: number;
  accountid: string | null;
  org_name: string | null;
  org_type: string | null;
}

export interface DimPriority {
  priority_key: number;
  rdpriorityid: string | null;
  priority_name: string | null;
  indication: string | null;
  intended_use: string | null;
  disease_key: number | null;
}

export interface DimDate {
  date_key: number;
  full_date: string | null;
  year: number | null;
  quarter: number | null;
}

export interface DimCandidateCore {
  candidate_key: number;
  candidateid: string | null;
  candidate_name: string | null;
  vin_candidate_code: string | null;
  developers_agg: string | null;
  alternative_names: string | null;
  target: string | null;
  mechanism_of_action: string | null;
  key_features: string | null;
  known_funders_agg: string | null;
  development_status: string | null;
  current_rd_stage: string | null;
  countries_approved_count: number | null;
  countries_approved_agg: string | null;
  candidate_type: string | null;
  indication: string | null;
  indication_type: string | null;
  healthcare_facility_level: string | null;
  preclinical_results_status: string | null;
  type_of_preclinical_results: string | null;
  preclinical_results_source: string | null;
  recent_updates: string | null;
  test_format: string | null;
}

export interface DimCandidateTech {
  technology_key: number;
  platform: string | null;
  technology_type: string | null;
  molecule_type: string | null;
  route_of_admin: string | null;
}

export interface DimCandidateRegulatory {
  regulatory_key: number;
  approval_status: string | null;
  fda_approval_date: string | null;
  who_prequal_date: string | null;
  who_prequalification: string | null;
  nra_approval_status: string | null;
  sra_approval_status: string | null;
  ema_approval_status: string | null;
  japanese_mhlw_approval_status: string | null;
  us_fda_approval_status: string | null;
}

export interface DimDeveloper {
  developer_key: number;
  developer_name: string | null;
}

// =============================================================================
// FACT TABLES
// =============================================================================

export interface FactPipelineSnapshot {
  snapshot_id: number;
  candidate_key: number | null;
  product_key: number | null;
  disease_key: number | null;
  technology_key: number | null;
  regulatory_key: number | null;
  phase_key: number | null;
  date_key: number | null;
  is_active_flag: number | null;
  include_in_pipeline: number | null;
  secondary_disease_key: number | null;
  sub_product_key: number | null;
}

export interface FactClinicalTrialEvent {
  trial_id: number;
  candidate_key: number | null;
  start_date_key: number | null;
  trial_phase: string | null;
  enrollment_count: number | null;
  status: string | null;
  clinicaltrialid: string | null;
  disease_key: number | null;
  product_key: number | null;
  trial_name: string | null;
  trial_title: string | null;
  sponsor: string | null;
  locations: string | null;
  age_groups: string | null;
  study_type: string | null;
  source_text: string | null;
}

// =============================================================================
// BRIDGE TABLES
// =============================================================================

export interface BridgeCandidateGeography {
  candidate_key: number | null;
  country_key: number | null;
  location_scope: string | null;
}

export interface BridgeCandidateDeveloper {
  candidate_key: number | null;
  developer_key: number | null;
}

export interface BridgeCandidatePriority {
  candidate_key: number | null;
  priority_key: number | null;
}

// =============================================================================
// AGGREGATE TYPES (for GraphQL responses)
// =============================================================================

export interface PortfolioKPIs {
  totalDiseases: number;
  totalCandidates: number;
  approvedProducts: number;
}

export interface GlobalHealthAreaSummary {
  global_health_area: string;
  candidateCount: number;
  diseaseCount: number;
  productCount: number;
}

export interface PhaseDistributionRow {
  global_health_area: string;
  phase_name: string;
  sort_order: number;
  candidateCount: number;
}

export interface CandidateTypeDistributionRow {
  global_health_area: string;
  candidate_type: string;
  candidateCount: number;
}

export interface GeographicDistributionRow {
  country_key: number;
  country_name: string;
  iso_code: string | null;
  location_scope: string;
  candidateCount: number;
}

export interface TemporalSnapshotRow {
  year: number;
  phase_name: string;
  sort_order: number;
  candidateCount: number;
}

export interface PipelineFilterPair {
  disease_group_name: string;
  product_key: number;
  product_name: string;
}

export interface CandidateConnection {
  nodes: DimCandidateCore[];
  totalCount: number;
  hasNextPage: boolean;
}

export interface CandidateFilter {
  global_health_area?: string;
  disease_key?: number;
  product_key?: number;
  phase_key?: number;
  year?: number;
  is_active?: boolean;
}

export interface ProductPhaseDistributionRow {
  product_name: string;
  phase_name: string;
  sort_order: number;
  candidateCount: number;
}

export interface TechnologyTypeDistributionRow {
  technology_type: string;
  phase_name: string;
  sort_order: number;
  candidateCount: number;
}

export interface ClinicalTrialStatusRow {
  status: string;
  trialCount: number;
}

export interface AgeGroupDistributionRow {
  age_group_name: string;
  candidateCount: number;
}

export interface ClinicalTrialStats {
  totalTrials: number;
  statusDistribution: ClinicalTrialStatusRow[];
  ageGroupDistribution: AgeGroupDistributionRow[];
}

export interface ClinicalTrialNode {
  trial_id: number;
  clinicaltrialid: string | null;
  trial_name: string | null;
  trial_title: string | null;
  trial_phase: string | null;
  status: string | null;
  candidate_name: string | null;
  disease_name: string | null;
  product_name: string | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  ct_results_status: string | null;
  collaborator: string | null;
  locations: string | null;
  sponsor: string | null;
  source_text: string | null;
  age_groups: string | null;
  enrollment_count: number | null;
  study_type: string | null;
  funder_type: string | null;
  interventions: string | null;
  outcome_measure: string | null;
  sex: string | null;
  study_design: string | null;
  ct_results_type: string | null;
  ct_terminated_reason: string | null;
}

export interface ClinicalTrialFilter {
  global_health_areas?: string[];
  disease_names?: string[];
  product_names?: string[];
  status?: string;
}

export interface ClinicalTrialConnection {
  nodes: ClinicalTrialNode[];
  totalCount: number;
  hasNextPage: boolean;
}

export interface PortfolioCandidateNode {
  candidate_key: number;
  candidate_name: string | null;
  candidate_type: string | null;
  candidateid: string | null;
  alternative_names: string | null;
  current_rd_stage: string | null;
  countries_approved_count: number | null;
  countries_approved_agg: string | null;
  global_health_area: string | null;
  disease_name: string | null;
  secondary_disease_name: string | null;
  product_name: string | null;
  sub_product_name: string | null;
  phase_name: string | null;
  approval_status: string | null;
  who_prequalification: string | null;
  indication: string | null;
  target: string | null;
  developers_agg: string | null;
  mechanism_of_action: string | null;
  key_features: string | null;
  known_funders_agg: string | null;
  technology_type: string | null;
  indication_type: string | null;
  healthcare_facility_level: string | null;
  preclinical_results_status: string | null;
  type_of_preclinical_results: string | null;
  preclinical_results_source: string | null;
  recent_updates: string | null;
  test_format: string | null;
  nra_approval_status: string | null;
  sra_approval_status: string | null;
  ema_approval_status: string | null;
  japanese_mhlw_approval_status: string | null;
  us_fda_approval_status: string | null;
  approving_authorities_agg: string | null;
  technology_principle: string | null;
  target_population: string | null;
  route_of_administration: string | null;
  platform: string | null;
  chim_study: string | null;
  key_clinical_trial: string | null;
  rd_stage_2023: string | null;
  rd_stage_2019: string | null;
}

export interface PortfolioCandidateFilter {
  global_health_areas?: string[];
  disease_names?: string[];
  product_names?: string[];
  candidate_type?: string;
  phase_names?: string[];
  search?: string;
}

export interface PortfolioCandidateConnection {
  nodes: PortfolioCandidateNode[];
  totalCount: number;
  hasNextPage: boolean;
}

export interface ApprovalStatusRow {
  approval_status: string;
  candidateCount: number;
}

export interface WHOPrequalRow {
  who_prequalification: string;
  candidateCount: number;
}

export interface ApprovingAuthorityRow {
  authority_type: string;
  who_prequalified: number;
  no_who_listing: number;
}

export interface RegulatoryDistribution {
  approvalStatus: ApprovalStatusRow[];
  whoPrequalification: WHOPrequalRow[];
  approvingAuthorities: ApprovingAuthorityRow[];
}

export interface ProductDistributionRow {
  product_name: string;
  candidateCount: number;
}

// =============================================================================
// R&D Priorities (Extract tab)
// =============================================================================

export interface RdPriorityNode {
  priority_key: number;
  rdpriorityid: string | null;
  priority_name: string | null;
  indication: string | null;
  intended_use: string | null;
  disease_name: string | null;
  global_health_area: string | null;
  type_of_guidance: string | null;
  author: string | null;
  publication_date: string | null;
  target_population: string | null;
  efficacy: string | null;
  safety: string | null;
  source: string | null;
  product_name: string | null;
  // Present when joined with candidates (Tab 2), null for priorities-only (Tab 4)
  candidate_name: string | null;
  current_rd_stage: string | null;
}

export interface RdPriorityFilter {
  global_health_areas?: string[];
  disease_names?: string[];
  search?: string;
}

export interface RdPriorityConnection {
  nodes: RdPriorityNode[];
  totalCount: number;
  hasNextPage: boolean;
}

// =============================================================================
// Extended types for resolved relations
// =============================================================================

export interface CandidateGeography {
  country_key: number;
  country_name: string | null;
  iso_code: string | null;
  location_scope: string | null;
}
