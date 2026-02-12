/**
 * Portfolio KPIs transformation functions
 * Transforms raw API response into KPI card display format
 */

/**
 * Transform raw portfolio KPIs data into card-ready format
 * @param {Object} data - Raw API response { totalDiseases, totalCandidates, approvedProducts }
 * @returns {Array} Array of KPI card objects
 */
export function transformPortfolioKPIs(data) {
  if (!data) return [];

  return [
    {
      id: 'diseases',
      title: 'Number of diseases',
      value: data.totalDiseases,
      description: 'Total number of diseases',
      buttonText: 'Explore pipeline for diseases',
    },
    {
      id: 'candidates',
      title: 'Total number of candidates',
      value: data.totalCandidates,
      description: 'Total number of candidates.',
      buttonText: 'Explore candidates',
    },
    {
      id: 'approved',
      title: 'Approved products',
      value: data.approvedProducts,
      description: 'Total number of approved products.',
      buttonText: 'Explore approved products',
    },
  ];
}
