import WorldMap from '../components/charts/WorldMap';

// Sample data using ISO 3166-1 numeric country codes
// Reference: https://en.wikipedia.org/wiki/ISO_3166-1_numeric
const clinicalTrialsData = {
  '840': 450, // USA
  '124': 120, // Canada
  '076': 180, // Brazil
  '643': 95,  // Russia
  '156': 220, // China
  '356': 85,  // India
  '036': 65,  // Australia
  '826': 110, // UK
  '276': 90,  // Germany
  '250': 75,  // France
  '710': 45,  // South Africa
  '566': 30,  // Nigeria
  '404': 25,  // Kenya
  '392': 70,  // Japan
  '410': 55,  // South Korea
  '484': 40,  // Mexico
  '032': 35,  // Argentina
  '170': 28,  // Colombia
  '764': 32,  // Thailand
  '360': 38,  // Indonesia
};

const defaultColorScale = [
  '#fff1ed',
  '#ffd4c7',
  '#f9a78d',
  '#fe7449',
  '#b45234',
  '#8c4028',
];

export default {
  title: 'Charts/WorldMap',
  component: WorldMap,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    height: {
      control: { type: 'number', min: 300, max: 600, step: 50 },
      description: 'Map height in pixels',
    },
    showLegend: {
      control: 'boolean',
      description: 'Show/hide the color legend',
    },
    legendTitle: {
      control: 'text',
      description: 'Title shown in tooltip',
    },
    strokeWidth: {
      control: { type: 'range', min: 0, max: 2, step: 0.1 },
      description: 'Border width between countries',
    },
  },
};

export const Default = {
  args: {
    data: clinicalTrialsData,
    colorScale: defaultColorScale,
    height: 450,
    showLegend: true,
    legendTitle: 'Clinical Trials',
    strokeColor: '#ffffff',
    strokeWidth: 0.5,
  },
};

export const NoLegend = {
  args: {
    data: clinicalTrialsData,
    colorScale: defaultColorScale,
    height: 450,
    showLegend: false,
    legendTitle: 'Clinical Trials',
  },
};

export const TallMap = {
  args: {
    data: clinicalTrialsData,
    colorScale: defaultColorScale,
    height: 550,
    showLegend: true,
    legendTitle: 'Clinical Trials',
  },
};

const blueColorScale = [
  '#f4fafc',
  '#cee6ef',
  '#a9d4e4',
  '#94c9dd',
  '#698f9d',
  '#3e545d',
];

export const BlueColorScale = {
  args: {
    data: clinicalTrialsData,
    colorScale: blueColorScale,
    height: 450,
    showLegend: true,
    legendTitle: 'Research Sites',
  },
};

const greenColorScale = [
  '#f4fbf6',
  '#cbecd7',
  '#a4deba',
  '#8dd6a9',
  '#649878',
  '#3b5a47',
];

export const GreenColorScale = {
  args: {
    data: clinicalTrialsData,
    colorScale: greenColorScale,
    height: 450,
    showLegend: true,
    legendTitle: 'Approvals',
  },
};

export const ThickBorders = {
  args: {
    data: clinicalTrialsData,
    colorScale: defaultColorScale,
    height: 450,
    showLegend: true,
    legendTitle: 'Clinical Trials',
    strokeWidth: 1.5,
  },
};

// Sparse data example
const sparseData = {
  '840': 300, // USA
  '156': 250, // China
  '076': 150, // Brazil
};

export const SparseData = {
  args: {
    data: sparseData,
    colorScale: defaultColorScale,
    height: 450,
    showLegend: true,
    legendTitle: 'Products',
  },
};
