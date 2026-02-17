export const typeDefs = `#graphql
  # =============================================================================
  # DIMENSION TYPES (mirror DB table names and columns)
  # =============================================================================

  type DimProduct {
    product_key: Int!
    vin_productid: String
    product_name: String
    product_type: String
  }

  type DimDisease {
    disease_key: Int!
    vin_diseaseid: String
    disease_name: String
    global_health_area: String
    disease_type: String
  }

  type DimPhase {
    phase_key: Int!
    vin_rdstageid: String
    phase_name: String
    sort_order: Int
  }

  type DimGeography {
    country_key: Int!
    vin_countryid: String
    country_name: String
    iso_code: String
    region_name: String
  }

  type DimOrganization {
    organization_key: Int!
    accountid: String
    org_name: String
    org_type: String
  }

  type DimPriority {
    priority_key: Int!
    vin_rdpriorityid: String
    priority_name: String
    indication: String
    intended_use: String
    disease_key: Int
  }

  type DimDate {
    date_key: Int!
    full_date: String
    year: Int
    quarter: Int
  }

  type DimCandidateTech {
    technology_key: Int!
    platform: String
    technology_type: String
    molecule_type: String
    route_of_admin: String
  }

  type DimCandidateRegulatory {
    regulatory_key: Int!
    approval_status: String
    sra_approval_flag: Int
    fda_approval_date: String
    who_prequal_date: String
    who_prequalification: String
    nra_approval_status: String
    nra_approval_date: String
  }

  type DimDeveloper {
    developer_key: Int!
    developer_name: String
  }

  type DimCandidateCore {
    candidate_key: Int!
    vin_candidateid: String
    candidate_name: String
    vin_candidate_code: String
    developers_agg: String
    alternative_names: String
    target: String
    mechanism_of_action: String
    key_features: String
    known_funders_agg: String
    development_status: String
    current_rd_stage: String
    countries_approved_count: Int
    countries_approved_agg: String
    candidate_type: String
    indication: String

    # Resolved via joins
    disease: DimDisease
    phase: DimPhase
    product: DimProduct
    developers: [DimDeveloper!]!
    geographies: [CandidateGeography!]!
    priorities: [DimPriority!]!
    clinicalTrials: [FactClinicalTrialEvent!]!
  }

  # =============================================================================
  # FACT TYPES
  # =============================================================================

  type FactClinicalTrialEvent {
    trial_id: Int!
    candidate_key: Int
    start_date_key: Int
    trial_phase: String
    enrollment_count: Int
    status: String
    vin_clinicaltrialid: String
    disease_key: Int
    product_key: Int
    trial_name: String
    trial_title: String
    sponsor: String
    locations: String
    age_groups: String
    study_type: String
    source_text: String
  }

  # =============================================================================
  # AGGREGATE TYPES (dashboard KPIs and visualizations)
  # =============================================================================

  type PortfolioKPIs {
    totalDiseases: Int!
    totalCandidates: Int!
    approvedProducts: Int!
  }

  type GlobalHealthAreaSummary {
    global_health_area: String!
    candidateCount: Int!
    diseaseCount: Int!
    productCount: Int!
  }

  type PhaseDistributionRow {
    global_health_area: String!
    phase_name: String!
    sort_order: Int!
    candidateCount: Int!
  }

  type CandidateTypeDistributionRow {
    global_health_area: String!
    candidate_type: String!
    candidateCount: Int!
  }

  type GeographicDistributionRow {
    country_key: Int!
    country_name: String!
    iso_code: String
    location_scope: String!
    candidateCount: Int!
  }

  type TemporalSnapshotRow {
    year: Int!
    phase_name: String!
    sort_order: Int!
    candidateCount: Int!
  }

  # =============================================================================
  # CONNECTION TYPES (pagination)
  # =============================================================================

  type CandidateConnection {
    nodes: [DimCandidateCore!]!
    totalCount: Int!
    hasNextPage: Boolean!
  }

  type CandidateGeography {
    country_key: Int!
    country_name: String
    iso_code: String
    location_scope: String
  }

  # =============================================================================
  # INPUT TYPES
  # =============================================================================

  input CandidateFilter {
    global_health_area: String
    disease_key: Int
    product_key: Int
    phase_key: Int
    year: Int
    is_active: Boolean
  }

  # =============================================================================
  # QUERY ROOT
  # =============================================================================

  type Query {
    # KPIs (3 homepage cards)
    portfolioKPIs: PortfolioKPIs!

    # Bubble chart
    globalHealthAreaSummaries(candidate_types: [String!]): [GlobalHealthAreaSummary!]!

    # Stacked bar chart
    phaseDistribution(global_health_area: String, product_keys: [Int!], candidate_type: String): [PhaseDistributionRow!]!

    # Portfolio overview - candidate type distribution
    candidateTypeDistribution(product_keys: [Int!], phase_names: [String!]): [CandidateTypeDistributionRow!]!

    # Map
    geographicDistribution(location_scope: String!): [GeographicDistributionRow!]!

    # Cross-pipeline temporal
    temporalSnapshots(years: [Int!], disease_key: Int, global_health_areas: [String!], product_keys: [Int!], candidate_type: String): [TemporalSnapshotRow!]!

    # Lists with pagination
    candidates(filter: CandidateFilter, limit: Int, offset: Int): CandidateConnection!

    # Detail
    candidate(candidate_key: Int!): DimCandidateCore

    # Filter dropdowns (lookups)
    diseases: [DimDisease!]!
    phases: [DimPhase!]!
    products: [DimProduct!]!
    countries: [DimGeography!]!
    availableYears: [Int!]!
    locationScopes: [String!]!
  }
`;
