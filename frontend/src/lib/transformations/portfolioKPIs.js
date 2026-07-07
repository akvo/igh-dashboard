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
      tooltip: 'The number of diseases that is currently covered in the IGH R&D portfolio, spanning all global health areas tracked in this platform.',
    },
    {
      id: 'candidates',
      title: 'Candidates in development',
      value: data.totalCandidates,
      buttonText: 'Explore candidates',
      buttonHref: '/pipeline-overview',
      tooltip: 'The total number of investigational candidates in the IGH pipeline, across all development stages from discovery through late-stage clinical trials.',
    },
    {
      id: 'approved',
      title: 'Approved health products',
      value: data.approvedProducts,
      buttonText: 'Explore approved products',
      buttonHref: '/pipeline-overview',
      tooltip: 'The total number of products in the IGH portfolio that have received regulatory approval, emergency authorisation, or are used off-label including those already available for use in countries.',
    },
  ];
}
