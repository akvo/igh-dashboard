import BubbleChart from '../components/charts/BubbleChart';

const globalHealthData = [
  { name: 'Neglected diseases', value: 2101 },
  { name: "Women's health", value: 1591 },
  { name: 'Emerging infectious diseases', value: 953 },
];

const globalHealthColors = [
  '#fe7449', // Orange
  '#f9a78d', // Peach
  '#8c4028', // Dark brown
];

export default {
  title: 'Charts/BubbleChart',
  component: BubbleChart,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    height: {
      control: { type: 'number', min: 200, max: 600, step: 50 },
      description: 'Chart height in pixels',
    },
    minRadius: {
      control: { type: 'range', min: 30, max: 80, step: 5 },
      description: 'Minimum bubble radius',
    },
    maxRadius: {
      control: { type: 'range', min: 80, max: 200, step: 10 },
      description: 'Maximum bubble radius',
    },
    gap: {
      control: { type: 'range', min: 0, max: 50, step: 5 },
      description: 'Gap between bubbles',
    },
    showLegend: {
      control: 'boolean',
      description: 'Show/hide the legend',
    },
    showValues: {
      control: 'boolean',
      description: 'Show/hide values inside bubbles',
    },
  },
};

export const Default = {
  args: {
    data: globalHealthData,
    colors: globalHealthColors,
    height: 400,
    minRadius: 70,
    maxRadius: 140,
    gap: 15,
    showLegend: true,
    showValues: true,
  },
};

export const SmallBubbles = {
  args: {
    data: globalHealthData,
    colors: globalHealthColors,
    height: 350,
    minRadius: 50,
    maxRadius: 100,
    gap: 15,
    showLegend: true,
    showValues: true,
  },
};

export const LargeGap = {
  args: {
    data: globalHealthData,
    colors: globalHealthColors,
    height: 450,
    minRadius: 70,
    maxRadius: 140,
    gap: 30,
    showLegend: true,
    showValues: true,
  },
};

export const LargeBubbles = {
  args: {
    data: globalHealthData,
    colors: globalHealthColors,
    height: 500,
    minRadius: 80,
    maxRadius: 180,
    showLegend: true,
    showValues: true,
  },
};

export const NoLegend = {
  args: {
    data: globalHealthData,
    colors: globalHealthColors,
    height: 400,
    minRadius: 70,
    maxRadius: 140,
    showLegend: false,
    showValues: true,
  },
};

export const NoValues = {
  args: {
    data: globalHealthData,
    colors: globalHealthColors,
    height: 400,
    minRadius: 70,
    maxRadius: 140,
    showLegend: true,
    showValues: false,
  },
};

const moreData = [
  { name: 'Category A', value: 500 },
  { name: 'Category B', value: 350 },
  { name: 'Category C', value: 280 },
  { name: 'Category D', value: 150 },
  { name: 'Category E', value: 100 },
];

const moreColors = [
  '#fe7449',
  '#f9a78d',
  '#8c4028',
  '#f0b456',
  '#cbafde',
];

export const FiveBubbles = {
  args: {
    data: moreData,
    colors: moreColors,
    height: 450,
    minRadius: 50,
    maxRadius: 120,
    showLegend: true,
    showValues: true,
  },
};

const twoData = [
  { name: 'Yes', value: 75 },
  { name: 'No', value: 25 },
];

export const TwoBubbles = {
  args: {
    data: twoData,
    colors: ['#8dd6a9', '#fe7449'],
    height: 300,
    minRadius: 60,
    maxRadius: 120,
    showLegend: true,
    showValues: true,
  },
};
