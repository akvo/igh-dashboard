import BarChart from '../components/charts/BarChart';

const horizontalData = [
  { name: 'Active', value: 150 },
  { name: 'Not yet recruiting', value: 230 },
  { name: 'Completed', value: 220 },
  { name: 'Recruiting', value: 145 },
];

const horizontalColors = [
  '#fe7449', // Orange - Active
  '#8c4028', // Dark brown - Not yet recruiting
  '#f9a78d', // Peach - Completed
  '#f0b456', // Gold - Recruiting
];

const verticalData = [
  { name: 'Active', value: 2 },
  { name: 'Terminated', value: 5.2 },
  { name: 'Completed', value: 4.2 },
  { name: 'Suspended', value: 2.6 },
  { name: 'Withdrawn', value: 1.1 },
  { name: 'Unknown', value: 3.5 },
];

const verticalColors = [
  '#f9a78d', // Peach - Active
  '#f0b456', // Gold - Terminated
  '#8c4028', // Dark brown - Completed
  '#fe7449', // Orange - Suspended
  '#cbafde', // Light purple - Withdrawn
  '#a78bfa', // Purple - Unknown
];

export default {
  title: 'Charts/BarChart',
  component: BarChart,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    layout: {
      control: 'select',
      options: ['horizontal', 'vertical'],
      description: '"horizontal" = vertical bars, "vertical" = horizontal bars',
    },
    showFilters: {
      control: 'boolean',
      description: 'Show/hide the filter checkboxes',
    },
    height: {
      control: { type: 'number', min: 200, max: 600, step: 50 },
      description: 'Chart height in pixels',
    },
    barRadius: {
      control: { type: 'range', min: 0, max: 20, step: 1 },
      description: 'Border radius of bars',
    },
    barSize: {
      control: { type: 'number', min: 10, max: 100, step: 5 },
      description: 'Width of bars (optional)',
    },
    xAxisLabel: {
      control: 'text',
      description: 'Label for X axis',
    },
    yAxisLabel: {
      control: 'text',
      description: 'Label for Y axis',
    },
  },
};

export const HorizontalBars = {
  args: {
    data: horizontalData,
    colors: horizontalColors,
    layout: 'vertical',
    showFilters: true,
    height: 300,
    xAxisLabel: 'Amount',
    yAxisLabel: 'Product type',
    barRadius: 4,
  },
};

export const VerticalBars = {
  args: {
    data: verticalData,
    colors: verticalColors,
    layout: 'horizontal',
    showFilters: true,
    height: 400,
    xAxisLabel: '',
    yAxisLabel: '',
    barRadius: 4,
  },
};

export const WithoutFilters = {
  args: {
    data: horizontalData,
    colors: horizontalColors,
    layout: 'vertical',
    showFilters: false,
    height: 300,
    xAxisLabel: 'Amount',
    yAxisLabel: 'Product type',
    barRadius: 4,
  },
};

export const RoundedBars = {
  args: {
    data: verticalData,
    colors: verticalColors,
    layout: 'horizontal',
    showFilters: true,
    height: 400,
    barRadius: 10,
  },
};

export const SquareBars = {
  args: {
    data: horizontalData,
    colors: horizontalColors,
    layout: 'vertical',
    showFilters: true,
    height: 300,
    barRadius: 0,
    xAxisLabel: 'Amount',
  },
};

export const CustomBarWidth = {
  args: {
    data: verticalData,
    colors: verticalColors,
    layout: 'horizontal',
    showFilters: true,
    height: 400,
    barRadius: 4,
    barSize: 40,
  },
};

const simpleData = [
  { name: 'Yes', value: 75 },
  { name: 'No', value: 25 },
];

export const SimpleTwoBars = {
  args: {
    data: simpleData,
    colors: ['#8dd6a9', '#fe7449'],
    layout: 'horizontal',
    showFilters: false,
    height: 300,
    barRadius: 4,
  },
};
