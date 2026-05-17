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
    diseaseid: String
    disease_name: String
    disease_group_name: String
    global_health_area: String
    disease_type: String
    disease_filter: String
    secondary_disease_name: String
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
    rdpriorityid: String
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
    fda_approval_date: String
    who_prequal_date: String
    who_prequalification: String
    nra_approval_status: String
    sra_approval_status: String
    ema_approval_status: String
    japanese_mhlw_approval_status: String
    us_fda_approval_status: String
  }

  type DimDeveloper {
    developer_key: Int!
    developer_name: String
  }

  type DimCandidateCore {
    candidate_key: Int!
    candidateid: String
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
    indication_type: String
    healthcare_facility_level: String
    preclinical_results_status: String
    type_of_preclinical_results: String
    preclinical_results_source: String
    recent_updates: String
    test_format: String

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
    last_updated_key: Int
    end_date_key: Int
    primary_completion_date_key: Int
    trial_phase: String
    enrollment_count: Int
    status: String
    clinicaltrialid: String
    disease_key: Int
    product_key: Int
    trial_name: String
    trial_title: String
    sponsor: String
    locations: String
    age_groups: String
    study_type: String
    source_text: String
    description: String
    collaborator: String
    funder_type: String
    interventions: String
    sex: String
    study_design: String
    conditions: String

    # Date strings resolved from FKs
    start_date: String
    end_date: String
    primary_completion_date: String

    # Parsed helpers derived from study_design
    allocation: String
    intervention_model: String
    masking: String
    primary_purpose: String
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

  type GhaProductTypeSummary {
    global_health_area: String!
    product_type: String!
    candidateCount: Int!
    productCount: Int!
  }

  type DiseaseSummary {
    disease_group_name: String!
    global_health_area: String!
    candidateCount: Int!
    productCount: Int!
  }

  type DiseaseProductTypeSummary {
    disease_group_name: String!
    global_health_area: String!
    product_type: String!
    candidateCount: Int!
    productCount: Int!
  }

  type PhaseDistributionRow {
    global_health_area: String!
    phase_name: String!
    sort_order: Int!
    candidateCount: Int!
  }

  type ProductPhaseDistributionRow {
    product_name: String!
    phase_name: String!
    sort_order: Int!
    candidateCount: Int!
  }

  type TechnologyTypeDistributionRow {
    technology_type: String!
    phase_name: String!
    sort_order: Int!
    candidateCount: Int!
  }

  type ProductDistributionRow {
    product_name: String!
    candidateCount: Int!
  }

  type ClinicalTrialStatusRow {
    status: String!
    trialCount: Int!
  }

  type AgeGroupDistributionRow {
    age_group_name: String!
    candidateCount: Int!
  }

  type ClinicalTrialStats {
    totalTrials: Int!
    statusDistribution: [ClinicalTrialStatusRow!]!
    ageGroupDistribution: [AgeGroupDistributionRow!]!
  }

  type ApprovalStatusRow {
    approval_status: String!
    candidateCount: Int!
  }

  type WHOPrequalRow {
    who_prequalification: String!
    candidateCount: Int!
  }

  type ApprovingAuthorityRow {
    authority_type: String!
    who_prequalified: Int!
    no_who_listing: Int!
  }

  type RegulatoryDistribution {
    approvalStatus: [ApprovalStatusRow!]!
    whoPrequalification: [WHOPrequalRow!]!
    approvingAuthorities: [ApprovingAuthorityRow!]!
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

  type DiseaseHierarchyRow {
    primary_disease: String!
    # Equal to primary_disease for childless primaries -- the
    # sidebar renders such rows as leaves without an expand "+".
    secondary_disease: String!
    global_health_area: String!
  }

  type PipelineFilterPair {
    disease_group_name: String!
    disease_filter: String
    secondary_disease_name: String
    product_key: Int!
    product_name: String!
    phase_name: String
  }

  # =============================================================================
  # CONNECTION TYPES (pagination)
  # =============================================================================

  type CandidateConnection {
    nodes: [DimCandidateCore!]!
    totalCount: Int!
    hasNextPage: Boolean!
  }

  type PortfolioCandidateNode {
    candidate_key: Int!
    candidate_name: String
    candidate_type: String
    candidateid: String
    alternative_names: String
    current_rd_stage: String
    countries_approved_count: Int
    countries_approved_agg: String
    indication: String
    target: String
    developers_agg: String
    mechanism_of_action: String
    key_features: String
    known_funders_agg: String
    technology_type: String
    indication_type: String
    healthcare_facility_level: String
    preclinical_results_status: String
    type_of_preclinical_results: String
    preclinical_results_source: String
    recent_updates: String
    test_format: String
    global_health_area: String
    disease_name: String
    secondary_disease_name: String
    product_name: String
    sub_product_name: String
    phase_name: String
    approval_status: String
    who_prequalification: String
    nra_approval_status: String
    sra_approval_status: String
    ema_approval_status: String
    japanese_mhlw_approval_status: String
    us_fda_approval_status: String
    approving_authorities_agg: String
    technology_principle: String
    target_population: String
    route_of_administration: String
    platform: String
    chim_study: String
    key_clinical_trial: String
    rd_stage_2023: String
    rd_stage_2019: String
  }

  type PortfolioCandidateConnection {
    nodes: [PortfolioCandidateNode!]!
    totalCount: Int!
    hasNextPage: Boolean!
  }

  type ClinicalTrialNode {
    trial_id: Int!
    clinicaltrialid: String
    trial_name: String
    trial_title: String
    trial_phase: String
    status: String
    candidate_name: String
    disease_name: String
    product_name: String
    start_date: String
    end_date: String
    last_updated: String
    description: String
    ct_results_status: String
    collaborator: String
    locations: String
    sponsor: String
    source_text: String
    age_groups: String
    enrollment_count: Int
    study_type: String
    funder_type: String
    interventions: String
    outcome_measure: String
    sex: String
    study_design: String
    ct_results_type: String
    ct_terminated_reason: String
  }

  type ClinicalTrialConnection {
    nodes: [ClinicalTrialNode!]!
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
  # R&D PRIORITY TYPES (Extract tab)
  # =============================================================================

  type RdPriorityNode {
    priority_key: Int!
    rdpriorityid: String
    priority_name: String
    indication: String
    intended_use: String
    disease_name: String
    global_health_area: String
    author: String
    publication_date: String
    target_population: String
    efficacy: String
    safety: String
    source: String
    product_name: String
    candidate_name: String
    current_rd_stage: String
  }

  type RdPriorityConnection {
    nodes: [RdPriorityNode!]!
    totalCount: Int!
    hasNextPage: Boolean!
  }

  # =============================================================================
  # INPUT TYPES
  # =============================================================================

  # =============================================================================
  # DataTable filter / sort / distinct-values support
  # (see docs/superpowers/specs/2026-04-30-data-table-improvements-design.md)
  # =============================================================================

  enum ColumnFilterKind {
    TEXT
    CATEGORY
    NUMBER
    DATE
  }

  enum ColumnFilterOperator {
    EQ        # NUMBER = ; DATE = (whole-day match via DATE())
    LT        # NUMBER <
    GT        # NUMBER >
    BEFORE    # DATE <
    AFTER     # DATE >
    BETWEEN   # NUMBER / DATE inclusive range; NULL bounds = open
  }

  # ColumnFilter carries every kind's value fields in one input. The
  # resolver picks the right ones based on the kind; the others are
  # ignored. Keeps the frontend filter-state shape simple at the cost
  # of a tiny validation hop server-side.
  input ColumnFilter {
    column: String!
    kind: ColumnFilterKind!
    # TEXT
    text: String
    # CATEGORY
    values: [String!]
    # NUMBER + DATE
    operator: ColumnFilterOperator
    # NUMBER
    number_value: Float
    number_value_end: Float
    # DATE — ISO yyyy-mm-dd
    date_value: String
    date_value_end: String
  }

  enum SortDirection {
    ASC
    DESC
  }

  input ColumnSort {
    column: String!
    direction: SortDirection!
  }

  enum DataTable {
    PORTFOLIO_CANDIDATES
    CLINICAL_TRIALS
    RD_PRIORITIES
    RD_PRIORITIES_WITH_CANDIDATES
  }

  # Generic context filter used by distinctValues. Any irrelevant fields
  # are ignored per-table; e.g. statuses applies only when
  # table = CLINICAL_TRIALS.
  input ColumnFilterContext {
    global_health_areas: [String!]
    primary_disease_names: [String!]
    secondary_disease_names: [String!]
    product_names: [String!]
    candidate_type: String
    phase_names: [String!]
    statuses: [String!]
    column_filters: [ColumnFilter!]
  }

  input PortfolioCandidateFilter {
    global_health_areas: [String!]
    primary_disease_names: [String!]
    secondary_disease_names: [String!]
    product_names: [String!]
    candidate_type: String
    phase_names: [String!]
    column_filters: [ColumnFilter!]
  }

  input ClinicalTrialFilter {
    global_health_areas: [String!]
    primary_disease_names: [String!]
    secondary_disease_names: [String!]
    product_names: [String!]
    statuses: [String!]
    column_filters: [ColumnFilter!]
  }

  input RdPriorityFilter {
    global_health_areas: [String!]
    primary_disease_names: [String!]
    secondary_disease_names: [String!]
    column_filters: [ColumnFilter!]
  }

  input CandidateFilter {
    global_health_area: String
    disease_key: Int
    product_key: Int
    phase_key: Int
    year: Int
    is_active: Boolean
  }

  # =============================================================================
  # PRIORITY ALIGNMENT TYPES (Home section)
  # =============================================================================

  type PriorityAlignmentAreaShare {
    global_health_area: String!
    candidatesWithPriority: Int!
    totalCandidates: Int!
    sharePercentage: Float!
  }

  type PriorityAlignmentProductType {
    product_name: String!
    candidateCount: Int!
  }

  type PriorityAlignmentDiseaseOption {
    disease_key: Int!
    disease_name: String!
    # Nullable: 7 of the 19 priority-bearing diseases (HIV/AIDS,
    # Tuberculosis, etc.) are not categorised into the three WHO areas.
    global_health_area: String
  }

  # Counts feeding the "Share of priorities dedicated to women or children"
  # donut. The unknown bucket captures priorities where the Dataverse
  # Two-Options field crc8b_dedicatedtowomenorchildren is unset (null in
  # dim_priority).
  type PriorityAlignmentWomenChildrenShare {
    yes: Int!
    no: Int!
    unknown: Int!
  }

  type PriorityAlignmentOverview {
    totalPriorities: Int!
    byArea: [PriorityAlignmentAreaShare!]!
    productTypeBreakdown: [PriorityAlignmentProductType!]!
    diseaseOptions: [PriorityAlignmentDiseaseOption!]!
    womenOrChildrenShare: PriorityAlignmentWomenChildrenShare!
  }

  # =============================================================================
  # Slide-in composite types (Aggregated Portfolio Explore panels)
  # =============================================================================

  type PipelineHistoryEntry {
    year: Int!
    phase_name: String!
  }

  type SlideInDeveloper {
    name: String!
    org_type: String
  }

  type RegulatoryInfo {
    approval_status: String
    who_prequalification: String
    approving_authorities: [String!]!
  }

  type DiseaseSummaryPair {
    primary: String!
    secondary: String
  }

  type FactPublication {
    publication_id: Int!
    candidate_key: Int
    title: String
    url: String
    description: String
  }

  type SlideInCandidate {
    candidate: DimCandidateCore!
    product: DimProduct
    subProduct: DimProduct
    technologyType: String
    diseases: DiseaseSummaryPair!
    ageGroups: [String!]!
    pipelineHistory: [PipelineHistoryEntry!]!
    developers: [SlideInDeveloper!]!
    trials: [FactClinicalTrialEvent!]!
    priorities: [DimPriority!]!
    publications: [FactPublication!]!
  }

  type SlideInProduct {
    candidate: DimCandidateCore!
    product: DimProduct
    subProduct: DimProduct
    technologyType: String
    diseases: DiseaseSummaryPair!
    ageGroups: [String!]!
    pipelineHistory: [PipelineHistoryEntry!]!
    developers: [SlideInDeveloper!]!
    trials: [FactClinicalTrialEvent!]!
    priorities: [DimPriority!]!
    publications: [FactPublication!]!
    regulatory: RegulatoryInfo!
  }

  type SlideInTrial {
    trial: FactClinicalTrialEvent!
    candidate: DimCandidateCore
    disease: DimDisease
  }

  # =============================================================================
  # QUERY ROOT
  # =============================================================================

  type Query {
    # KPIs (3 homepage cards)
    portfolioKPIs(global_health_areas: [String!], primary_disease_names: [String!], secondary_disease_names: [String!], product_names: [String!], phase_names: [String!]): PortfolioKPIs!

    # Bubble chart — four views
    globalHealthAreaSummaries(candidate_types: [String!]): [GlobalHealthAreaSummary!]!
    ghaProductTypeSummaries(candidate_types: [String!]): [GhaProductTypeSummary!]!
    diseaseSummaries(candidate_types: [String!]): [DiseaseSummary!]!
    diseaseProductTypeSummaries(candidate_types: [String!]): [DiseaseProductTypeSummary!]!

    # Stacked bar chart
    phaseDistribution(global_health_area: String, product_keys: [Int!], candidate_type: String): [PhaseDistributionRow!]!

    # Portfolio overview - candidate type distribution
    candidateTypeDistribution(product_keys: [Int!], phase_names: [String!]): [CandidateTypeDistributionRow!]!

    # Map
    geographicDistribution(location_scope: String!, statuses: [String!], global_health_areas: [String!], primary_disease_names: [String!], secondary_disease_names: [String!], product_names: [String!], phase_names: [String!]): [GeographicDistributionRow!]!

    # Cross-pipeline temporal
    temporalSnapshots(years: [Int!], primary_disease_names: [String!], secondary_disease_names: [String!], global_health_areas: [String!], product_keys: [Int!], candidate_type: String): [TemporalSnapshotRow!]!

    # Pipeline filter pairs (disease×product) for cross-filtering
    pipelineFilterPairs: [PipelineFilterPair!]!

    # Active-pipeline filter pairs — same shape, but restricted to
    # is_active_flag=1 and candidate_type IN ('Candidate','Product').
    # Used by Portfolio Overview dropdowns to avoid empty-chart options.
    activePipelineFilterPairs: [PipelineFilterPair!]!

    # Lists with pagination
    candidates(filter: CandidateFilter, limit: Int, offset: Int): CandidateConnection!

    # Detail
    candidate(candidate_key: Int!): DimCandidateCore

    # Portfolio analysis - candidates list (paginated with flattened dimensions)
    portfolioCandidates(filter: PortfolioCandidateFilter, sort: ColumnSort, limit: Int, offset: Int): PortfolioCandidateConnection!

    # Portfolio analysis - clinical trials list (paginated)
    clinicalTrials(filter: ClinicalTrialFilter, sort: ColumnSort, limit: Int, offset: Int): ClinicalTrialConnection!

    # Extract tab - R&D priorities with linked candidates (paginated)
    rdPrioritiesWithCandidates(filter: RdPriorityFilter, sort: ColumnSort, limit: Int, offset: Int): RdPriorityConnection!

    # Extract tab - R&D priorities only (paginated)
    rdPriorities(filter: RdPriorityFilter, sort: ColumnSort, limit: Int, offset: Int): RdPriorityConnection!

    # DataTable distinct-values lookup for category-filter dropdowns.
    # The filter argument should mirror the list-query filter EXCLUDING
    # the requesting column's own entry from column_filters so dropdown
    # values stay contextual.
    distinctValues(table: DataTable!, column: String!, filter: ColumnFilterContext): [String!]!

    # Portfolio analysis - clinical trial stats (trials tab)
    clinicalTrialStats(global_health_areas: [String!], primary_disease_names: [String!], secondary_disease_names: [String!], product_names: [String!], phase_names: [String!]): ClinicalTrialStats!

    # Portfolio analysis - regulatory distribution (approved products tab)
    regulatoryDistribution(global_health_areas: [String!], primary_disease_names: [String!], secondary_disease_names: [String!], product_names: [String!], phase_names: [String!]): RegulatoryDistribution!

    # WHO Priority alignment — single consolidated payload (Home + WHO page).
    priorityAlignmentOverview(
      global_health_areas: [String!],
      primary_disease_names: [String!],
      secondary_disease_names: [String!],
      product_names: [String!],
    ): PriorityAlignmentOverview!

    # Portfolio analysis - product distribution (donut chart)
    productDistribution(global_health_areas: [String!], primary_disease_names: [String!], secondary_disease_names: [String!], product_names: [String!], candidate_type: String, phase_names: [String!]): [ProductDistributionRow!]!

    # Portfolio analysis - product phase distribution
    productPhaseDistribution(global_health_areas: [String!], primary_disease_names: [String!], secondary_disease_names: [String!], product_names: [String!], candidate_type: String, phase_names: [String!]): [ProductPhaseDistributionRow!]!

    # Portfolio analysis - technology type distribution
    technologyTypeDistribution(global_health_areas: [String!], primary_disease_names: [String!], secondary_disease_names: [String!], product_names: [String!], candidate_type: String, phase_names: [String!]): [TechnologyTypeDistributionRow!]!

    # Filter dropdowns (lookups)
    diseases: [DimDisease!]!
    secondaryDiseases: [DimDisease!]!
    diseaseHierarchy: [DiseaseHierarchyRow!]!
    phases: [DimPhase!]!
    products: [DimProduct!]!
    countries: [DimGeography!]!
    availableYears: [Int!]!
    locationScopes: [String!]!
    lastSyncDate: String

    # Aggregated Portfolio slide-ins
    slideInCandidate(candidate_key: Int!): SlideInCandidate
    slideInProduct(candidate_key: Int!): SlideInProduct
    slideInTrial(trial_id: Int!): SlideInTrial
  }
`;
