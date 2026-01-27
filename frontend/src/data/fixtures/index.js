// Fixtures from poc-graphql-to-olap-db branch
// These are used for development when the backend is not available

export const portfolioKPIsFixture = {
  portfolioKPIs: {
    totalDiseases: 215,
    totalCandidates: 8581,
    approvedProducts: 0,
  },
};

export const globalHealthAreaSummariesFixture = {
  globalHealthAreaSummaries: [
    {
      global_health_area: 'Neglected disease',
      candidateCount: 3611,
      diseaseCount: 112,
      productCount: 7,
    },
    {
      global_health_area: 'Sexual & reproductive health',
      candidateCount: 2719,
      diseaseCount: 49,
      productCount: 7,
    },
    {
      global_health_area: 'Emerging infectious disease',
      candidateCount: 2233,
      diseaseCount: 53,
      productCount: 5,
    },
  ],
};

export const phaseDistributionFixture = {
  phaseDistribution: [
    { global_health_area: 'Emerging infectious disease', phase_name: 'Discovery', sort_order: 10, candidateCount: 15 },
    { global_health_area: 'Emerging infectious disease', phase_name: 'Preclinical', sort_order: 25, candidateCount: 205 },
    { global_health_area: 'Emerging infectious disease', phase_name: 'Phase I', sort_order: 40, candidateCount: 111 },
    { global_health_area: 'Emerging infectious disease', phase_name: 'Phase II', sort_order: 50, candidateCount: 88 },
    { global_health_area: 'Emerging infectious disease', phase_name: 'Phase III', sort_order: 60, candidateCount: 85 },
    { global_health_area: 'Emerging infectious disease', phase_name: 'Phase IV', sort_order: 90, candidateCount: 3 },
    { global_health_area: 'Neglected disease', phase_name: 'Discovery', sort_order: 10, candidateCount: 46 },
    { global_health_area: 'Neglected disease', phase_name: 'Preclinical', sort_order: 25, candidateCount: 183 },
    { global_health_area: 'Neglected disease', phase_name: 'Phase I', sort_order: 40, candidateCount: 154 },
    { global_health_area: 'Neglected disease', phase_name: 'Phase II', sort_order: 50, candidateCount: 135 },
    { global_health_area: 'Neglected disease', phase_name: 'Phase III', sort_order: 60, candidateCount: 47 },
    { global_health_area: 'Neglected disease', phase_name: 'Phase IV', sort_order: 90, candidateCount: 2 },
    { global_health_area: 'Sexual & reproductive health', phase_name: 'Discovery', sort_order: 10, candidateCount: 38 },
    { global_health_area: 'Sexual & reproductive health', phase_name: 'Preclinical', sort_order: 25, candidateCount: 165 },
    { global_health_area: 'Sexual & reproductive health', phase_name: 'Phase I', sort_order: 40, candidateCount: 120 },
    { global_health_area: 'Sexual & reproductive health', phase_name: 'Phase II', sort_order: 50, candidateCount: 95 },
    { global_health_area: 'Sexual & reproductive health', phase_name: 'Phase III', sort_order: 60, candidateCount: 55 },
    { global_health_area: 'Sexual & reproductive health', phase_name: 'Phase IV', sort_order: 90, candidateCount: 4 },
  ],
};

export const geographicDistributionTrialsFixture = {
  geographicDistribution: [
    { country_key: 50, country_name: 'South Africa', iso_code: '710', candidateCount: 11 },
    { country_key: 54, country_name: 'Tanzania', iso_code: '834', candidateCount: 11 },
    { country_key: 29, country_name: 'Kenya', iso_code: '404', candidateCount: 9 },
    { country_key: 24, country_name: 'India', iso_code: '356', candidateCount: 7 },
    { country_key: 8, country_name: 'Burkina Faso', iso_code: '854', candidateCount: 6 },
    { country_key: 60, country_name: 'United States of America', iso_code: '840', candidateCount: 6 },
    { country_key: 40, country_name: 'Peru', iso_code: '604', candidateCount: 5 },
    { country_key: 150, country_name: 'Mali', iso_code: '466', candidateCount: 5 },
    { country_key: 6, country_name: 'Brazil', iso_code: '076', candidateCount: 4 },
    { country_key: 55, country_name: 'Thailand', iso_code: '764', candidateCount: 4 },
    { country_key: 59, country_name: 'United Kingdom', iso_code: '826', candidateCount: 2 },
    { country_key: 20, country_name: 'Germany', iso_code: '276', candidateCount: 2 },
    { country_key: 19, country_name: 'France', iso_code: '250', candidateCount: 1 },
    { country_key: 9, country_name: 'Canada', iso_code: '124', candidateCount: 2 },
    { country_key: 35, country_name: 'Mexico', iso_code: '484', candidateCount: 1 },
    { country_key: 58, country_name: 'Uganda', iso_code: '800', candidateCount: 3 },
    { country_key: 165, country_name: 'Nigeria', iso_code: '566', candidateCount: 2 },
    { country_key: 117, country_name: 'Ghana', iso_code: '288', candidateCount: 1 },
    { country_key: 129, country_name: 'Indonesia', iso_code: '360', candidateCount: 3 },
    { country_key: 41, country_name: 'Philippines', iso_code: '608', candidateCount: 3 },
    { country_key: 75, country_name: 'Bangladesh', iso_code: '050', candidateCount: 2 },
    { country_key: 170, country_name: 'Pakistan', iso_code: '586', candidateCount: 4 },
    { country_key: 211, country_name: 'Vietnam', iso_code: '704', candidateCount: 2 },
    { country_key: 2, country_name: 'Argentina', iso_code: '032', candidateCount: 2 },
    { country_key: 47, country_name: 'Singapore', iso_code: '702', candidateCount: 1 },
    { country_key: 53, country_name: 'Switzerland', iso_code: '756', candidateCount: 1 },
    { country_key: 5, country_name: 'Belgium', iso_code: '056', candidateCount: 1 },
    { country_key: 15, country_name: 'Democratic Republic of Congo', iso_code: '180', candidateCount: 1 },
    { country_key: 61, country_name: 'Zambia', iso_code: '894', candidateCount: 1 },
    { country_key: 147, country_name: 'Malawi', iso_code: '454', candidateCount: 2 },
    { country_key: 158, country_name: 'Mozambique', iso_code: '508', candidateCount: 4 },
    { country_key: 231, country_name: 'Ethiopia', iso_code: '231', candidateCount: 2 },
  ],
};

export const temporalSnapshotsFixture = {
  temporalSnapshots: [
    { year: 2023, phase_name: 'Discovery', sort_order: 10, candidateCount: 61 },
    { year: 2023, phase_name: 'Preclinical', sort_order: 25, candidateCount: 388 },
    { year: 2023, phase_name: 'Phase I', sort_order: 40, candidateCount: 265 },
    { year: 2023, phase_name: 'Phase II', sort_order: 50, candidateCount: 223 },
    { year: 2023, phase_name: 'Phase III', sort_order: 60, candidateCount: 132 },
    { year: 2023, phase_name: 'Phase IV', sort_order: 90, candidateCount: 5 },
    { year: 2024, phase_name: 'Discovery', sort_order: 10, candidateCount: 15 },
    { year: 2024, phase_name: 'Preclinical', sort_order: 25, candidateCount: 204 },
    { year: 2024, phase_name: 'Phase I', sort_order: 40, candidateCount: 111 },
    { year: 2024, phase_name: 'Phase II', sort_order: 50, candidateCount: 88 },
    { year: 2024, phase_name: 'Phase III', sort_order: 60, candidateCount: 85 },
    { year: 2024, phase_name: 'Phase IV', sort_order: 90, candidateCount: 3 },
  ],
};

export const filterOptionsFixture = {
  products: [
    { product_key: 31, product_name: 'Vaccines' },
    { product_key: 30, product_name: 'Drugs' },
    { product_key: 34, product_name: 'Diagnostics' },
    { product_key: 17, product_name: 'Biologics' },
    { product_key: 35, product_name: 'Devices' },
    { product_key: 36, product_name: 'VCP' },
  ],
  availableYears: [2015, 2019, 2021, 2023, 2024, 2025],
  locationScopes: ['Developer Location', 'Target Country', 'Trial Location'],
};
