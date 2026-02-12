// Phase color mapping for charts
export const PHASE_COLORS = {
  'Discovery': '#8c4028',
  'Primary and secondary screening and optimisation': '#a04830',
  'Preclinical': '#b45038',
  'Development': '#c86040',
  'Early development (concept and research)': '#dc7048',
  'Early development (feasibility and planning)': '#f08050',
  'Phase I': '#fe7449',
  'Phase II': '#f9a78d',
  'Phase III': '#ffd4c7',
  'Late development (design and development)': '#ffe0d5',
  'Late development (clinical validation and launch readiness)': '#ffece5',
  'Regulatory filing': '#e8d5ff',
  'PQ listing and regulatory approval': '#d0b0ff',
  'Phase IV': '#b090e0',
};

// Simplified phase names for display
export const SIMPLIFIED_PHASE_NAMES = {
  'Discovery': 'Discovery',
  'Primary and secondary screening and optimisation': 'Screening',
  'Preclinical': 'Preclinical',
  'Development': 'Development',
  'Early development (concept and research)': 'Early Dev',
  'Early development (feasibility and planning)': 'Feasibility',
  'Phase I': 'Phase I',
  'Phase II': 'Phase II',
  'Phase III': 'Phase III',
  'Late development (design and development)': 'Late Dev',
  'Late development (clinical validation and launch readiness)': 'Validation',
  'Regulatory filing': 'Reg Filing',
  'PQ listing and regulatory approval': 'PQ/Approval',
  'Phase IV': 'Phase IV',
};

// Health area display name mapping
export const HEALTH_AREA_DISPLAY_NAMES = {
  'Neglected disease': 'Neglected diseases',
  'Sexual & reproductive health': "Women's health",
  'Emerging infectious disease': 'Emerging infectious diseases',
};

// Cache TTL in milliseconds (24 hours)
export const CACHE_TTL = 24 * 60 * 60 * 1000;
