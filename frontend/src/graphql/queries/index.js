import { gql } from '@apollo/client/core';

// KPI Cards Query
export const GET_PORTFOLIO_KPIS = gql`
  query KPICards($globalHealthAreas: [String!], $diseaseNames: [String!], $productNames: [String!], $phaseNames: [String!]) {
    portfolioKPIs(global_health_areas: $globalHealthAreas, disease_names: $diseaseNames, product_names: $productNames, phase_names: $phaseNames) {
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
  query GeographicMap($scope: String!, $statuses: [String!], $globalHealthAreas: [String!], $diseaseNames: [String!], $productNames: [String!], $phaseNames: [String!]) {
    geographicDistribution(location_scope: $scope, statuses: $statuses, global_health_areas: $globalHealthAreas, disease_names: $diseaseNames, product_names: $productNames, phase_names: $phaseNames) {
      country_key
      country_name
      iso_code
      candidateCount
    }
  }
`;

// Temporal Snapshots - Cross-pipeline Analytics
export const GET_TEMPORAL_SNAPSHOTS = gql`
  query TemporalAnalysis($years: [Int!], $diseaseGroupNames: [String!], $globalHealthAreas: [String!], $productKeys: [Int!]) {
    temporalSnapshots(years: $years, disease_group_names: $diseaseGroupNames, global_health_areas: $globalHealthAreas, product_keys: $productKeys) {
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
        candidateid
        alternative_names
        current_rd_stage
        countries_approved_count
        countries_approved_agg
        indication
        target
        developers_agg
        mechanism_of_action
        key_features
        known_funders_agg
        technology_type
        indication_type
        healthcare_facility_level
        preclinical_results_status
        type_of_preclinical_results
        preclinical_results_source
        recent_updates
        test_format
        global_health_area
        disease_name
        secondary_disease_name
        product_name
        sub_product_name
        phase_name
        approval_status
        who_prequalification
        nra_approval_status
        sra_approval_status
        ema_approval_status
        japanese_mhlw_approval_status
        us_fda_approval_status
        approving_authorities_agg
        technology_principle
        target_population
        route_of_administration
        platform
        chim_study
        key_clinical_trial
        rd_stage_2023
        rd_stage_2019
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
        clinicaltrialid
        trial_name
        trial_title
        trial_phase
        status
        candidate_name
        disease_name
        product_name
        start_date
        end_date
        description
        ct_results_status
        collaborator
        locations
        sponsor
        source_text
        age_groups
        enrollment_count
        study_type
        funder_type
        interventions
        outcome_measure
        sex
        study_design
        ct_results_type
        ct_terminated_reason
      }
      totalCount
      hasNextPage
    }
  }
`;

// Clinical Trial Stats - Portfolio Analysis (Trials tab)
export const GET_CLINICAL_TRIAL_STATS = gql`
  query ClinicalTrialStats($globalHealthAreas: [String!], $diseaseNames: [String!], $productNames: [String!], $phaseNames: [String!]) {
    clinicalTrialStats(global_health_areas: $globalHealthAreas, disease_names: $diseaseNames, product_names: $productNames, phase_names: $phaseNames) {
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
  query RegulatoryDistribution($globalHealthAreas: [String!], $diseaseNames: [String!], $productNames: [String!], $phaseNames: [String!]) {
    regulatoryDistribution(global_health_areas: $globalHealthAreas, disease_names: $diseaseNames, product_names: $productNames, phase_names: $phaseNames) {
      approvalStatus {
        approval_status
        candidateCount
      }
      whoPrequalification {
        who_prequalification
        candidateCount
      }
      approvingAuthorities {
        authority_type
        who_prequalified
        no_who_listing
      }
    }
  }
`;

// Product Distribution - Portfolio Analysis (Donut Chart)
export const GET_PRODUCT_DISTRIBUTION = gql`
  query ProductDistribution($globalHealthAreas: [String!], $diseaseNames: [String!], $productNames: [String!], $phaseNames: [String!], $candidateType: String) {
    productDistribution(global_health_areas: $globalHealthAreas, disease_names: $diseaseNames, product_names: $productNames, phase_names: $phaseNames, candidate_type: $candidateType) {
      product_name
      candidateCount
    }
  }
`;

// Product Phase Distribution - Portfolio Analysis (Stacked Bar by Product)
export const GET_PRODUCT_PHASE_DISTRIBUTION = gql`
  query ProductPhaseDistribution($globalHealthAreas: [String!], $diseaseNames: [String!], $productNames: [String!], $phaseNames: [String!], $candidateType: String) {
    productPhaseDistribution(global_health_areas: $globalHealthAreas, disease_names: $diseaseNames, product_names: $productNames, phase_names: $phaseNames, candidate_type: $candidateType) {
      product_name
      phase_name
      sort_order
      candidateCount
    }
  }
`;

// Technology Type Distribution - Portfolio Analysis (Technology tab)
export const GET_TECHNOLOGY_TYPE_DISTRIBUTION = gql`
  query TechnologyTypeDistribution($globalHealthAreas: [String!], $diseaseNames: [String!], $productNames: [String!], $phaseNames: [String!], $candidateType: String) {
    technologyTypeDistribution(global_health_areas: $globalHealthAreas, disease_names: $diseaseNames, product_names: $productNames, phase_names: $phaseNames, candidate_type: $candidateType) {
      technology_type
      phase_name
      sort_order
      candidateCount
    }
  }
`;

// R&D Priorities with Candidates - Extract tab (Tab 2, paginated)
export const GET_RD_PRIORITIES_WITH_CANDIDATES = gql`
  query RdPrioritiesWithCandidates($filter: RdPriorityFilter, $limit: Int, $offset: Int) {
    rdPrioritiesWithCandidates(filter: $filter, limit: $limit, offset: $offset) {
      nodes {
        priority_key
        rdpriorityid
        priority_name
        indication
        intended_use
        disease_name
        global_health_area
        author
        publication_date
        target_population
        efficacy
        safety
        source
        product_name
        candidate_name
        current_rd_stage
      }
      totalCount
      hasNextPage
    }
  }
`;

// R&D Priorities only - Extract tab (Tab 4, paginated)
export const GET_RD_PRIORITIES = gql`
  query RdPriorities($filter: RdPriorityFilter, $limit: Int, $offset: Int) {
    rdPriorities(filter: $filter, limit: $limit, offset: $offset) {
      nodes {
        priority_key
        rdpriorityid
        priority_name
        indication
        intended_use
        disease_name
        global_health_area
        author
        publication_date
        target_population
        efficacy
        safety
        source
        product_name
      }
      totalCount
      hasNextPage
    }
  }
`;

// Pipeline filter pairs — distinct (disease, product) tuples for cross-filtering
export const GET_PIPELINE_FILTER_PAIRS = gql`
  query PipelineFilterPairs {
    pipelineFilterPairs {
      disease_group_name
      product_key
      product_name
      phase_name
    }
  }
`;

// Get all diseases (grouped by disease_group_name)
export const GET_DISEASES = gql`
  query GetDiseases {
    diseases {
      disease_group_name
      global_health_area
    }
  }
`;

// Get secondary diseases
export const GET_SECONDARY_DISEASES = gql`
  query GetSecondaryDiseases {
    secondaryDiseases {
      disease_group_name
      global_health_area
    }
  }
`;

// Get disease hierarchy (parent → child grouping for disease panel)
export const GET_DISEASE_HIERARCHY = gql`
  query GetDiseaseHierarchy {
    diseaseHierarchy {
      parent_disease
      child_disease
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
