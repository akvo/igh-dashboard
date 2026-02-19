// Phase color mapping for charts (ordered by sort_order)
export const PHASE_COLORS = {
  'Discovery': '#8c4028',
  'Discovery and preclinical': '#964430',
  'Primary and secondary screening and optimisation': '#a04830',
  'Preclinical': '#b45038',
  'Development': '#c86040',
  'Early development': '#d46844',
  'Early development (concept and research)': '#dc7048',
  'Early development (feasibility and planning)': '#f08050',
  'Phase I': '#fe7449',
  'Phase II': '#f9a78d',
  'Phase III': '#ffd4c7',
  'Clinical evaluation': '#ffdace',
  'Late development': '#ffddd2',
  'Late development (design and development)': '#ffe0d5',
  'Late development (clinical validation and launch readiness)': '#ffece5',
  'Regulatory filing': '#e8d5ff',
  'PQ listing and regulatory approval': '#d0b0ff',
  'Approved': '#c0a0e8',
  'Phase IV': '#b090e0',
  'Post-marketing surveillance': '#a080d0',
  'Post-marketing human safety/efficacy studies (without prior clinical studies)': '#9575c5',
  'Human safety & efficacy': '#8a6aba',
  'Operational research for diagnostics': '#7f5faf',
  'Unclear': '#999999',
  'Not applicable': '#bbbbbb',
};

// Simplified phase names for display (ordered by sort_order)
export const SIMPLIFIED_PHASE_NAMES = {
  'Discovery': 'Discovery',
  'Discovery and preclinical': 'Discovery and preclinical',
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
