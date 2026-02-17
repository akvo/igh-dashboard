/**
 * Shared type definitions for E2E test query responses.
 */

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

export interface GeographicDistributionRow {
  country_key: number;
  country_name: string;
  iso_code: string | null;
  location_scope: string;
  candidateCount: number;
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

export interface TemporalSnapshotRow {
  year: number;
  phase_name: string;
  sort_order: number;
  candidateCount: number;
}

export interface Product {
  product_key: number;
  product_name: string | null;
}

export interface CandidateNode {
  candidate_key: number;
  candidate_name: string | null;
  vin_candidateid: string | null;
  vin_candidate_code: string | null;
  developers_agg: string | null;
}

export interface CandidateConnection {
  nodes: CandidateNode[];
  totalCount: number;
  hasNextPage: boolean;
}

export interface DimDisease {
  disease_key: number;
  disease_name: string | null;
  global_health_area: string | null;
}

export interface DimPhase {
  phase_key: number;
  phase_name: string | null;
  sort_order: number | null;
}

export interface DimProduct {
  product_key: number;
  product_name: string | null;
}

export interface DimDeveloper {
  developer_key: number;
  developer_name: string | null;
}

export interface CandidateGeography {
  country_key: number;
  country_name: string | null;
  iso_code: string | null;
  location_scope: string | null;
}

export interface DimPriority {
  priority_key: number;
  priority_name: string | null;
  indication: string | null;
  intended_use: string | null;
}

export interface FactClinicalTrialEvent {
  trial_id: number;
  candidate_key: number | null;
  trial_phase: string | null;
  enrollment_count: number | null;
  status: string | null;
}

export interface CandidateDetail extends CandidateNode {
  disease: DimDisease | null;
  phase: DimPhase | null;
  product: DimProduct | null;
  developers: DimDeveloper[];
  geographies: CandidateGeography[];
  priorities: DimPriority[];
  clinicalTrials: FactClinicalTrialEvent[];
}
