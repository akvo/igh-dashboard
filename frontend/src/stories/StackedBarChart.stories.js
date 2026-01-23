import StackedBarChart from '../components/charts/StackedBarChart';

const sampleData = [
  {
    category: 'Diagnostics',
    preClinical: 45,
    phase1: 65,
    phase2: 35,
    phase3: 55,
    phase4: 40,
    approved: 30,
  },
  {
    category: 'Vaccines',
    preClinical: 50,
    phase1: 70,
    phase2: 45,
    phase3: 60,
    phase4: 50,
    approved: 45,
  },
  {
    category: 'Drugs',
    preClinical: 25,
    phase1: 30,
    phase2: 20,
    phase3: 25,
    phase4: 15,
    approved: 10,
  },
  {
    category: 'Microbicides',
    preClinical: 55,
    phase1: 75,
    phase2: 50,
    phase3: 65,
    phase4: 45,
    approved: 40,
  },
  {
    category: 'Biologics',
    preClinical: 48,
    phase1: 68,
    phase2: 42,
    phase3: 58,
    phase4: 52,
    approved: 38,
  },
  {
    category: 'VCP',
    preClinical: 20,
    phase1: 25,
    phase2: 18,
    phase3: 22,
    phase4: 12,
    approved: 15,
  },
];

export default {
  title: 'Charts/StackedBarChart',
  component: StackedBarChart,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    layout: {
      control: 'select',
      options: ['vertical', 'horizontal'],
      description: '"vertical" = horizontal bars, "horizontal" = vertical bars',
    },
    showFilters: {
      control: 'boolean',
      description: 'Show/hide the phase filter checkboxes',
    },
    height: {
      control: { type: 'number', min: 200, max: 800, step: 50 },
      description: 'Chart height in pixels',
    },
    barRadius: {
      control: { type: 'range', min: 0, max: 20, step: 1 },
      description: 'Border radius of bars',
    },
    xAxisLabel: {
      control: 'text',
      description: 'Label for the X axis',
    },
    yAxisLabel: {
      control: 'text',
      description: 'Label for the Y axis',
    },
  },
};

export const HorizontalBars = {
  args: {
    data: sampleData,
    layout: 'vertical',
    showFilters: true,
    height: 400,
    xAxisLabel: 'Amount of Candidates/Products',
    yAxisLabel: 'Product type',
    barRadius: 4,
  },
};

export const VerticalBars = {
  args: {
    data: sampleData,
    layout: 'horizontal',
    showFilters: true,
    height: 450,
    xAxisLabel: '',
    yAxisLabel: 'Amount',
    barRadius: 4,
  },
};

export const WithoutFilters = {
  args: {
    data: sampleData,
    layout: 'vertical',
    showFilters: false,
    height: 400,
    xAxisLabel: 'Amount of Candidates/Products',
    yAxisLabel: 'Product type',
    barRadius: 4,
  },
};

export const RoundedBars = {
  args: {
    data: sampleData,
    layout: 'vertical',
    showFilters: true,
    height: 400,
    xAxisLabel: 'Amount',
    barRadius: 10,
  },
};

export const SquareBars = {
  args: {
    data: sampleData,
    layout: 'horizontal',
    showFilters: true,
    height: 450,
    barRadius: 0,
  },
};

const customPhases = [
  { key: 'preClinical', label: 'Pre-clinical', color: '#8c4028' },
  { key: 'phase1', label: 'Phase I', color: '#fe7449' },
  { key: 'phase2', label: 'Phase II', color: '#fdba74' },
  { key: 'phase3', label: 'Phase III', color: '#ddd6fe' },
];

export const CustomPhases = {
  args: {
    data: sampleData,
    phases: customPhases,
    layout: 'vertical',
    showFilters: true,
    height: 400,
    xAxisLabel: 'Amount of Candidates/Products',
    yAxisLabel: 'Product type',
    barRadius: 4,
  },
};

export const TallChart = {
  args: {
    data: sampleData,
    layout: 'vertical',
    showFilters: true,
    height: 600,
    xAxisLabel: 'Amount',
    barRadius: 4,
  },
};
