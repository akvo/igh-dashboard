import DonutChart from '../components/charts/DonutChart';

const ageGroupData = [
  { name: 'Neonates', value: 45 },
  { name: 'Infants', value: 30 },
  { name: 'Children', value: 120 },
  { name: 'Adolescents', value: 180 },
  { name: 'Young adults (18-45)', value: 95 },
  { name: 'Older adults (45+)', value: 210 },
];

const ageGroupColors = [
  '#f9a78d', // Peach - Neonates
  '#8c4028', // Dark brown - Infants
  '#fe7449', // Orange - Children
  '#cbafde', // Light purple - Adolescents
  '#f0b456', // Gold - Young adults
  '#54a5c4', // Teal - Older adults
];

export default {
  title: 'Charts/DonutChart',
  component: DonutChart,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    innerRadius: {
      control: { type: 'range', min: 20, max: 120, step: 5 },
      description: 'Inner radius of the donut (hole size)',
    },
    outerRadius: {
      control: { type: 'range', min: 50, max: 150, step: 5 },
      description: 'Outer radius of the donut',
    },
    height: {
      control: { type: 'number', min: 200, max: 600, step: 50 },
      description: 'Chart height in pixels',
    },
    paddingAngle: {
      control: { type: 'range', min: 0, max: 10, step: 1 },
      description: 'Gap between segments in degrees',
    },
    showLegend: {
      control: 'boolean',
      description: 'Show/hide the legend',
    },
    legendPosition: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right'],
      description: 'Position of the legend',
    },
  },
};

export const Default = {
  args: {
    data: ageGroupData,
    colors: ageGroupColors,
    innerRadius: 70,
    outerRadius: 120,
    height: 350,
    showLegend: true,
    legendPosition: 'bottom',
    paddingAngle: 2,
  },
};

export const ThinRing = {
  args: {
    data: ageGroupData,
    colors: ageGroupColors,
    innerRadius: 90,
    outerRadius: 120,
    height: 350,
    showLegend: true,
    legendPosition: 'bottom',
    paddingAngle: 2,
  },
};

export const ThickRing = {
  args: {
    data: ageGroupData,
    colors: ageGroupColors,
    innerRadius: 40,
    outerRadius: 120,
    height: 350,
    showLegend: true,
    legendPosition: 'bottom',
    paddingAngle: 2,
  },
};

export const NoGaps = {
  args: {
    data: ageGroupData,
    colors: ageGroupColors,
    innerRadius: 70,
    outerRadius: 120,
    height: 350,
    showLegend: true,
    legendPosition: 'bottom',
    paddingAngle: 0,
  },
};

export const LegendRight = {
  args: {
    data: ageGroupData,
    colors: ageGroupColors,
    innerRadius: 60,
    outerRadius: 100,
    height: 300,
    showLegend: true,
    legendPosition: 'right',
    paddingAngle: 2,
  },
};

export const NoLegend = {
  args: {
    data: ageGroupData,
    colors: ageGroupColors,
    innerRadius: 70,
    outerRadius: 120,
    height: 300,
    showLegend: false,
    paddingAngle: 2,
  },
};

export const SmallChart = {
  args: {
    data: ageGroupData,
    colors: ageGroupColors,
    innerRadius: 40,
    outerRadius: 70,
    height: 200,
    showLegend: true,
    legendPosition: 'bottom',
    paddingAngle: 2,
  },
};

const simpleData = [
  { name: 'Yes', value: 75 },
  { name: 'No', value: 25 },
];

export const SimpleTwoSegment = {
  args: {
    data: simpleData,
    colors: ['#8dd6a9', '#fe7449'],
    innerRadius: 60,
    outerRadius: 100,
    height: 250,
    showLegend: true,
    legendPosition: 'bottom',
    paddingAngle: 2,
  },
};
