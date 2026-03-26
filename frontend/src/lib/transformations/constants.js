// Canonical R&D phase lifecycle ordering, mirroring the backend's
// PHASE_SORT_ORDER from igh-data-transform.  Used as the primary sort
// key in extractPhases so that chart stacking always follows the
// discovery-to-approval lifecycle regardless of backend sort_order values.
export const PHASE_CANONICAL_ORDER = {
  'Primary and secondary screening and optimisation': 5,
  'Discovery': 8,
  'Discovery & Preclinical': 10,
  'Discovery and preclinical': 10,
  'Preclinical': 12,
  'Early development': 20,
  'Early development (concept and research)': 22,
  'Early development (feasibility and planning)': 24,
  'Development': 25,
  'Phase I': 30,
  'Phase II': 40,
  'Phase III': 50,
  'Clinical evaluation': 55,
  'Human safety & efficacy': 60,
  'Post-marketing human safety/efficacy studies (without prior clinical studies)': 62,
  'Late development': 70,
  'Late development (design and development)': 72,
  'Late development (clinical validation and launch readiness)': 74,
  'Regulatory filing': 75,
  'PQ listing and regulatory approval': 80,
  'Approved': 90,
  'Unclear': 998,
  'Not applicable': 999,
};

// Phase color mapping for charts — only 6 key phases appear in charts
// Brandbook: Discovery #AD5133, Pre-clinical #FE7449, Phase 1 #F9A78D,
// Phase 2 #B28FC9, Phase 3 #CBAFDE, Approved #F0B456
export const PHASE_COLORS = {
  'Primary and secondary screening and optimisation': '#AD5133',
  'Discovery': '#AD5133',
  'Discovery and preclinical': '#AD5133',
  'Discovery & Preclinical': '#AD5133',
  'Discovery & preclinical': '#AD5133',
  'Preclinical': '#FE7449',
  'Development': '#FE7449',
  'Early development': '#FE7449',
  'Early development (concept and research)': '#FE7449',
  'Early development (feasibility and planning)': '#FE7449',
  'Phase I': '#F9A78D',
  'Phase II': '#B28FC9',
  'Phase III': '#CBAFDE',
  'Clinical evaluation': '#54A5C4',
  'Human safety & efficacy': '#54A5C4',
  'Post-marketing human safety/efficacy studies (without prior clinical studies)': '#54A5C4',
  'Late development': '#E3D6C1',
  'Late development (design and development)': '#E3D6C1',
  'Late development (clinical validation and launch readiness)': '#E3D6C1',
  'Regulatory filing': '#BFAB8A',
  'PQ listing and regulatory approval': '#D4A03C',
  'Approved': '#F0B456',
  'Unclear': '#999999',
  'Not applicable': '#bbbbbb',
};

// Simplified phase names for display (ordered by sort_order)
export const SIMPLIFIED_PHASE_NAMES = {
  'Primary and secondary screening and optimisation': 'Screening',
  'Discovery': 'Discovery',
  'Discovery and preclinical': 'Discovery & preclinical',
  'Discovery & Preclinical': 'Discovery & preclinical',
  'Discovery & preclinical': 'Discovery & preclinical',
  'Preclinical': 'Preclinical',
  'Development': 'Development',
  'Early development': 'Early stage',
  'Early development (concept and research)': 'Early Dev',
  'Early development (feasibility and planning)': 'Feasibility',
  'Phase I': 'Phase I',
  'Phase II': 'Phase II',
  'Phase III': 'Phase III',
  'Clinical evaluation': 'Safety/efficacy',
  'Human safety & efficacy': 'Safety/efficacy',
  'Post-marketing human safety/efficacy studies (without prior clinical studies)': 'Safety/efficacy',
  'Late development': 'Late stage',
  'Late development (design and development)': 'Late Dev',
  'Late development (clinical validation and launch readiness)': 'Validation',
  'Regulatory filing': 'Reg filing',
  'PQ listing and regulatory approval': 'PQ/Approval',
  'Approved': 'Approved',
  'Unclear': 'Unclear',
  'Not applicable': 'N/A',
};

// Health area display name mapping
export const HEALTH_AREA_DISPLAY_NAMES = {
  'Neglected disease': 'Neglected diseases',
  'Womens Health': "Women's health",
  'Emerging infectious disease': 'Emerging infectious diseases',
};

/**
 * Return the display-friendly health area name, or the original if no mapping exists.
 * @param {string} name - Raw health area name from the database
 * @returns {string} Display name
 */
export function displayHealthArea(name) {
  return HEALTH_AREA_DISPLAY_NAMES[name] || name;
}

// Cache TTL in milliseconds (24 hours)
export const CACHE_TTL = 24 * 60 * 60 * 1000;
