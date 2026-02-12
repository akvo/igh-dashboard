import { gql } from '@apollo/client/core';

// KPI Cards Query
export const GET_PORTFOLIO_KPIS = gql`
  query KPICards {
    portfolioKPIs {
      totalDiseases
      totalCandidates
      approvedProducts
    }
  }
`;

// Bubble Chart - Scale of Innovation
export const GET_GLOBAL_HEALTH_AREA_SUMMARIES = gql`
  query BubbleChart {
    globalHealthAreaSummaries {
      global_health_area
      candidateCount
      diseaseCount
      productCount
    }
  }
`;

// Phase Distribution - Portfolio by Health Area (Stacked Bar)
export const GET_PHASE_DISTRIBUTION = gql`
  query PhaseDistribution($globalHealthArea: String, $productKey: Int, $candidateType: String) {
    phaseDistribution(global_health_area: $globalHealthArea, product_key: $productKey, candidate_type: $candidateType) {
      global_health_area
      phase_name
      sort_order
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
  query TemporalAnalysis($years: [Int!]) {
    temporalSnapshots(years: $years) {
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
