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
  vin_diseaseid: string | null;
  disease_name: string | null;
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
  vin_rdpriorityid: string | null;
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
  vin_candidateid: string | null;
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
  sra_approval_flag: number | null;
  fda_approval_date: string | null;
  who_prequal_date: string | null;
  who_prequalification: string | null;
  nra_approval_status: string | null;
  nra_approval_date: string | null;
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
  vin_clinicaltrialid: string | null;
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

// =============================================================================
// Extended types for resolved relations
// =============================================================================

export interface CandidateGeography {
  country_key: number;
  country_name: string | null;
  iso_code: string | null;
  location_scope: string | null;
}
