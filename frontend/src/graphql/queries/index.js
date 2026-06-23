import { gql } from '@apollo/client/core';

// KPI Cards Query
export const GET_PORTFOLIO_KPIS = gql`
  query KPICards($globalHealthAreas: [String!], $primaryDiseaseNames: [String!], $secondaryDiseaseNames: [String!], $productNames: [String!], $phaseNames: [String!]) {
    portfolioKPIs(global_health_areas: $globalHealthAreas, primary_disease_names: $primaryDiseaseNames, secondary_disease_names: $secondaryDiseaseNames, product_names: $productNames, phase_names: $phaseNames) {
      totalDiseases
      totalCandidates
      approvedProducts
    }
  }
`;

// Bubble Chart - Scale of R&D by global health area
export const GET_GLOBAL_HEALTH_AREA_SUMMARIES = gql`
  query BubbleChart(
    $candidateTypes: [String!]
    $globalHealthAreas: [String!]
    $primaryDiseaseNames: [String!]
    $secondaryDiseaseNames: [String!]
    $phaseNames: [String!]
    $productNames: [String!]
  ) {
    globalHealthAreaSummaries(
      candidate_types: $candidateTypes
      global_health_areas: $globalHealthAreas
      primary_disease_names: $primaryDiseaseNames
      secondary_disease_names: $secondaryDiseaseNames
      phase_names: $phaseNames
      product_names: $productNames
    ) {
      global_health_area
      candidateCount
      diseaseCount
      productCount
    }
  }
`;

// Bubble Chart — GHA × Product Type view
export const GET_GHA_PRODUCT_TYPE_SUMMARIES = gql`
  query BubbleChartGhaProductType(
    $candidateTypes: [String!]
    $globalHealthAreas: [String!]
    $primaryDiseaseNames: [String!]
    $secondaryDiseaseNames: [String!]
    $productNames: [String!]
    $phaseNames: [String!]
  ) {
    ghaProductTypeSummaries(
      candidate_types: $candidateTypes
      global_health_areas: $globalHealthAreas
      primary_disease_names: $primaryDiseaseNames
      secondary_disease_names: $secondaryDiseaseNames
      product_names: $productNames
      phase_names: $phaseNames
    ) {
      global_health_area
      product_type
      candidateCount
      productCount
    }
  }
`;

// Bubble Chart — Disease view
export const GET_DISEASE_SUMMARIES = gql`
  query BubbleChartDisease(
    $candidateTypes: [String!]
    $productNames: [String!]
    $technologyTypes: [String!]
    $globalHealthAreas: [String!]
    $primaryDiseaseNames: [String!]
    $secondaryDiseaseNames: [String!]
    $phaseNames: [String!]
  ) {
    diseaseSummaries(
      candidate_types: $candidateTypes
      product_names: $productNames
      technology_types: $technologyTypes
      global_health_areas: $globalHealthAreas
      primary_disease_names: $primaryDiseaseNames
      secondary_disease_names: $secondaryDiseaseNames
      phase_names: $phaseNames
    ) {
      disease_group_name
      global_health_area
      candidateCount
      productCount
    }
  }
`;

// Bubble Chart — Disease × Product Type view
export const GET_DISEASE_PRODUCT_TYPE_SUMMARIES = gql`
  query BubbleChartDiseaseProductType(
    $candidateTypes: [String!]
    $globalHealthAreas: [String!]
    $primaryDiseaseNames: [String!]
    $secondaryDiseaseNames: [String!]
    $productNames: [String!]
    $phaseNames: [String!]
  ) {
    diseaseProductTypeSummaries(
      candidate_types: $candidateTypes
      global_health_areas: $globalHealthAreas
      primary_disease_names: $primaryDiseaseNames
      secondary_disease_names: $secondaryDiseaseNames
      product_names: $productNames
      phase_names: $phaseNames
    ) {
      disease_group_name
      global_health_area
      product_type
      candidateCount
      productCount
    }
  }
`;


// Candidate Type Distribution - Portfolio by Health Area (Stacked Bar)
export const GET_CANDIDATE_TYPE_DISTRIBUTION = gql`
  query CandidateTypeDistribution($productKeys: [Int!], $phaseNames: [String!], $globalHealthAreas: [String!], $primaryDiseaseNames: [String!], $secondaryDiseaseNames: [String!]) {
    candidateTypeDistribution(product_keys: $productKeys, phase_names: $phaseNames, global_health_areas: $globalHealthAreas, primary_disease_names: $primaryDiseaseNames, secondary_disease_names: $secondaryDiseaseNames) {
      global_health_area
      candidate_type
      candidateCount
    }
  }
`;

// Geographic Distribution Map
export const GET_GEOGRAPHIC_DISTRIBUTION = gql`
  query GeographicMap($scope: String!, $statuses: [String!], $globalHealthAreas: [String!], $primaryDiseaseNames: [String!], $secondaryDiseaseNames: [String!], $productNames: [String!], $phaseNames: [String!]) {
    geographicDistribution(location_scope: $scope, statuses: $statuses, global_health_areas: $globalHealthAreas, primary_disease_names: $primaryDiseaseNames, secondary_disease_names: $secondaryDiseaseNames, product_names: $productNames, phase_names: $phaseNames) {
      country_key
      country_name
      iso_code
      candidateCount
    }
  }
`;

// Temporal Snapshots - Cross-pipeline Analytics
export const GET_TEMPORAL_SNAPSHOTS = gql`
  query TemporalAnalysis($years: [Int!], $primaryDiseaseNames: [String!], $secondaryDiseaseNames: [String!], $globalHealthAreas: [String!], $productKeys: [Int!], $phaseNames: [String!]) {
    temporalSnapshots(years: $years, primary_disease_names: $primaryDiseaseNames, secondary_disease_names: $secondaryDiseaseNames, global_health_areas: $globalHealthAreas, product_keys: $productKeys, phase_names: $phaseNames) {
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
  query PortfolioCandidates($filter: PortfolioCandidateFilter, $sort: ColumnSort, $limit: Int, $offset: Int) {
    portfolioCandidates(filter: $filter, sort: $sort, limit: $limit, offset: $offset) {
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
  query ClinicalTrials($filter: ClinicalTrialFilter, $sort: ColumnSort, $limit: Int, $offset: Int) {
    clinicalTrials(filter: $filter, sort: $sort, limit: $limit, offset: $offset) {
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
        last_updated
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
  query ClinicalTrialStats($globalHealthAreas: [String!], $primaryDiseaseNames: [String!], $secondaryDiseaseNames: [String!], $productNames: [String!], $phaseNames: [String!]) {
    clinicalTrialStats(global_health_areas: $globalHealthAreas, primary_disease_names: $primaryDiseaseNames, secondary_disease_names: $secondaryDiseaseNames, product_names: $productNames, phase_names: $phaseNames) {
      totalTrials
      statusDistribution {
        status
        trialCount
      }
      ageGroupDistribution {
        age_group_name
        candidateCount
      }
      diseaseDistribution {
        disease_name
        global_health_area
        trialCount
      }
      productTypeDistribution {
        product_name
        trialCount
      }
      ghaDistribution {
        global_health_area
        trialCount
      }
    }
  }
`;

// Regulatory Distribution - Portfolio Analysis (Approved Products tab)
export const GET_REGULATORY_DISTRIBUTION = gql`
  query RegulatoryDistribution($globalHealthAreas: [String!], $primaryDiseaseNames: [String!], $secondaryDiseaseNames: [String!], $productNames: [String!], $phaseNames: [String!]) {
    regulatoryDistribution(global_health_areas: $globalHealthAreas, primary_disease_names: $primaryDiseaseNames, secondary_disease_names: $secondaryDiseaseNames, product_names: $productNames, phase_names: $phaseNames) {
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
  query ProductDistribution($globalHealthAreas: [String!], $primaryDiseaseNames: [String!], $secondaryDiseaseNames: [String!], $productNames: [String!], $phaseNames: [String!], $candidateType: String) {
    productDistribution(global_health_areas: $globalHealthAreas, primary_disease_names: $primaryDiseaseNames, secondary_disease_names: $secondaryDiseaseNames, product_names: $productNames, phase_names: $phaseNames, candidate_type: $candidateType) {
      product_name
      candidateCount
      techTypeCount
      approvedProductCount
    }
  }
`;

// Product Phase Distribution - Portfolio Analysis (Stacked Bar by Product)
export const GET_PRODUCT_PHASE_DISTRIBUTION = gql`
  query ProductPhaseDistribution($globalHealthAreas: [String!], $primaryDiseaseNames: [String!], $secondaryDiseaseNames: [String!], $productNames: [String!], $phaseNames: [String!], $candidateType: String) {
    productPhaseDistribution(global_health_areas: $globalHealthAreas, primary_disease_names: $primaryDiseaseNames, secondary_disease_names: $secondaryDiseaseNames, product_names: $productNames, phase_names: $phaseNames, candidate_type: $candidateType) {
      product_name
      phase_name
      sort_order
      candidateCount
    }
  }
`;

// Technology Type Distribution - Portfolio Analysis (Technology tab)
export const GET_TECHNOLOGY_TYPE_DISTRIBUTION = gql`
  query TechnologyTypeDistribution($globalHealthAreas: [String!], $primaryDiseaseNames: [String!], $secondaryDiseaseNames: [String!], $productNames: [String!], $phaseNames: [String!], $candidateType: String) {
    technologyTypeDistribution(global_health_areas: $globalHealthAreas, primary_disease_names: $primaryDiseaseNames, secondary_disease_names: $secondaryDiseaseNames, product_names: $productNames, phase_names: $phaseNames, candidate_type: $candidateType) {
      technology_type
      phase_name
      sort_order
      candidateCount
    }
  }
`;

// R&D Priorities with Candidates - Extract tab (Tab 2, paginated)
export const GET_RD_PRIORITIES_WITH_CANDIDATES = gql`
  query RdPrioritiesWithCandidates($filter: RdPriorityFilter, $sort: ColumnSort, $limit: Int, $offset: Int) {
    rdPrioritiesWithCandidates(filter: $filter, sort: $sort, limit: $limit, offset: $offset) {
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
  query RdPriorities($filter: RdPriorityFilter, $sort: ColumnSort, $limit: Int, $offset: Int) {
    rdPriorities(filter: $filter, sort: $sort, limit: $limit, offset: $offset) {
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

// Pipeline filter pairs — distinct (disease, product) tuples for cross-filtering.
// Carries both `disease_filter` (authoritative primary) and
// `secondary_disease_name` so the cross-filter can intersect on
// either axis. `disease_group_name` is kept for backwards compat
// with existing chart tooltips that key on it.
export const GET_PIPELINE_FILTER_PAIRS = gql`
  query PipelineFilterPairs {
    pipelineFilterPairs {
      disease_group_name
      disease_filter
      secondary_disease_name
      product_key
      product_name
      phase_name
    }
  }
`;

// Active-pipeline filter pairs — same shape as pipelineFilterPairs, but
// restricted to active candidates of type Candidate/Product. Used by
// Portfolio Overview / Portfolio Analysis dropdowns to avoid offering
// options that produce empty charts. Carries `disease_filter` /
// `secondary_disease_name` so the hierarchical cross-filter can intersect
// on either axis.
export const GET_ACTIVE_PIPELINE_FILTER_PAIRS = gql`
  query ActivePipelineFilterPairs {
    activePipelineFilterPairs {
      disease_group_name
      disease_filter
      secondary_disease_name
      product_key
      product_name
      phase_name
    }
  }
`;

// Primary disease groups (e.g. "Malaria", "Tuberculosis").
export const GET_DISEASES = gql`
  query GetDiseases {
    diseases {
      disease_filter
      global_health_area
    }
  }
`;

// Secondary diseases joined to their parent primary so the
// frontend can build the parent->children map without a second
// roundtrip.
export const GET_SECONDARY_DISEASES = gql`
  query GetSecondaryDiseases {
    secondaryDiseases {
      disease_filter
      secondary_disease_name
      global_health_area
    }
  }
`;

// Hierarchy of (primary, secondary, GHA) used by the home-page
// sidebar. Childless primaries appear with `secondary == primary`,
// matching the sidebar's existing leaf rendering.
export const GET_DISEASE_HIERARCHY = gql`
  query GetDiseaseHierarchy {
    diseaseHierarchy {
      primary_disease
      secondary_disease
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

// =========================================================
// WHO Priority Alignment — shared between Home and WHO page
// =========================================================
// Single consolidated payload powering both the Home section's
// cards/donuts and the WHO page's Priorities overview section.
// The four filter args mirror the standard filter convention used by
// `portfolioKPIs`, `productDistribution`, etc.
export const GET_PRIORITY_ALIGNMENT_OVERVIEW = gql`
  query PriorityAlignmentOverview(
    $globalHealthAreas: [String!],
    $primaryDiseaseNames: [String!],
    $secondaryDiseaseNames: [String!],
    $productNames: [String!]
  ) {
    priorityAlignmentOverview(
      global_health_areas: $globalHealthAreas,
      primary_disease_names: $primaryDiseaseNames,
      secondary_disease_names: $secondaryDiseaseNames,
      product_names: $productNames,
    ) {
      totalPriorities
      byArea {
        global_health_area
        candidatesWithPriority
        totalCandidates
        sharePercentage
        applicableDiseases
        applicableProductNames
      }
      productTypeBreakdown {
        product_name
        candidateCount
      }
      diseaseOptions {
        disease_key
        disease_name
        disease_filter
        global_health_area
      }
      womenOrChildrenShare {
        yes
        no
        unknown
      }
      priorities {
        priority_key
        priority_name
      }
    }
  }
`;

// Individual priority drill-down — counts + target_population + pipeline build-up
// for one priority on the WHO Priority Alignment page.
export const GET_INDIVIDUAL_PRIORITY_ANALYSIS = gql`
  query IndividualPriorityAnalysis(
    $priorityKey: Int!
    $globalHealthAreas: [String!]
    $primaryDiseaseNames: [String!]
    $secondaryDiseaseNames: [String!]
    $productNames: [String!]
  ) {
    individualPriorityAnalysis(
      priority_key: $priorityKey
      global_health_areas: $globalHealthAreas
      primary_disease_names: $primaryDiseaseNames
      secondary_disease_names: $secondaryDiseaseNames
      product_names: $productNames
    ) {
      candidatesCount
      targetPopulation
      pipelineBuildUp {
        product_name
        phase_name
        sort_order
        candidateCount
      }
    }
  }
`;

// Aggregated Portfolio slide-in queries
export {
  GET_SLIDE_IN_CANDIDATE,
  GET_SLIDE_IN_PRODUCT,
  GET_SLIDE_IN_TRIAL,
} from './slideIns';
