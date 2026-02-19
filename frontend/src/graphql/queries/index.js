import { gql } from '@apollo/client/core';

// KPI Cards Query
export const GET_PORTFOLIO_KPIS = gql`
  query KPICards($globalHealthAreas: [String!], $diseaseNames: [String!], $productNames: [String!]) {
    portfolioKPIs(global_health_areas: $globalHealthAreas, disease_names: $diseaseNames, product_names: $productNames) {
      totalDiseases
      totalCandidates
      approvedProducts
    }
  }
`;

// Bubble Chart - Scale of R&D by global health area
export const GET_GLOBAL_HEALTH_AREA_SUMMARIES = gql`
  query BubbleChart($candidateTypes: [String!]) {
    globalHealthAreaSummaries(candidate_types: $candidateTypes) {
      global_health_area
      candidateCount
      diseaseCount
      productCount
    }
  }
`;

// Phase Distribution - Portfolio by Health Area (Stacked Bar)
export const GET_PHASE_DISTRIBUTION = gql`
  query PhaseDistribution($globalHealthArea: String, $productKeys: [Int!], $candidateType: String) {
    phaseDistribution(global_health_area: $globalHealthArea, product_keys: $productKeys, candidate_type: $candidateType) {
      global_health_area
      phase_name
      sort_order
      candidateCount
    }
  }
`;

// Candidate Type Distribution - Portfolio by Health Area (Stacked Bar)
export const GET_CANDIDATE_TYPE_DISTRIBUTION = gql`
  query CandidateTypeDistribution($productKeys: [Int!], $phaseNames: [String!]) {
    candidateTypeDistribution(product_keys: $productKeys, phase_names: $phaseNames) {
      global_health_area
      candidate_type
      candidateCount
    }
  }
`;

// Geographic Distribution Map
export const GET_GEOGRAPHIC_DISTRIBUTION = gql`
  query GeographicMap($scope: String!) {
    geographicDistribution(location_scope: $scope) {
      country_key
      country_name
      iso_code
      candidateCount
    }
  }
`;

// Temporal Snapshots - Cross-pipeline Analytics
export const GET_TEMPORAL_SNAPSHOTS = gql`
  query TemporalAnalysis($years: [Int!], $diseaseKeys: [Int!], $globalHealthAreas: [String!], $productKeys: [Int!]) {
    temporalSnapshots(years: $years, disease_keys: $diseaseKeys, global_health_areas: $globalHealthAreas, product_keys: $productKeys) {
      year
      phase_name
      sort_order
      candidateCount
    }
  }
`;

// Filter Options
export const GET_FILTER_OPTIONS = gql`
  query FilterOptions {
    products {
      product_key
      product_name
    }
    availableYears
    locationScopes
  }
`;

// Get all products
export const GET_PRODUCTS = gql`
  query GetProducts {
    products {
      product_key
      product_name
    }
  }
`;

// Get available years
export const GET_AVAILABLE_YEARS = gql`
  query GetAvailableYears {
    availableYears
  }
`;

// Get location scopes
export const GET_LOCATION_SCOPES = gql`
  query GetLocationScopes {
    locationScopes
  }
`;

// Get last sync date
export const GET_LAST_SYNC_DATE = gql`
  query GetLastSyncDate {
    lastSyncDate
  }
`;
// Portfolio Candidates - Portfolio Analysis (Candidates/Approved/Extract tabs, paginated)
export const GET_PORTFOLIO_CANDIDATES = gql`
  query PortfolioCandidates($filter: PortfolioCandidateFilter, $limit: Int, $offset: Int) {
    portfolioCandidates(filter: $filter, limit: $limit, offset: $offset) {
      nodes {
        candidate_key
        candidate_name
        candidate_type
        vin_candidateid
        alternative_names
        current_rd_stage
        countries_approved_count
        countries_approved_agg
        indication
        target
        global_health_area
        disease_name
        secondary_disease_name
        product_name
        sub_product_name
        phase_name
        approval_status
        who_prequalification
      }
      totalCount
      hasNextPage
    }
  }
`;

// Clinical Trials List - Portfolio Analysis (Trials tab, paginated)
export const GET_CLINICAL_TRIALS = gql`
  query ClinicalTrials($filter: ClinicalTrialFilter, $limit: Int, $offset: Int) {
    clinicalTrials(filter: $filter, limit: $limit, offset: $offset) {
      nodes {
        trial_id
        vin_clinicaltrialid
        trial_name
        trial_title
        trial_phase
        status
        candidate_name
        disease_name
        product_name
        start_date
      }
      totalCount
      hasNextPage
    }
  }
`;

// Clinical Trial Stats - Portfolio Analysis (Trials tab)
export const GET_CLINICAL_TRIAL_STATS = gql`
  query ClinicalTrialStats($globalHealthAreas: [String!], $diseaseNames: [String!], $productNames: [String!]) {
    clinicalTrialStats(global_health_areas: $globalHealthAreas, disease_names: $diseaseNames, product_names: $productNames) {
      totalTrials
      statusDistribution {
        status
        trialCount
      }
      ageGroupDistribution {
        age_group_name
        candidateCount
      }
    }
  }
`;

// Regulatory Distribution - Portfolio Analysis (Approved Products tab)
export const GET_REGULATORY_DISTRIBUTION = gql`
  query RegulatoryDistribution($globalHealthAreas: [String!], $diseaseNames: [String!], $productNames: [String!]) {
    regulatoryDistribution(global_health_areas: $globalHealthAreas, disease_names: $diseaseNames, product_names: $productNames) {
      approvalStatus {
        approval_status
        candidateCount
      }
      whoPrequalification {
        who_prequalification
        candidateCount
      }
    }
  }
`;

// Product Distribution - Portfolio Analysis (Donut Chart)
export const GET_PRODUCT_DISTRIBUTION = gql`
  query ProductDistribution($globalHealthAreas: [String!], $diseaseNames: [String!], $productNames: [String!], $candidateType: String) {
    productDistribution(global_health_areas: $globalHealthAreas, disease_names: $diseaseNames, product_names: $productNames, candidate_type: $candidateType) {
      product_name
      candidateCount
    }
  }
`;

// Product Phase Distribution - Portfolio Analysis (Stacked Bar by Product)
export const GET_PRODUCT_PHASE_DISTRIBUTION = gql`
  query ProductPhaseDistribution($globalHealthAreas: [String!], $diseaseNames: [String!], $productNames: [String!], $candidateType: String) {
    productPhaseDistribution(global_health_areas: $globalHealthAreas, disease_names: $diseaseNames, product_names: $productNames, candidate_type: $candidateType) {
      product_name
      phase_name
      sort_order
      candidateCount
    }
  }
`;

// Get all diseases
export const GET_DISEASES = gql`
  query GetDiseases {
    diseases {
      disease_key
      disease_name
      global_health_area
    }
  }
`;

// Get all phases
export const GET_PHASES = gql`
  query GetPhases {
    phases {
      phase_key
      phase_name
      sort_order
    }
  }
`;
