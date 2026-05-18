'use client';

import { useState, useRef, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import Sidebar from '@/components/layout/Sidebar';
import { WorldMap } from '@/components/charts';
import { TabNav, ChartMenu, Dropdown } from '@/components/ui';
import { UploadIcon, SearchIcon } from '@/components/icons';
import { buildCSV, downloadCSV } from '@/lib/csv';
import { downloadPNG } from '@/lib/png';

// ---------- Dummy data ----------

const TABS = [
  { label: 'Candidates', value: 'candidates' },
  { label: 'Approved Products', value: 'approved' },
  { label: 'Clinical Trials', value: 'trials' },
  { label: 'Technology types', value: 'technology' },
];

const GHA_COLORS = {
  'Neglected diseases': '#AD5133',
  "Women's health": '#F0B456',
  'Emerging infectious diseases': '#54A5C4',
};

// --- Per-tab stat cards ---
const TAB_STAT_CARDS = {
  candidates: [
    { title: 'Total candidates', value: 2264, percentage: null },
    { title: 'Neglected disease', value: 1648, percentage: 72.8, color: '#B28FC9' },
    { title: 'Emerging infectious diseases', value: 482, percentage: 21.3, color: '#8DD6A9' },
    { title: "Women's health", value: 134, percentage: 5.9, color: '#54A5C4' },
  ],
  approved: [
    { title: 'Total approved products', value: 2264, percentage: null },
    { title: 'Neglected disease', value: 1648, percentage: 72.8, color: '#B28FC9' },
    { title: 'Emerging infectious diseases', value: 482, percentage: 21.3, color: '#8DD6A9' },
    { title: "Women's health", value: 134, percentage: 5.9, color: '#54A5C4' },
  ],
  trials: [
    { title: 'Total clinical trials', value: 1520, percentage: null },
    { title: 'Neglected disease', value: 1100, percentage: 72.4, color: '#B28FC9' },
    { title: 'Emerging infectious diseases', value: 310, percentage: 20.4, color: '#8DD6A9' },
    { title: "Women's health", value: 110, percentage: 7.2, color: '#54A5C4' },
  ],
  technology: [
    { title: 'Total technology types', value: 18, percentage: null },
    { title: 'Neglected disease', value: 12, percentage: 66.7, color: '#B28FC9' },
    { title: 'Emerging infectious diseases', value: 4, percentage: 22.2, color: '#8DD6A9' },
    { title: "Women's health", value: 2, percentage: 11.1, color: '#54A5C4' },
  ],
};

// --- Per-tab chart titles ---
const TAB_LABELS = {
  candidates: { disease: 'Top 5 diseases by candidate count', product: 'Top 5 product types by candidate count' },
  approved: { disease: 'Top 5 diseases by approved products count', product: 'Top 5 product types by approved product count' },
  trials: { disease: 'Top 5 disease count by clinical trials', product: 'Top 5 product types by clinical trials' },
  technology: { disease: 'Top 5 diseases by technology type count', product: 'Top 5 product types by technology type count' },
};

const TOP_DISEASES = [
  { name: 'Chikungunya', 'Neglected diseases': 340, "Women's health": 15, 'Emerging infectious diseases': 10 },
  { name: 'Malaria', 'Neglected diseases': 310, "Women's health": 10, 'Emerging infectious diseases': 5 },
  { name: 'Tuberculosis', 'Neglected diseases': 290, "Women's health": 8, 'Emerging infectious diseases': 12 },
  { name: 'Zika virus', 'Neglected diseases': 250, "Women's health": 5, 'Emerging infectious diseases': 20 },
  { name: 'West Nile virus', 'Neglected diseases': 210, "Women's health": 3, 'Emerging infectious diseases': 8 },
];

const TOP_PRODUCTS = [
  { name: 'Vaccines', value: 260, color: '#54A5C4' },
  { name: 'Drugs', value: 220, color: '#F0B456' },
  { name: 'Biologics', value: 180, color: '#6AB085' },
  { name: 'Microbicides', value: 155, color: '#B28FC9' },
  { name: 'VCP', value: 120, color: '#F9A78D' },
];

// --- Approved Products extra charts ---
const APPROVAL_STATUS_DATA = [
  { name: 'Approved', value: 180, color: '#54A5C4' },
  { name: 'Used off-label', value: 45, color: '#F0B456' },
  { name: 'Withdrawn', value: 12, color: '#6AB085' },
  { name: 'Emergency use', value: 28, color: '#B28FC9' },
  { name: 'Review', value: 18, color: '#F9A78D' },
  { name: 'Unknown', value: 35, color: '#AD5133' },
];

const APPROVING_AUTHORITIES_DATA = [
  { name: 'Stringent Regulatory Authority', 'No formal WHO listing': 90, 'WHO prequalified': 60 },
  { name: 'National Regulatory Authority', 'No formal WHO listing': 50, 'WHO prequalified': 35 },
];

const APPROVING_AUTH_COLORS = {
  'No formal WHO listing': '#f9a78d',
  'WHO prequalified': '#fe7449',
};

const WHO_PREQUAL_DATA = [
  { name: 'Yes', value: 95, color: '#fe7449' },
  { name: 'No', value: 223, color: '#e3d6c1' },
];

// --- Clinical Trials extra charts ---
const AGE_GROUPS_DATA = [
  { name: 'Neonates', value: 45, color: '#f9a78d' },
  { name: 'Infants', value: 82, color: '#54a5c4' },
  { name: 'Children', value: 120, color: '#fe7449' },
  { name: 'Adolescents', value: 95, color: '#CBAFDE' },
  { name: 'Young adults (18-45)', value: 310, color: '#f0b456' },
  { name: 'Older adults (45+)', value: 180, color: '#B28FC9' },
];

const TRIAL_STATUS_DATA = [
  { name: 'Terminated', value: 2, color: '#54A5C4' },
  { name: 'Active', value: 5, color: '#F0B456' },
  { name: 'Completed', value: 4, color: '#fe7449' },
  { name: 'Suspended', value: 3, color: '#6AB085' },
  { name: 'Withdrawn', value: 1, color: '#AD5133' },
];

const PHASE_COLORS = {
  'Pre-clinical': '#F9A78D',
  'Phase 1': '#fe7449',
  'Phase 2': '#B28FC9',
  'Phase 3': '#CBAFDE',
  Approved: '#6AB085',
};

const CLINICAL_TRIALS_DATA = [
  { ctNumber: 'NCT06558643', candidate: 'MMV371', product: 'Drugs', ctTitle: 'Single Ascending Dose Study to Assess the Safety, Tolerability and Pharmacokinetics of...', description: 'Lorem ipsum dolor sit amet consectetur. Euismod nibh enim auctor ultricies suspendisse.', phase: 'Pre-clinical' },
  { ctNumber: 'NCT06558644', candidate: 'MMV372', product: 'Drugs', ctTitle: 'Phase 2 Clinical Trial to Evaluate the Efficacy of MMV371 LAI in Patients with Chronic Con...', description: 'Lorem ipsum dolor sit amet consectetur. At et volutpat arcu egestas nisl mi.', phase: 'Phase 2' },
  { ctNumber: 'NCT06558645', candidate: 'MMV373', product: 'Drugs', ctTitle: 'Long-Term Safety Study of MMV371 LAI in Pediatric Participants', description: 'Lorem ipsum dolor sit amet consectetur. Quis risus pharetra arco varius mattis nunc id nec egestas.', phase: 'Pre-clinical' },
  { ctNumber: 'NCT06558646', candidate: 'MMV374', product: 'Drugs', ctTitle: 'MMV371 LAI Dosing Regimen Study for Optimal Therapeutic Outcomes', description: 'Lorem ipsum dolor sit amet consectetur. Eu scelerisque in duis odio.', phase: 'Approved' },
];

// --- Geographic dummy data (reuse WorldMap format) ---
const GEO_TRIAL_DATA = [
  { country: 'United States', iso_code: 'USA', candidateCount: 320 },
  { country: 'United Kingdom', iso_code: 'GBR', candidateCount: 180 },
  { country: 'India', iso_code: 'IND', candidateCount: 250 },
  { country: 'Brazil', iso_code: 'BRA', candidateCount: 120 },
  { country: 'South Africa', iso_code: 'ZAF', candidateCount: 90 },
  { country: 'Kenya', iso_code: 'KEN', candidateCount: 75 },
  { country: 'Thailand', iso_code: 'THA', candidateCount: 60 },
  { country: 'Nigeria', iso_code: 'NGA', candidateCount: 55 },
  { country: 'Germany', iso_code: 'DEU', candidateCount: 85 },
  { country: 'Australia', iso_code: 'AUS', candidateCount: 45 },
];

// --- Technology Types tab ---
const TECH_PHASES = [
  { key: 'discovery', label: 'Discovery', color: '#AD5133' },
  { key: 'pre_clinical', label: 'Pre-clinical', color: '#FE7449' },
  { key: 'phase_1', label: 'Phase 1', color: '#F9A78D' },
  { key: 'phase_2', label: 'Phase 2', color: '#B28FC9' },
  { key: 'phase_3', label: 'Phase 3', color: '#CBAFDE' },
  { key: 'approved', label: 'Approved', color: '#F0B456' },
];

const PRODUCT_TYPE_CARDS = [
  { name: 'Diagnostics', count: 19, candidates: 407, color: '#fe7449' },
  { name: 'Vaccines', count: 18, candidates: 193, color: '#F0B456' },
  { name: 'Drugs', count: 16, candidates: 190, color: '#54A5C4' },
  { name: 'Biologics', count: 23, candidates: 83, color: '#6AB085' },
  { name: 'Vector Control Products', count: 9, candidates: 13, color: '#B28FC9' },
];

const TECH_BY_PRODUCT = {
  Diagnostics: [
    { name: 'Chemiluminescent immunoassay', discovery: 15, pre_clinical: 25, phase_1: 30, phase_2: 20, phase_3: 10, approved: 5 },
    { name: 'Molecular', discovery: 20, pre_clinical: 30, phase_1: 25, phase_2: 35, phase_3: 20, approved: 26 },
    { name: 'Western blot analysis', discovery: 10, pre_clinical: 15, phase_1: 8, phase_2: 5, phase_3: 3, approved: 2 },
    { name: 'Mass spectrometry', discovery: 8, pre_clinical: 12, phase_1: 10, phase_2: 6, phase_3: 2, approved: 1 },
    { name: 'Flow cytometry', discovery: 5, pre_clinical: 10, phase_1: 8, phase_2: 4, phase_3: 2, approved: 1 },
    { name: 'Southern blotting', discovery: 4, pre_clinical: 6, phase_1: 5, phase_2: 3, phase_3: 1, approved: 0 },
    { name: 'Immunofluorescence microscopy', discovery: 18, pre_clinical: 22, phase_1: 28, phase_2: 32, phase_3: 15, approved: 10 },
    { name: 'Radioimmunoassay', discovery: 12, pre_clinical: 18, phase_1: 22, phase_2: 25, phase_3: 12, approved: 8 },
    { name: 'Surface plasmon resonance', discovery: 15, pre_clinical: 20, phase_1: 25, phase_2: 28, phase_3: 14, approved: 9 },
    { name: 'Microarray analysis', discovery: 10, pre_clinical: 16, phase_1: 20, phase_2: 22, phase_3: 10, approved: 6 },
    { name: 'Next-generation sequencing', discovery: 8, pre_clinical: 14, phase_1: 18, phase_2: 20, phase_3: 8, approved: 5 },
    { name: 'Polymerase chain reaction', discovery: 20, pre_clinical: 28, phase_1: 35, phase_2: 40, phase_3: 18, approved: 12 },
  ],
  Vaccines: [
    { name: 'mRNA', discovery: 25, pre_clinical: 30, phase_1: 20, phase_2: 15, phase_3: 8, approved: 5 },
    { name: 'Viral vector', discovery: 18, pre_clinical: 22, phase_1: 15, phase_2: 10, phase_3: 5, approved: 3 },
    { name: 'Protein subunit', discovery: 15, pre_clinical: 18, phase_1: 12, phase_2: 8, phase_3: 4, approved: 2 },
    { name: 'Inactivated', discovery: 10, pre_clinical: 12, phase_1: 8, phase_2: 5, phase_3: 3, approved: 4 },
    { name: 'Live attenuated', discovery: 8, pre_clinical: 10, phase_1: 6, phase_2: 4, phase_3: 2, approved: 3 },
  ],
  Drugs: [
    { name: 'Small molecule', discovery: 20, pre_clinical: 25, phase_1: 18, phase_2: 12, phase_3: 6, approved: 4 },
    { name: 'Antibody-drug conjugate', discovery: 12, pre_clinical: 15, phase_1: 10, phase_2: 8, phase_3: 3, approved: 1 },
    { name: 'Antisense oligonucleotide', discovery: 8, pre_clinical: 10, phase_1: 6, phase_2: 4, phase_3: 2, approved: 1 },
  ],
  Biologics: [
    { name: 'Monoclonal antibody', discovery: 15, pre_clinical: 18, phase_1: 12, phase_2: 8, phase_3: 4, approved: 2 },
    { name: 'Recombinant protein', discovery: 10, pre_clinical: 12, phase_1: 8, phase_2: 5, phase_3: 2, approved: 1 },
  ],
  'Vector Control Products': [
    { name: 'Insecticide-treated nets', discovery: 3, pre_clinical: 2, phase_1: 1, phase_2: 1, phase_3: 0, approved: 2 },
    { name: 'Indoor residual spraying', discovery: 2, pre_clinical: 1, phase_1: 0, phase_2: 0, phase_3: 0, approved: 1 },
  ],
};

const DISEASE_COVERAGE = {
  Molecular: [
    { name: 'Mpox (monkeypox)', 'Neglected diseases': 150, "Women's health": 0, 'Emerging infectious diseases': 0 },
    { name: 'Chikungunya', 'Neglected diseases': 0, "Women's health": 0, 'Emerging infectious diseases': 140 },
    { name: 'Tuberculosis', 'Neglected diseases': 130, "Women's health": 0, 'Emerging infectious diseases': 0 },
    { name: 'Dengue', 'Neglected diseases': 0, "Women's health": 0, 'Emerging infectious diseases': 95 },
    { name: 'Gonorrhea', 'Neglected diseases': 80, "Women's health": 0, 'Emerging infectious diseases': 0 },
  ],
};

const RD_STAGE_OPTIONS = [
  { label: 'Discovery', value: 'discovery' },
  { label: 'Pre-clinical', value: 'pre_clinical' },
  { label: 'Phase 1', value: 'phase_1' },
  { label: 'Phase 2', value: 'phase_2' },
  { label: 'Phase 3', value: 'phase_3' },
  { label: 'Approved', value: 'approved' },
];

const CANDIDATES_DATA = [
  { name: 'DPP Fever Panel II Asia IgM', gha: 'Emerging infectious disease', disease: 'Zika', secondaryDisease: 'Zika', product: 'Diagnostics', rdStage: 'Unknown', developers: 'Unknown' },
  { name: 'MVAX Malaria Vaccine', gha: 'Neglected diseases', disease: 'Malaria', secondaryDisease: 'P. falciparum', product: 'Vaccines', rdStage: 'Phase 2', developers: 'GSK' },
  { name: 'TB-Cure Drug Combo', gha: 'Neglected diseases', disease: 'Tuberculosis', secondaryDisease: 'MDR-TB', product: 'Drugs', rdStage: 'Phase 1', developers: 'Novartis' },
  { name: 'ChikV Biologics', gha: 'Neglected diseases', disease: 'Chikungunya', secondaryDisease: '-', product: 'Biologics', rdStage: 'Pre-clinical', developers: 'Sanofi' },
  { name: 'Zika mRNA Booster', gha: 'Emerging infectious disease', disease: 'Zika', secondaryDisease: 'Zika', product: 'Vaccines', rdStage: 'Discovery', developers: 'Moderna' },
  { name: 'WNV Antiviral', gha: 'Neglected diseases', disease: 'West Nile virus', secondaryDisease: '-', product: 'Drugs', rdStage: 'Phase 3', developers: 'Pfizer' },
  { name: 'Maternal Health Diagnostic Kit', gha: "Women's health", disease: 'Pre-eclampsia', secondaryDisease: '-', product: 'Diagnostics', rdStage: 'Approved', developers: 'Abbott' },
  { name: 'Leish-Vax Oral', gha: 'Neglected diseases', disease: 'Leishmaniasis', secondaryDisease: 'Visceral', product: 'Vaccines', rdStage: 'Phase 1', developers: 'IDRI' },
];

// ---------- Mini donut for stat cards ----------

function MiniDonut({ percentage, color, size = 56 }) {
  const strokeW = 5;
  const radius = (size - strokeW) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (percentage / 100) * circumference;
  const gap = circumference - filled;

  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f3f3f3" strokeWidth={strokeW} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeW}
        strokeDasharray={`${filled} ${gap}`}
        strokeDashoffset={circumference / 4}
        strokeLinecap="round"
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="11"
        fontWeight="600"
        fill="#333"
      >
        {percentage}%
      </text>
    </svg>
  );
}

// ---------- Bar chart tooltip ----------

function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <div className="font-semibold text-black mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.fill || p.color }} />
          <span className="text-gray-600">{p.dataKey}:</span>
          <span className="font-medium text-black">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- Donut tooltip ----------

function DonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.payload.color }} />
        <span className="font-medium text-black">{d.name}</span>
      </div>
      <div className="mt-1 text-gray-600">{d.value}</div>
    </div>
  );
}

// ---------- Page ----------

export default function AnalyticalInsights() {
  const [activeTab, setActiveTab] = useState('candidates');
  const [searchQuery, setSearchQuery] = useState('');
  const [rdStageFilter, setRdStageFilter] = useState([]);
  const [shareCopied, setShareCopied] = useState(false);
  const [tablePage, setTablePage] = useState(1);
  const [selectedProductType, setSelectedProductType] = useState('Diagnostics');
  const [slideInTech, setSlideInTech] = useState(null);
  const [slideInAccordionOpen, setSlideInAccordionOpen] = useState(false);

  const diseasesChartRef = useRef(null);
  const productsChartRef = useRef(null);
  const approvalStatusRef = useRef(null);
  const authoritiesRef = useRef(null);
  const whoPrequalRef = useRef(null);
  const ageGroupsRef = useRef(null);
  const techChartRef = useRef(null);
  const trialStatusRef = useRef(null);
  const geoMapRef = useRef(null);

  const ITEMS_PER_PAGE = 10;

  const statCards = TAB_STAT_CARDS[activeTab] || TAB_STAT_CARDS.candidates;
  const labels = TAB_LABELS[activeTab] || TAB_LABELS.candidates;

  const filteredCandidates = useMemo(() => {
    let data = CANDIDATES_DATA;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.disease.toLowerCase().includes(q) ||
          d.developers.toLowerCase().includes(q),
      );
    }
    if (rdStageFilter.length > 0) {
      data = data.filter((d) => rdStageFilter.includes(d.rdStage));
    }
    return data;
  }, [searchQuery, rdStageFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCandidates.length / ITEMS_PER_PAGE));
  const pagedCandidates = filteredCandidates.slice(
    (tablePage - 1) * ITEMS_PER_PAGE,
    tablePage * ITEMS_PER_PAGE,
  );

  return (
    <div className="flex min-h-[calc(100vh-74px)] bg-cream-200">
      <Sidebar activeId="analytical-insights" />

      <main className="flex-1 min-w-0">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Page Header */}
          <div className="flex flex-col gap-4 mb-8 bg-white p-4 sm:p-6 lg:px-8 -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-black mb-2">
                  Analytical Insights
                </h1>
                <p className="text-sm text-gray-500">
                  Lorem ipsum dolor sit amet consectetur. Pellentesque ullamcorper enim a nisl.
                </p>
              </div>
              <button
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-black bg-orange-500 hover:bg-black hover:text-white whitespace-nowrap transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setShareCopied(true);
                  setTimeout(() => setShareCopied(false), 2000);
                }}
              >
                {shareCopied ? 'Copied!' : 'Share this view'}
                <UploadIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <TabNav
            tabs={TABS}
            activeTab={activeTab}
            onChange={(v) => {
              setActiveTab(v);
              setTablePage(1);
            }}
            className="mb-6"
          />

          {/* Stat Cards (hidden on technology tab) */}
          {activeTab !== 'technology' && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCards.map((card) => (
              <div
                key={card.title}
                className="bg-white border border-gray-200 p-4 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-black">{card.title}</h3>
                  <span className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 text-xs cursor-pointer">i</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="text-[40px] font-extrabold text-black leading-tight"
                    style={{ fontFamily: 'var(--font-align), system-ui, sans-serif' }}
                  >
                    {card.value.toLocaleString()}
                  </span>
                  {card.percentage !== null && (
                    <MiniDonut percentage={card.percentage} color={card.color} />
                  )}
                </div>
              </div>
            ))}
          </div>}

          {/* Two bar charts side by side (hidden on technology tab) */}
          {activeTab !== 'technology' && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Top 5 diseases */}
            <div className="bg-white border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-1">
                <h3 className="text-base sm:text-lg font-bold text-black">
                  {labels.disease}
                </h3>
                <ChartMenu
                  onDownloadCSV={() => {
                    const columns = [
                      { label: 'Disease', accessor: 'name' },
                      { label: 'Neglected diseases', accessor: 'Neglected diseases' },
                      { label: "Women's health", accessor: "Women's health" },
                      { label: 'Emerging infectious diseases', accessor: 'Emerging infectious diseases' },
                    ];
                    const csv = buildCSV(columns, TOP_DISEASES);
                    downloadCSV(csv, 'top-5-diseases');
                  }}
                  onDownloadPNG={() => downloadPNG(diseasesChartRef, 'top-5-diseases')}
                />
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Lorem ipsum dolor sit amet consectetur.
              </p>
              <div ref={diseasesChartRef}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={TOP_DISEASES}
                    layout="vertical"
                    margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={110}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip content={<BarTooltip />} />
                    {Object.entries(GHA_COLORS).map(([key, color]) => (
                      <Bar key={key} dataKey={key} stackId="a" fill={color} barSize={20} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 mt-3">
                  {Object.entries(GHA_COLORS).map(([label, color]) => (
                    <div key={label} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top 5 product types */}
            <div className="bg-white border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-1">
                <h3 className="text-base sm:text-lg font-bold text-black">
                  {labels.product}
                </h3>
                <ChartMenu
                  onDownloadCSV={() => {
                    const columns = [
                      { label: 'Product type', accessor: 'name' },
                      { label: 'Count', accessor: 'value' },
                    ];
                    const csv = buildCSV(columns, TOP_PRODUCTS);
                    downloadCSV(csv, 'top-5-product-types');
                  }}
                  onDownloadPNG={() => downloadPNG(productsChartRef, 'top-5-product-types')}
                />
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Lorem ipsum dolor sit amet consectetur.
              </p>
              <div ref={productsChartRef}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={TOP_PRODUCTS}
                    layout="vertical"
                    margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={90}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip content={<BarTooltip />} />
                    <Bar dataKey="value" barSize={20}>
                      {TOP_PRODUCTS.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>}

          {/* Approved Products extra charts */}
          {activeTab === 'approved' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Approval status */}
              <div className="bg-white border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-bold text-black">Approval status</h3>
                  <ChartMenu
                    onDownloadCSV={() => {
                      const columns = [
                        { label: 'Status', accessor: 'name' },
                        { label: 'Count', accessor: 'value' },
                      ];
                      const csv = buildCSV(columns, APPROVAL_STATUS_DATA);
                      downloadCSV(csv, 'approval-status');
                    }}
                    onDownloadPNG={() => downloadPNG(approvalStatusRef, 'approval-status')}
                  />
                </div>
                <div ref={approvalStatusRef}>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={APPROVAL_STATUS_DATA} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={0} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip content={<BarTooltip />} />
                      <Bar dataKey="value" barSize={28}>
                        {APPROVAL_STATUS_DATA.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    {APPROVAL_STATUS_DATA.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
                        {d.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Approving Authorities */}
              <div className="bg-white border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-bold text-black">Approving Authorities</h3>
                  <ChartMenu
                    onDownloadCSV={() => {
                      const columns = [
                        { label: 'Authority', accessor: 'name' },
                        { label: 'No formal WHO listing', accessor: 'No formal WHO listing' },
                        { label: 'WHO prequalified', accessor: 'WHO prequalified' },
                      ];
                      const csv = buildCSV(columns, APPROVING_AUTHORITIES_DATA);
                      downloadCSV(csv, 'approving-authorities');
                    }}
                    onDownloadPNG={() => downloadPNG(authoritiesRef, 'approving-authorities')}
                  />
                </div>
                <div ref={authoritiesRef}>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={APPROVING_AUTHORITIES_DATA} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip content={<BarTooltip />} />
                      {Object.entries(APPROVING_AUTH_COLORS).map(([key, color]) => (
                        <Bar key={key} dataKey={key} fill={color} barSize={28} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    {Object.entries(APPROVING_AUTH_COLORS).map(([label, color]) => (
                      <div key={label} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                        {label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* WHO prequalification */}
              <div className="bg-white border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-bold text-black">WHO prequalification</h3>
                  <ChartMenu
                    onDownloadCSV={() => {
                      const columns = [
                        { label: 'Status', accessor: 'name' },
                        { label: 'Count', accessor: 'value' },
                      ];
                      const csv = buildCSV(columns, WHO_PREQUAL_DATA);
                      downloadCSV(csv, 'who-prequalification');
                    }}
                    onDownloadPNG={() => downloadPNG(whoPrequalRef, 'who-prequalification')}
                  />
                </div>
                <div ref={whoPrequalRef}>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={WHO_PREQUAL_DATA}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {WHO_PREQUAL_DATA.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<DonutTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex items-center justify-center gap-4 mt-3">
                    {WHO_PREQUAL_DATA.map((d) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
                        {d.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Clinical Trials extra charts */}
          {activeTab === 'trials' && (
            <>
              {/* Age groups + Trial status */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Age groups in clinical trials */}
                <div className="bg-white border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-base sm:text-lg font-bold text-black">Age groups in clinical trials</h3>
                    <ChartMenu
                      onDownloadCSV={() => {
                        const columns = [
                          { label: 'Age group', accessor: 'name' },
                          { label: 'Count', accessor: 'value' },
                        ];
                        const csv = buildCSV(columns, AGE_GROUPS_DATA);
                        downloadCSV(csv, 'age-groups-clinical-trials');
                      }}
                      onDownloadPNG={() => downloadPNG(ageGroupsRef, 'age-groups-clinical-trials')}
                    />
                  </div>
                  <div ref={ageGroupsRef}>
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={AGE_GROUPS_DATA}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          dataKey="value"
                          paddingAngle={2}
                        >
                          {AGE_GROUPS_DATA.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<DonutTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
                      {AGE_GROUPS_DATA.map((d) => (
                        <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
                          {d.name}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Clinical trial status */}
                <div className="bg-white border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-base sm:text-lg font-bold text-black">Clinical trial status</h3>
                    <ChartMenu
                      onDownloadCSV={() => {
                        const columns = [
                          { label: 'Status', accessor: 'name' },
                          { label: 'Count', accessor: 'value' },
                        ];
                        const csv = buildCSV(columns, TRIAL_STATUS_DATA);
                        downloadCSV(csv, 'clinical-trial-status');
                      }}
                      onDownloadPNG={() => downloadPNG(trialStatusRef, 'clinical-trial-status')}
                    />
                  </div>
                  <div ref={trialStatusRef}>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={TRIAL_STATUS_DATA} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip content={<BarTooltip />} />
                        <Bar dataKey="value" barSize={32}>
                          {TRIAL_STATUS_DATA.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      {TRIAL_STATUS_DATA.map((d) => (
                        <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
                          {d.name}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Geographic distribution */}
              <div className="bg-white border border-gray-200 p-4 mb-6">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="text-base sm:text-lg font-bold text-black">Geographic distribution of clinical trials</h3>
                  <div className="flex items-center gap-2">
                    <Dropdown
                      value={[]}
                      onChange={() => {}}
                      placeholder="All"
                      options={[]}
                      compact={true}
                    />
                    <ChartMenu
                      onDownloadPNG={() => downloadPNG(geoMapRef, 'geographic-distribution-trials')}
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  The spatial heat map shows the country-level distribution of clinical trials, with darker shades indicating countries with higher number of studies, and can be filtered by clinical trial status.
                </p>
                <div ref={geoMapRef}>
                  <WorldMap data={GEO_TRIAL_DATA} height={320} showLegend={false} />
                </div>
                <p className="text-xs text-gray-500 mt-3">Source: World Bank Official Boundaries</p>
              </div>

              {/* Clinical trials table */}
              <div className="bg-white border border-gray-200 p-4 mb-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base sm:text-lg font-bold text-black">Clinical trials</h3>
                    <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">
                      {CLINICAL_TRIALS_DATA.length} Trials
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search item"
                        className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 w-48"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const columns = [
                          { label: 'CT number', accessor: 'ctNumber' },
                          { label: 'Candidate', accessor: 'candidate' },
                          { label: 'Product', accessor: 'product' },
                          { label: 'CT title', accessor: 'ctTitle' },
                          { label: 'Description', accessor: 'description' },
                          { label: 'Phase', accessor: 'phase' },
                        ];
                        const csv = buildCSV(columns, CLINICAL_TRIALS_DATA);
                        downloadCSV(csv, 'clinical-trials');
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black border border-gray-300 hover:bg-gray-50 transition-colors rounded-lg"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                      Download CSV
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  The clinical trial table is a matrix of individual studies, providing granular details such as title, clinical trial status, location, start date, URL and more. The table can be searched using a text search box and (filtered results) can be exported as a .csv file.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-3 font-semibold text-black">CT number</th>
                        <th className="text-left py-3 px-3 font-semibold text-black">Candidate</th>
                        <th className="text-left py-3 px-3 font-semibold text-black">Product</th>
                        <th className="text-left py-3 px-3 font-semibold text-black">CT title</th>
                        <th className="text-left py-3 px-3 font-semibold text-black">Description</th>
                        <th className="text-left py-3 px-3 font-semibold text-black">Phase</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CLINICAL_TRIALS_DATA.map((row, i) => (
                        <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-3 text-gray-600">{row.ctNumber}</td>
                          <td className="py-3 px-3 text-gray-600">{row.candidate}</td>
                          <td className="py-3 px-3 text-gray-600">{row.product}</td>
                          <td className="py-3 px-3">
                            <div className="text-gray-600">{row.ctTitle}</div>
                            <a href="#" className="text-orange-500 text-xs hover:underline">
                              Explore &rarr;
                            </a>
                          </td>
                          <td className="py-3 px-3 text-gray-600 max-w-[250px]">{row.description}</td>
                          <td className="py-3 px-3">
                            <span
                              className="px-2 py-1 text-xs font-medium rounded"
                              style={{
                                color: PHASE_COLORS[row.phase] || '#AD5133',
                                backgroundColor: `${PHASE_COLORS[row.phase] || '#AD5133'}1F`,
                              }}
                            >
                              {row.phase}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Technology Types tab */}
          {activeTab === 'technology' && (
            <>
              {/* Header */}
              <div className="bg-white border border-gray-200 p-4 mb-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base sm:text-lg font-bold text-black">Product types and their technologies</h3>
                    <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">
                      800 candidates
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" placeholder="Search item" className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 w-48" />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black border border-gray-300 hover:bg-gray-50 transition-colors rounded-lg">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                      Download CSV
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-6">
                  This matrix grid shows the technology types for which candidates are being developed against the R&D stages. It provides an overview of the portfolio&apos;s progress for each technology type. The numbers inside each cell indicate the total candidates matching the technology and the phase.
                </p>

                {/* Product type cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                  {PRODUCT_TYPE_CARDS.map((pt) => (
                    <button
                      key={pt.name}
                      onClick={() => setSelectedProductType(pt.name)}
                      className={`p-4 border text-left transition-colors cursor-pointer ${
                        selectedProductType === pt.name
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-sm text-black">{pt.name}</span>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pt.color }} />
                      </div>
                      <div className="text-[32px] font-extrabold text-black leading-tight" style={{ fontFamily: 'var(--font-align), system-ui, sans-serif' }}>
                        {pt.count}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Technology types with {pt.candidates} candidates
                      </p>
                    </button>
                  ))}
                </div>

                {/* Selected product type chart */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-base sm:text-lg font-bold text-black">{selectedProductType}</h4>
                    <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">
                      {PRODUCT_TYPE_CARDS.find((p) => p.name === selectedProductType)?.candidates || 0} candidates
                    </span>
                    <div className="flex-1" />
                    <ChartMenu
                      onDownloadPNG={() => downloadPNG(techChartRef, `technology-${selectedProductType}`)}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    This visualization tracks the evolution of the global pipeline over time. It is showing how candidates have successfully progressed through clinical phases toward market readiness. In the make custom comparison page, it is possible to set up your own comparison of a pipeline over time, or between two or more diseases.
                  </p>

                  {/* Phase legend */}
                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    {TECH_PHASES.map((p) => (
                      <label key={p.key} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.color }} />
                        {p.label}
                      </label>
                    ))}
                  </div>

                  {/* Stacked bar chart */}
                  <div ref={techChartRef}>
                    <ResponsiveContainer width="100%" height={Math.max(300, (TECH_BY_PRODUCT[selectedProductType]?.length || 3) * 36)}>
                      <BarChart
                        data={TECH_BY_PRODUCT[selectedProductType] || []}
                        layout="vertical"
                        margin={{ top: 0, right: 20, left: 0, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 12 }} label={{ value: 'Number of candidates and approved products', position: 'insideBottom', offset: -10, fontSize: 12, fill: '#666' }} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={200}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip content={<BarTooltip />} />
                        {TECH_PHASES.map((p) => (
                          <Bar
                            key={p.key}
                            dataKey={p.key}
                            stackId="a"
                            fill={p.color}
                            barSize={18}
                            cursor="pointer"
                            onClick={(data) => setSlideInTech(data?.name || null)}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Accordions: Coverage across diseases & Candidates and approved products */}
              <div className="mt-6 border border-gray-200 divide-y divide-gray-200 bg-white">
                {/* Coverage across diseases */}
                <div>
                  <button
                    onClick={() => setSlideInTech(slideInTech === 'coverage' ? null : 'coverage')}
                    className="w-full flex items-center justify-between px-6 py-5 transition-colors" style={{ backgroundColor: '#F9F9FA' }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold text-black">Coverage across diseases</span>
                      <span className="text-sm font-medium text-[#E76A42]">Molecular</span>
                    </div>
                    <svg
                      width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className={`transition-transform ${slideInTech === 'coverage' ? 'rotate-45' : ''}`}
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                  {slideInTech === 'coverage' && (
                    <div className="px-6 pb-6">
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={DISEASE_COVERAGE.Molecular} layout="vertical" margin={{ left: 100, right: 20, top: 5, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 12 }} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                          <Tooltip />
                          <Bar dataKey="Neglected diseases" stackId="a" fill="#AD5133" barSize={16} />
                          <Bar dataKey="Women's health" stackId="a" fill="#F0B456" barSize={16} />
                          <Bar dataKey="Emerging infectious diseases" stackId="a" fill="#54A5C4" barSize={16} />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="flex items-center gap-4 mt-2">
                        {[{ label: 'Neglected diseases', color: '#AD5133' }, { label: "Women's health", color: '#F0B456' }, { label: 'Emerging infectious diseases', color: '#54A5C4' }].map((item) => (
                          <div key={item.label} className="flex items-center gap-1.5 text-xs text-gray-600">
                            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
                            {item.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Candidates and approved products */}
                <div>
                  <button
                    onClick={() => setSlideInAccordionOpen(!slideInAccordionOpen)}
                    className="w-full flex items-center justify-between px-6 py-5 transition-colors" style={{ backgroundColor: '#F9F9FA' }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold text-black">Candidates and approved products</span>
                      <span className="text-sm font-medium text-[#E76A42]">Gonorrhea</span>
                    </div>
                    <svg
                      width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className={`transition-transform ${slideInAccordionOpen ? 'rotate-45' : ''}`}
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                  {slideInAccordionOpen && (
                    <div className="px-6 pb-6">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="text-left px-4 py-2 font-medium text-gray-600">Name</th>
                            <th className="text-left px-4 py-2 font-medium text-gray-600">Disease</th>
                            <th className="text-left px-4 py-2 font-medium text-gray-600">Phase</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { name: 'Candidate Alpha', disease: 'Mpox', phase: 'Phase 2' },
                            { name: 'Candidate Beta', disease: 'Tuberculosis', phase: 'Phase 1' },
                            { name: 'Candidate Gamma', disease: 'Chikungunya', phase: 'Pre-clinical' },
                            { name: 'Product Delta', disease: 'Dengue', phase: 'Approved' },
                            { name: 'Candidate Epsilon', disease: 'Gonorrhea', phase: 'Discovery' },
                          ].map((row, i) => (
                            <tr key={i} className="border-b border-gray-100 last:border-0">
                              <td className="px-4 py-2 text-black">{row.name}</td>
                              <td className="px-4 py-2 text-gray-600">{row.disease}</td>
                              <td className="px-4 py-2">
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                  row.phase === 'Approved' ? 'bg-[#F0B456]/20 text-[#A07A30]' :
                                  row.phase === 'Phase 2' ? 'bg-[#B28FC9]/20 text-[#7A5A8E]' :
                                  row.phase === 'Phase 1' ? 'bg-[#F9A78D]/20 text-[#AD5133]' :
                                  row.phase === 'Pre-clinical' ? 'bg-[#FE7449]/20 text-[#AD5133]' :
                                  'bg-[#AD5133]/20 text-[#AD5133]'
                                }`}>
                                  {row.phase}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Candidates Table (not shown on trials/technology tabs) */}
          {activeTab !== 'trials' && activeTab !== 'technology' && <div className="bg-white border border-gray-200 p-4">
            {/* Table header */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-base sm:text-lg font-bold text-black">Candidates</h3>
                <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">
                  {filteredCandidates.length} candidates
                </span>
              </div>
              <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search item"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setTablePage(1);
                    }}
                    className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 w-48"
                  />
                </div>
                {/* R&D stage filter */}
                <div className="w-[160px]">
                  <Dropdown
                    value={rdStageFilter}
                    onChange={(v) => {
                      setRdStageFilter(v);
                      setTablePage(1);
                    }}
                    placeholder="R&D stage"
                    options={RD_STAGE_OPTIONS}
                    multiSelect={true}
                    compact={true}
                  />
                </div>
                {/* Download CSV */}
                <button
                  onClick={() => {
                    const columns = [
                      { label: 'Name', accessor: 'name' },
                      { label: 'GHA', accessor: 'gha' },
                      { label: 'Disease', accessor: 'disease' },
                      { label: 'Secondary Disease', accessor: 'secondaryDisease' },
                      { label: 'Product', accessor: 'product' },
                      { label: 'Current R&D Stage', accessor: 'rdStage' },
                      { label: 'Developers', accessor: 'developers' },
                    ];
                    const csv = buildCSV(columns, filteredCandidates);
                    downloadCSV(csv, 'candidates');
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-black border border-gray-300 hover:bg-gray-50 transition-colors rounded-lg"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                  Download CSV
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              This matrix grid shows the technology types for which candidates are being developed against the R&D stages. It provides an overview of the portfolio&apos;s progress for each technology type. The numbers insight each cell indicate the total candidates matching the technology and the phase.
            </p>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-3 font-semibold text-black">Name</th>
                    <th className="text-left py-3 px-3 font-semibold text-black">GHA</th>
                    <th className="text-left py-3 px-3 font-semibold text-black">Disease</th>
                    <th className="text-left py-3 px-3 font-semibold text-black">Secondary Disease</th>
                    <th className="text-left py-3 px-3 font-semibold text-black">Product</th>
                    <th className="text-left py-3 px-3 font-semibold text-black">Current R&D Stage</th>
                    <th className="text-left py-3 px-3 font-semibold text-black">Developers</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCandidates.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-3">
                        <div className="font-medium text-black">{row.name}</div>
                        <a href="#" className="text-orange-500 text-xs hover:underline">
                          Explore &rarr;
                        </a>
                      </td>
                      <td className="py-3 px-3 text-gray-600">{row.gha}</td>
                      <td className="py-3 px-3 text-gray-600">{row.disease}</td>
                      <td className="py-3 px-3 text-gray-600">{row.secondaryDisease}</td>
                      <td className="py-3 px-3 text-gray-600">{row.product}</td>
                      <td className="py-3 px-3 text-gray-600">{row.rdStage}</td>
                      <td className="py-3 px-3 text-gray-600">{row.developers}</td>
                    </tr>
                  ))}
                  {pagedCandidates.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">
                        No candidates found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <span className="text-sm text-gray-500">
                  Page {tablePage} of {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTablePage((p) => Math.max(1, p - 1))}
                    disabled={tablePage <= 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setTablePage((p) => Math.min(totalPages, p + 1))}
                    disabled={tablePage >= totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>}
        </div>
      </main>

    </div>
  );
}
