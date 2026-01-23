/**
 * Barrel export for test fixtures
 *
 * Import captured JSON fixtures for use in tests with mocked database.
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadFixture<T>(name: string): T {
  const filePath = join(__dirname, `${name}.json`);
  const content = readFileSync(filePath, "utf-8");
  return JSON.parse(content) as T;
}

// Type definitions for fixtures
export interface PortfolioKPIsFixture {
  portfolioKPIs: {
    totalDiseases: number;
    totalCandidates: number;
    approvedProducts: number;
  };
}

export interface GlobalHealthAreaSummary {
  global_health_area: string;
  candidateCount: number;
  diseaseCount: number;
  productCount: number;
}

export interface GlobalHealthAreaSummariesFixture {
  globalHealthAreaSummaries: GlobalHealthAreaSummary[];
}

export interface GeographicDistributionRow {
  country_key: number;
  country_name: string;
  iso_code: string | null;
  location_scope: string;
  candidateCount: number;
}

export interface GeographicDistributionFixture {
  geographicDistribution: GeographicDistributionRow[];
}

export interface PhaseDistributionRow {
  global_health_area: string;
  phase_name: string;
  sort_order: number;
  candidateCount: number;
}

export interface PhaseDistributionFixture {
  phaseDistribution: PhaseDistributionRow[];
}

export interface TemporalSnapshotRow {
  year: number;
  phase_name: string;
  sort_order: number;
  candidateCount: number;
}

export interface TemporalSnapshotsFixture {
  temporalSnapshots: TemporalSnapshotRow[];
}

export interface Product {
  product_key: number;
  product_name: string | null;
}

export interface FilterOptionsFixture {
  products: Product[];
  availableYears: number[];
  locationScopes: string[];
}

// Lazy-loaded fixtures (only loaded when accessed)
let _portfolioKPIs: PortfolioKPIsFixture | null = null;
let _globalHealthAreaSummaries: GlobalHealthAreaSummariesFixture | null = null;
let _geographicDistributionTrials: GeographicDistributionFixture | null = null;
let _geographicDistributionDev: GeographicDistributionFixture | null = null;
let _phaseDistribution: PhaseDistributionFixture | null = null;
let _phaseDistributionFiltered: PhaseDistributionFixture | null = null;
let _temporalSnapshots: TemporalSnapshotsFixture | null = null;
let _filterOptions: FilterOptionsFixture | null = null;

export function getPortfolioKPIs(): PortfolioKPIsFixture {
  if (!_portfolioKPIs) {
    _portfolioKPIs = loadFixture<PortfolioKPIsFixture>("portfolioKPIs");
  }
  return _portfolioKPIs;
}

export function getGlobalHealthAreaSummaries(): GlobalHealthAreaSummariesFixture {
  if (!_globalHealthAreaSummaries) {
    _globalHealthAreaSummaries = loadFixture<GlobalHealthAreaSummariesFixture>("globalHealthAreaSummaries");
  }
  return _globalHealthAreaSummaries;
}

export function getGeographicDistributionTrials(): GeographicDistributionFixture {
  if (!_geographicDistributionTrials) {
    _geographicDistributionTrials = loadFixture<GeographicDistributionFixture>("geographicDistribution-trials");
  }
  return _geographicDistributionTrials;
}

export function getGeographicDistributionDev(): GeographicDistributionFixture {
  if (!_geographicDistributionDev) {
    _geographicDistributionDev = loadFixture<GeographicDistributionFixture>("geographicDistribution-dev");
  }
  return _geographicDistributionDev;
}

export function getPhaseDistribution(): PhaseDistributionFixture {
  if (!_phaseDistribution) {
    _phaseDistribution = loadFixture<PhaseDistributionFixture>("phaseDistribution");
  }
  return _phaseDistribution;
}

export function getPhaseDistributionFiltered(): PhaseDistributionFixture {
  if (!_phaseDistributionFiltered) {
    _phaseDistributionFiltered = loadFixture<PhaseDistributionFixture>("phaseDistribution-filtered");
  }
  return _phaseDistributionFiltered;
}

export function getTemporalSnapshots(): TemporalSnapshotsFixture {
  if (!_temporalSnapshots) {
    _temporalSnapshots = loadFixture<TemporalSnapshotsFixture>("temporalSnapshots");
  }
  return _temporalSnapshots;
}

export function getFilterOptions(): FilterOptionsFixture {
  if (!_filterOptions) {
    _filterOptions = loadFixture<FilterOptionsFixture>("filterOptions");
  }
  return _filterOptions;
}

// Direct exports for convenience (will throw if fixture files don't exist)
export const fixtures = {
  get portfolioKPIs() {
    return getPortfolioKPIs();
  },
  get globalHealthAreaSummaries() {
    return getGlobalHealthAreaSummaries();
  },
  get geographicDistributionTrials() {
    return getGeographicDistributionTrials();
  },
  get geographicDistributionDev() {
    return getGeographicDistributionDev();
  },
  get phaseDistribution() {
    return getPhaseDistribution();
  },
  get phaseDistributionFiltered() {
    return getPhaseDistributionFiltered();
  },
  get temporalSnapshots() {
    return getTemporalSnapshots();
  },
  get filterOptions() {
    return getFilterOptions();
  },
};
