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
      title: 'Diseases covered',
      value: data.totalDiseases,
      buttonText: 'See full list of diseases',
    },
    {
      id: 'candidates',
      title: 'Candidates in development',
      value: data.totalCandidates,
      buttonText: 'Explore candidates',
    },
    {
      id: 'approved',
      title: 'Approved health products',
      value: data.approvedProducts,
      buttonText: 'Explore approved products',
    },
  ];
}
