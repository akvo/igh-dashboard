// Canonical R&D phase lifecycle ordering, mirroring the backend's
// PHASE_SORT_ORDER from igh-data-transform.  Used as the primary sort
// key in extractPhases so that chart stacking always follows the
// discovery-to-approval lifecycle regardless of backend sort_order values.
export const PHASE_CANONICAL_ORDER = {
  'Discovery': 5,
  'Discovery & Preclinical': 10,
  'Discovery and preclinical': 10,
  'Primary and secondary screening and optimisation': 15,
  'Preclinical': 18,
  'Early development': 20,
  'Early development (concept and research)': 22,
  'Early development (feasibility and planning)': 24,
  'Development': 25,
  'Phase I': 30,
  'Phase II': 40,
  'Phase III': 50,
  'Clinical evaluation': 55,
  'Late development': 60,
  'Late development (design and development)': 62,
  'Late development (clinical validation and launch readiness)': 64,
  'Regulatory filing': 70,
  'PQ listing and regulatory approval': 75,
  'Approved': 80,
  'Phase IV': 85,
  'Post-marketing surveillance': 90,
  'Post-marketing human safety/efficacy studies (without prior clinical studies)': 92,
  'Human safety & efficacy': 95,
  'Operational research for diagnostics': 96,
  'Unclear': 998,
  'Not applicable': 999,
};

// Phase color mapping for charts — only 6 key phases appear in charts
// Brandbook: Discovery #AD5133, Pre-clinical #FE7449, Phase 1 #F9A78D,
// Phase 2 #B28FC9, Phase 3 #CBAFDE, Approved #F0B456
export const PHASE_COLORS = {
  'Discovery': '#AD5133',
  'Discovery and preclinical': '#AD5133',
  'Discovery & Preclinical': '#AD5133',
  'Discovery & preclinical': '#AD5133',
  'Primary and secondary screening and optimisation': '#AD5133',
  'Preclinical': '#FE7449',
  'Development': '#FE7449',
  'Early development': '#FE7449',
  'Early development (concept and research)': '#FE7449',
  'Early development (feasibility and planning)': '#FE7449',
  'Phase I': '#F9A78D',
  'Phase II': '#B28FC9',
  'Phase III': '#CBAFDE',
  'Clinical evaluation': '#E3D6C1',
  'Late development': '#E3D6C1',
  'Late development (design and development)': '#E3D6C1',
  'Late development (clinical validation and launch readiness)': '#E3D6C1',
  'Regulatory filing': '#BFAB8A',
  'PQ listing and regulatory approval': '#F0B456',
  'Approved': '#F0B456',
  'Phase IV': '#94C9DD',
  'Post-marketing surveillance': '#54A5C4',
  'Post-marketing human safety/efficacy studies (without prior clinical studies)': '#94C9DD',
  'Human safety & efficacy': '#54A5C4',
  'Operational research for diagnostics': '#94C9DD',
  'Unclear': '#999999',
  'Not applicable': '#bbbbbb',
};

// Simplified phase names for display (ordered by sort_order)
export const SIMPLIFIED_PHASE_NAMES = {
  'Discovery': 'Discovery',
  'Discovery and preclinical': 'Discovery & Preclinical',
  'Discovery & Preclinical': 'Discovery & Preclinical',
  'Discovery & preclinical': 'Discovery & Preclinical',
  'Primary and secondary screening and optimisation': 'Screening',
  'Preclinical': 'Preclinical',
  'Development': 'Development',
  'Early development': 'Early Stage',
  'Early development (concept and research)': 'Early Dev',
  'Early development (feasibility and planning)': 'Feasibility',
  'Phase I': 'Phase I',
  'Phase II': 'Phase II',
  'Phase III': 'Phase III',
  'Clinical evaluation': 'Clinical Eval',
  'Late development': 'Late Stage',
  'Late development (design and development)': 'Late Dev',
  'Late development (clinical validation and launch readiness)': 'Validation',
  'Regulatory filing': 'Reg Filing',
  'PQ listing and regulatory approval': 'PQ/Approval',
  'Approved': 'Approved',
  'Phase IV': 'Phase IV',
  'Post-marketing surveillance': 'Post-Market Surveillance',
  'Post-marketing human safety/efficacy studies (without prior clinical studies)': 'Post-Market Safety',
  'Human safety & efficacy': 'Safety/Efficacy',
  'Operational research for diagnostics': 'Ops Research',
  'Unclear': 'Unclear',
  'Not applicable': 'N/A',
};

// Health area display name mapping
export const HEALTH_AREA_DISPLAY_NAMES = {
  'Neglected disease': 'Neglected diseases',
  'Womens Health': "Women's health",
  'Emerging infectious disease': 'Emerging infectious diseases',
};

// Cache TTL in milliseconds (24 hours)
export const CACHE_TTL = 24 * 60 * 60 * 1000;
