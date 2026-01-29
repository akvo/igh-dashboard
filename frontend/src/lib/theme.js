/**
 * IGH Dashboard - Theme Constants
 * Based on design system color palette
 * Use these constants in JavaScript/React components (charts, dynamic styling)
 */

// Typography - Public Sans
export const typography = {
  fontFamily: {
    sans: '"Public Sans", system-ui, sans-serif',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  fontSize: {
    display1: '72px',
    display2: '60px',
    display3: '48px',
    heading1: '40px',
    heading2: '36px',
    heading3: '32px',
    heading4: '28px',
    heading5: '24px',
    heading6: '20px',
    title1: '18px',
    title2: '16px',
    body1: '16px',
    body2: '14px',
    para: '16px',
    caption1: '12px',
    caption2: '11px',
    overline: '12px',
  },
  lineHeight: {
    display: 1.1,
    heading: 1.2,
    title: 1.4,
    body: 1.5,
    para: 1.6,
    caption: 1.4,
  },
};

export const colors = {
  // Primary - Orange
  orange: {
    50: '#fff1ed',
    100: '#ffd4c7',
    200: '#ffbfab',
    300: '#fea285',
    400: '#fe906d',
    500: '#fe7449',
    600: '#e76a42',
    700: '#b45234',
    800: '#8c4028',
    900: '#6b311f',
  },

  // Secondary - Warm White / Cream
  cream: {
    50: '#fffefd',
    100: '#fefcf9',
    200: '#fdfbf6',
    300: '#fcf9f2',
    400: '#fcf8ef',
    500: '#fbf6eb',
    600: '#e4e0d6',
    700: '#b2afa7',
    800: '#8a8781',
    900: '#696763',
  },

  // Functional - Green (Success)
  green: {
    50: '#f4fbf6',
    100: '#dcf2e4',
    200: '#cbecd7',
    300: '#b3e4c5',
    400: '#a4deba',
    500: '#8dd6a9',
    600: '#80c39a',
    700: '#649878',
    800: '#4e765d',
    900: '#3b5a47',
  },

  // Functional - Blue (Info)
  blue: {
    50: '#f4fafc',
    100: '#deeef4',
    200: '#cee6ef',
    300: '#b7dbe8',
    400: '#a9d4e4',
    500: '#94c9dd',
    600: '#87b7c9',
    700: '#698f9d',
    800: '#516f7a',
    900: '#3e545d',
  },

  // Functional - Yellow (Warning)
  yellow: {
    50: '#fef8ee',
    100: '#fae8cb',
    200: '#f8ddb1',
    300: '#f5cd8e',
    400: '#f3c378',
    500: '#f0b456',
    600: '#daa44e',
    700: '#aa803d',
    800: '#84632f',
    900: '#654c24',
  },

  // Neutrals
  black: '#262626',
  white: '#ffffff',

  // Gray scale (UI elements)
  gray: {
    50: '#F9F9FA',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#8C929C',
    600: '#5B616D',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
};

// R&D Phase Colors (for pipeline/stacked bar charts)
export const phaseColors = {
  preclinical: '#8c4028',
  phase1: '#fe7449',
  phase2: '#fdba74',
  phase3: '#ddd6fe',
  phase4: '#f0b456',
  approved: '#a78bfa',
};

// Ordered array for Recharts
export const phaseColorArray = [
  '#8c4028', // Pre-clinical
  '#fe7449', // Phase 1
  '#fdba74', // Phase 2
  '#ddd6fe', // Phase 3
  '#f0b456', // Phase 4
  '#a78bfa', // Approved
];

// Phase labels
export const phaseLabels = [
  'Pre-clinical',
  'Phase 1',
  'Phase 2',
  'Phase 3',
  'Phase 4',
  'Approved',
];

// Data Visualization - Primary Chart Palette
export const chartColors = {
  primary: [
    '#fe7449', // Orange
    '#f0b456', // Yellow
    '#cbafde', // Purple
    '#b08888', // Brown
    '#e3d6c1', // Beige
    '#f9a78d', // Peach
    '#ffdcd1', // Pink
    '#cc9949', // Gold
    '#6ab085', // Teal
    '#54a5c4', // Blue
    '#b28fc9', // Violet
  ],
  secondary: [
    '#875252', // Dark Brown
    '#bfab8a', // Tan
    '#ad5133', // Rust
    '#c8dcd0', // Mint
    '#a6c4cf', // Sky
    '#e5c78a', // Cream
    '#d9cae3', // Lavender
    '#d6c6c6', // Rose
    '#f2e8d8', // Sand
  ],
};

// Global Health Area Colors
export const ghaColors = {
  neglectedDiseases: '#fe7449',
  womensHealth: '#fdba74',
  emergingInfectiousDiseases: '#8c4028',
};

// Bubble chart specific colors
export const bubbleColors = {
  neglectedDiseases: '#fe7449',
  womensHealth: '#fdba74',
  emergingInfectiousDiseases: '#8c4028',
};

// Map color scale (for choropleth)
export const mapColorScale = {
  noData: '#f5f5f5',
  low: '#ffd4c7',
  medium: '#fe906d',
  high: '#fe7449',
  max: '#8c4028',
};

// Donut chart default colors
export const donutColors = [
  '#fe7449',
  '#f0b456',
  '#cbafde',
  '#6ab085',
  '#54a5c4',
  '#b08888',
];

// Semantic colors
export const semantic = {
  primary: '#fe7449',
  primaryHover: '#e76a42',
  primaryActive: '#b45234',
  success: '#8dd6a9',
  successDark: '#649878',
  warning: '#f0b456',
  warningDark: '#aa803d',
  info: '#94c9dd',
  infoDark: '#698f9d',
  error: '#e76a42',
  errorDark: '#8c4028',
};

// Component tokens
export const componentTokens = {
  card: {
    bg: '#ffffff',
    border: 'rgba(38, 38, 38, 0.12)',
  },
  sidebar: {
    bg: '#F9F9FA',
    active: '#ffffff',
    hover: '#ffffff',
    section: '#8C929C',
    text: '#5B616D',
    textActive: '#262626',
    icon: '#AFB3BB',
    iconActive: '#fe7449',
  },
  table: {
    header: '#fcf9f2',
    rowHover: '#fef8ee',
    border: 'rgba(38, 38, 38, 0.12)',
  },
  input: {
    bg: '#ffffff',
    border: 'rgba(38, 38, 38, 0.24)',
    focus: '#fe7449',
  },
  chip: {
    activeBg: '#fe7449',
    activeText: '#ffffff',
    inactiveBg: '#fcf9f2',
    inactiveText: '#262626',
  },
};

// Default export for convenience
export default {
  typography,
  colors,
  phaseColors,
  phaseColorArray,
  phaseLabels,
  chartColors,
  ghaColors,
  bubbleColors,
  mapColorScale,
  donutColors,
  semantic,
  componentTokens,
};
