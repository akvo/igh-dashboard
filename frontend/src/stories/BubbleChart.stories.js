import { createBubbleColorScale } from '@/lib/bubbleColorScale';
import BubbleChart from '../components/charts/BubbleChart';
import { chartColors } from '../lib/theme';

// Shared shader: shade each bubble by its rank within the dataset
// (largest = darkest). Matches the page-level usage in src/app/page.js.
const makeRampScale = (rampKey) =>
  createBubbleColorScale(chartColors.bubbleRamps[rampKey]);

// A richer tooltip shows the full label plus both count columns — useful
// to exercise the hover path on small bubbles where the interior label is
// suppressed by the radius threshold.
function tooltip(d) {
  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{d?.label || d?.name}</div>
      <div>{(d?.candidateCount ?? 0).toLocaleString()} candidates</div>
      <div>{(d?.productCount ?? 0).toLocaleString()} approved products</div>
    </div>
  );
}

const globalHealthData = [
  { name: 'Neglected diseases', label: 'Neglected diseases', value: 2101, candidateCount: 1950, productCount: 151 },
  { name: "Women's health", label: "Women's health", value: 1591, candidateCount: 1420, productCount: 171 },
  { name: 'Emerging infectious diseases', label: 'Emerging infectious diseases', value: 953, candidateCount: 910, productCount: 43 },
];

const globalHealthColors = ['#fe7449', '#f9a78d', '#8c4028'];

export default {
  title: 'Charts/BubbleChart',
  component: BubbleChart,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  argTypes: {
    height: {
      control: { type: 'number', min: 200, max: 600, step: 50 },
      description: 'Chart height in pixels',
    },
    gap: {
      control: { type: 'range', min: 0, max: 20, step: 1 },
      description: 'Gap between packed bubbles',
    },
    showLegend: { control: 'boolean' },
    showValues: { control: 'boolean' },
  },
};

export const Default = {
  args: {
    data: globalHealthData,
    colors: globalHealthColors,
    height: 400,
    gap: 4,
    showLegend: true,
    showValues: true,
  },
};

export const WithTooltip = {
  args: {
    data: globalHealthData,
    colorScale: makeRampScale('gha'),
    tooltip,
    height: 400,
    gap: 4,
    showLegend: true,
    showValues: true,
  },
};

// --- GHA × Product Type view (blue ramp, ~12 bubbles) ---

const ghaTypeData = [
  { key: 'ND|Drugs', name: 'ND · Drugs', label: 'Neglected diseases · Drugs', value: 953, candidateCount: 880, productCount: 73 },
  { key: 'ND|Vaccines', name: 'ND · Vaccines', label: 'Neglected diseases · Vaccines', value: 340, candidateCount: 320, productCount: 20 },
  { key: 'ND|Diagnostics', name: 'ND · Diagnostics', label: 'Neglected diseases · Diagnostics', value: 210, candidateCount: 190, productCount: 20 },
  { key: 'ND|Biologics', name: 'ND · Biologics', label: 'Neglected diseases · Biologics', value: 140, candidateCount: 128, productCount: 12 },
  { key: 'WH|Drugs', name: 'WH · Drugs', label: "Women's health · Drugs", value: 760, candidateCount: 700, productCount: 60 },
  { key: 'WH|Diagnostics', name: 'WH · Diagnostics', label: "Women's health · Diagnostics", value: 385, candidateCount: 340, productCount: 45 },
  { key: 'WH|Vaccines', name: 'WH · Vaccines', label: "Women's health · Vaccines", value: 280, candidateCount: 260, productCount: 20 },
  { key: 'WH|Biologics', name: 'WH · Biologics', label: "Women's health · Biologics", value: 110, candidateCount: 100, productCount: 10 },
  { key: 'EID|Diagnostics', name: 'EID · Diagnostics', label: 'Emerging infectious diseases · Diagnostics', value: 467, candidateCount: 430, productCount: 37 },
  { key: 'EID|Vaccines', name: 'EID · Vaccines', label: 'Emerging infectious diseases · Vaccines', value: 260, candidateCount: 248, productCount: 12 },
  { key: 'EID|Drugs', name: 'EID · Drugs', label: 'Emerging infectious diseases · Drugs', value: 190, candidateCount: 181, productCount: 9 },
  { key: 'EID|Biologics', name: 'EID · Biologics', label: 'Emerging infectious diseases · Biologics', value: 36, candidateCount: 34, productCount: 2 },
];

export const GhaProductTypeView = {
  args: {
    data: ghaTypeData,
    colorScale: makeRampScale('ghaType'),
    tooltip,
    height: 420,
    gap: 3,
    showLegend: true,
    showValues: true,
  },
};

// --- Disease view (green ramp, ~15 bubbles) ---

const diseaseData = [
  'Tuberculosis,420',
  'Endometriosis,81',
  'Scabies,23',
  'Malaria,202',
  'Zika,143',
  'Polycystic ovary syndrome (PCOS),105',
  'Influenza,157',
  'HIV/AIDS,260',
  'Hepatitis C,95',
  'Chagas disease,32',
  'Leishmaniasis,52',
  'Dengue,88',
  'Oxygen therapy,18',
  'Cholera,46',
  'Pneumonia,130',
].map((s, i) => {
  const [name, val] = s.split(',');
  const value = Number(val);
  return {
    key: name,
    name,
    label: name,
    value,
    candidateCount: Math.round(value * 0.9),
    productCount: value - Math.round(value * 0.9),
  };
});

export const DiseaseView = {
  args: {
    data: diseaseData,
    colorScale: makeRampScale('disease'),
    tooltip,
    height: 460,
    gap: 3,
    showLegend: true,
    showValues: true,
  },
};

// --- Disease × Product Type view (violet ramp, ~30 bubbles — stresses
// packing, legend overflow, and the label-suppression thresholds). ---

const diseaseTypeData = (() => {
  const pairs = [
    ['Tuberculosis', 'Drugs', 180], ['Tuberculosis', 'Vaccines', 94], ['Tuberculosis', 'Diagnostics', 88],
    ['Malaria', 'Drugs', 80], ['Malaria', 'Vaccines', 70], ['Malaria', 'Diagnostics', 38],
    ['HIV/AIDS', 'Drugs', 120], ['HIV/AIDS', 'Vaccines', 80], ['HIV/AIDS', 'Diagnostics', 60],
    ['Endometriosis', 'Drugs', 48], ['Endometriosis', 'Diagnostics', 23],
    ['Zika', 'Vaccines', 78], ['Zika', 'Diagnostics', 41], ['Zika', 'Drugs', 20],
    ['Dengue', 'Vaccines', 60], ['Dengue', 'Diagnostics', 28],
    ['Influenza', 'Vaccines', 90], ['Influenza', 'Drugs', 45], ['Influenza', 'Diagnostics', 22],
    ['Chagas disease', 'Drugs', 20], ['Chagas disease', 'Diagnostics', 12],
    ['Scabies', 'Drugs', 18],
    ['PCOS', 'Drugs', 60], ['PCOS', 'Diagnostics', 25],
    ['Hepatitis C', 'Drugs', 55], ['Hepatitis C', 'Diagnostics', 30],
    ['Leishmaniasis', 'Drugs', 40],
    ['Cholera', 'Vaccines', 30],
    ['Pneumonia', 'Drugs', 70], ['Pneumonia', 'Diagnostics', 40],
  ];
  return pairs.map(([disease, productType, value]) => ({
    key: `${disease}|${productType}`,
    name: `${disease} · ${productType}`,
    label: `${disease} · ${productType}`,
    value,
    candidateCount: Math.round(value * 0.88),
    productCount: value - Math.round(value * 0.88),
  }));
})();

export const DiseaseProductTypeView = {
  args: {
    data: diseaseTypeData,
    colorScale: makeRampScale('diseaseType'),
    tooltip,
    height: 500,
    gap: 2,
    showLegend: true,
    showValues: true,
  },
};

// --- Forces the scrollable legend state: 30+ chips won't fit in 72px. ---

export const ScrollableLegend = {
  args: {
    data: diseaseTypeData,
    colorScale: makeRampScale('diseaseType'),
    tooltip,
    height: 420,
    gap: 2,
    showLegend: true,
    showValues: true,
  },
};

export const NoLegend = {
  args: {
    data: globalHealthData,
    colors: globalHealthColors,
    height: 400,
    showLegend: false,
    showValues: true,
  },
};

export const NoValues = {
  args: {
    data: globalHealthData,
    colors: globalHealthColors,
    height: 400,
    showLegend: true,
    showValues: false,
  },
};

export const TwoBubbles = {
  args: {
    data: [
      { name: 'Yes', value: 75, candidateCount: 50, productCount: 25 },
      { name: 'No', value: 25, candidateCount: 15, productCount: 10 },
    ],
    colors: ['#8dd6a9', '#fe7449'],
    height: 300,
    showLegend: true,
    showValues: true,
  },
};
