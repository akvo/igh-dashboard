'use client';

import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
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
import { TabNav, ChartMenu, DataTable, Dropdown } from '@/components/ui';
import { UploadIcon } from '@/components/icons';
import { buildCSV, downloadCSV } from '@/lib/csv';
import { downloadPNG } from '@/lib/png';
import { useUrlState } from '@/lib/useUrlState';
import { stringSerializer, numberSerializer } from '@/lib/url-serializers';
import {
  usePortfolioKPIs,
  useGlobalHealthAreaSummaries,
  useDiseaseSummaries,
  useProductDistribution,
  usePortfolioCandidates,
  useRegulatoryDistribution,
  useClinicalTrialStats,
  useClinicalTrials,
  useGeographicDistribution,
  useTechnologyTypeDistribution,
  usePhases,
} from '@/graphql/hooks';
import {
  buildCandidateColumns,
  buildApprovedProductColumns,
  buildClinicalTrialColumns,
  toCSVColumns,
} from '@/lib/exploreColumnConfig';
import { toColumnFilters, toColumnSort } from '@/lib/dataTableGraphQL';
import { CandidateSlideIn, ProductSlideIn, TrialSlideIn } from '@/components/slideins';
import { displayHealthArea } from '@/lib/transformations/constants';
import { VECTOR_CONTROL_PRODUCT_NAMES, VECTOR_CONTROL_CONSOLIDATED_NAME } from '@/lib/filterGroups';

// ---------- Constants ----------

const TABS = [
  { label: 'Candidates', value: 'candidates' },
  { label: 'Approved Products', value: 'approved' },
  { label: 'Clinical Trials', value: 'trials' },
  { label: 'Technology types', value: 'technology' },
];

const GHA_COLORS = {
  'Neglected diseases': '#B28FC9',
  "Women's health": '#54A5C4',
  'Emerging infectious diseases': '#8DD6A9',
};

const STAT_CARD_COLORS = ['#B28FC9', '#8DD6A9', '#54A5C4'];

const TAB_LABELS = {
  candidates: { disease: 'Top 5 diseases by candidate count', product: 'Top 5 product types by candidate count' },
  approved: { disease: 'Top 5 diseases by approved products count', product: 'Top 5 product types by approved product count' },
  trials: { disease: 'Top 5 disease count by clinical trials', product: 'Top 5 product types by clinical trials' },
  technology: { disease: 'Top 5 diseases by technology type count', product: 'Top 5 product types by technology type count' },
};

const APPROVING_AUTH_COLORS = {
  'No formal WHO listing': '#f9a78d',
  'WHO prequalified': '#fe7449',
};

const TECH_PHASES = [
  { key: 'discovery', label: 'Discovery', color: '#AD5133' },
  { key: 'pre_clinical', label: 'Pre-clinical', color: '#FE7449' },
  { key: 'phase_1', label: 'Phase 1', color: '#F9A78D' },
  { key: 'phase_2', label: 'Phase 2', color: '#B28FC9' },
  { key: 'phase_3', label: 'Phase 3', color: '#CBAFDE' },
  { key: 'approved', label: 'Approved', color: '#F0B456' },
];

const ITEMS_PER_PAGE = 25;

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
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="600" fill="#333">
        {percentage}%
      </text>
    </svg>
  );
}

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

function DonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.payload.color || d.payload.fill }} />
        <span className="font-medium text-black">{d.name}</span>
      </div>
      <div className="mt-1 text-gray-600">{d.value}</div>
    </div>
  );
}

// ---------- Page ----------

export default function AnalyticalInsights() {
  const [activeTab, setActiveTab] = useState('candidates');
  const [shareCopied, setShareCopied] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState(null);
  const [selectedTechType, setSelectedTechType] = useState(null);
  const [coverageOpen, setCoverageOpen] = useState(false);
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [candidatesAccordionOpen, setCandidatesAccordionOpen] = useState(false);
  // VCP sub-category state: null = show sub-category cards, string = exploring a specific VCP sub-product
  const [vcpSubProduct, setVcpSubProduct] = useState(null);

  // Slide-in state (URL-backed)
  const [slideInOpen, setSlideInOpen] = useUrlState('slide', null, stringSerializer);
  const [slideInKey, setSlideInKey] = useUrlState('slideKey', null, numberSerializer);
  const closeSlideIn = useCallback(() => {
    setSlideInOpen(null);
    setSlideInKey(null);
  }, [setSlideInOpen, setSlideInKey]);

  // DataTable per-table state
  const [candidatesPage, setCandidatesPage] = useState(1);
  const [candidatesFilters, setCandidatesFilters] = useState({});
  const [candidatesSort, setCandidatesSort] = useState(null);
  const [candidatesVisibleCols, setCandidatesVisibleCols] = useState([]);

  const [approvedPage, setApprovedPage] = useState(1);
  const [approvedFilters, setApprovedFilters] = useState({});
  const [approvedSort, setApprovedSort] = useState(null);
  const [approvedVisibleCols, setApprovedVisibleCols] = useState([]);

  const [trialsPage, setTrialsPage] = useState(1);
  const [trialsFilters, setTrialsFilters] = useState({});
  const [trialsSort, setTrialsSort] = useState(null);
  const [trialsVisibleCols, setTrialsVisibleCols] = useState([]);

  // Tech accordion DataTable state
  const [techAccPage, setTechAccPage] = useState(1);
  const [techAccFilters, setTechAccFilters] = useState({});
  const [techAccSort, setTechAccSort] = useState(null);
  const [techAccVisibleCols, setTechAccVisibleCols] = useState([]);

  // Toolbar search + R&D stage filter per table
  const [candidatesSearch, setCandidatesSearch] = useState('');
  const [candidatesStage, setCandidatesStage] = useState('');
  const [approvedSearch, setApprovedSearch] = useState('');
  const [approvedStage, setApprovedStage] = useState('');
  const [trialsSearch, setTrialsSearch] = useState('');
  const [mapTrialStatus, setMapTrialStatus] = useState([]);

  const accordionRef = useRef(null);
  const diseasesChartRef = useRef(null);
  const productsChartRef = useRef(null);
  const approvalStatusRef = useRef(null);
  const authoritiesRef = useRef(null);
  const whoPrequalRef = useRef(null);
  const ageGroupsRef = useRef(null);
  const techChartRef = useRef(null);
  const trialStatusRef = useRef(null);
  const geoMapRef = useRef(null);

  const labels = TAB_LABELS[activeTab] || TAB_LABELS.candidates;

  // Determine candidateType for API calls
  const candidateTypeForTab = activeTab === 'approved' ? 'Product' : 'Candidate';

  // =========================================================
  // API hooks
  // =========================================================

  // Phases (for R&D stage dropdown)
  const { phases: rdStages } = usePhases();

  // KPIs
  const { kpis, loading: kpisLoading, raw: kpisRaw } = usePortfolioKPIs();

  // GHA summaries (for stat card breakdown)
  const { bubbleData: ghaSummaries, loading: ghaLoading } = useGlobalHealthAreaSummaries(
    activeTab === 'approved' ? ['Product'] : ['Candidate'],
  );

  // Disease summaries (Top 5 diseases)
  const { bubbleData: diseaseBubble, loading: diseasesLoading } = useDiseaseSummaries(
    activeTab === 'approved' ? ['Product'] : activeTab === 'trials' ? ['Candidate', 'Product'] : ['Candidate'],
  );

  const top5Diseases = useMemo(() => {
    if (!diseaseBubble?.length) return [];
    const sorted = [...diseaseBubble].sort((a, b) => b.value - a.value);
    return sorted.slice(0, 5).map((d) => ({
      name: d.name,
      value: d.value,
      gha: d.group,
    }));
  }, [diseaseBubble]);

  // Product distribution (Top 5 products)
  const { chartData: productChartData, loading: productsLoading } = useProductDistribution(
    null, null, null, null, null,
    activeTab === 'approved' ? 'Product' : activeTab === 'trials' ? undefined : 'Candidate',
  );

  const top5Products = useMemo(() => {
    if (!productChartData?.length) return [];
    return [...productChartData].sort((a, b) => b.value - a.value).slice(0, 5);
  }, [productChartData]);

  // Regulatory distribution (Approved tab)
  const {
    approvalStatus: approvalStatusData,
    whoPrequalification: whoPrequalData,
    approvingAuthorities: approvingAuthoritiesData,
    loading: regulatoryLoading,
  } = useRegulatoryDistribution();

  // Clinical trial stats (Trials tab)
  const {
    totalTrials,
    statusDistribution: trialStatusData,
    ageGroupDistribution: ageGroupsData,
    loading: trialsStatsLoading,
  } = useClinicalTrialStats();

  // Geographic distribution (Trials tab)
  const { mapData: clinicalTrialsMapData, loading: geoLoading } = useGeographicDistribution(
    'Trial Location',
    mapTrialStatus.length > 0 ? mapTrialStatus : null,
  );

  // Technology type distribution (all products — for cards)
  const {
    tableData: technologyTableDataAll,
    phases: technologyPhases,
    loading: technologyLoading,
  } = useTechnologyTypeDistribution();

  // The actual product name(s) to send to the API: for VCP, use the
  // sub-product when exploring, or all VCP names when at the sub-category view.
  const techFilterProductNames = useMemo(() => {
    if (!selectedProductType) return null;
    if (selectedProductType === VECTOR_CONTROL_CONSOLIDATED_NAME) {
      return vcpSubProduct ? [vcpSubProduct] : VECTOR_CONTROL_PRODUCT_NAMES;
    }
    return [selectedProductType];
  }, [selectedProductType, vcpSubProduct]);

  // Technology type distribution for selected product (for chart)
  const {
    tableData: technologyTableDataFiltered,
    loading: technologyFilteredLoading,
  } = useTechnologyTypeDistribution(
    null, null, null,
    techFilterProductNames,
    null, null,
  );

  // =========================================================
  // Table data (DataTable with server-side pagination)
  // =========================================================

  const candidatesColumnFilters = useMemo(() => {
    const base = toColumnFilters(candidatesFilters) || [];
    const extra = [];
    if (candidatesSearch.trim()) extra.push({ column: 'candidate_name', kind: 'TEXT', text: candidatesSearch.trim() });
    if (candidatesStage) extra.push({ column: 'current_rd_stage', kind: 'CATEGORY', values: [candidatesStage] });
    const merged = [...base, ...extra];
    return merged.length > 0 ? merged : undefined;
  }, [candidatesFilters, candidatesSearch, candidatesStage]);
  const candidatesSortVar = useMemo(() => toColumnSort(candidatesSort), [candidatesSort]);

  const { candidates: candidatesData, totalCount: candidatesTotalCount, hasNextPage: candidatesHasNext, loading: candidatesDataLoading } = usePortfolioCandidates(
    { candidateType: 'Candidate', columnFilters: candidatesColumnFilters },
    ITEMS_PER_PAGE,
    (candidatesPage - 1) * ITEMS_PER_PAGE,
    { sort: candidatesSortVar },
  );

  const approvedColumnFilters = useMemo(() => {
    const base = toColumnFilters(approvedFilters) || [];
    const extra = [];
    if (approvedSearch.trim()) extra.push({ column: 'candidate_name', kind: 'TEXT', text: approvedSearch.trim() });
    if (approvedStage) extra.push({ column: 'current_rd_stage', kind: 'CATEGORY', values: [approvedStage] });
    const merged = [...base, ...extra];
    return merged.length > 0 ? merged : undefined;
  }, [approvedFilters, approvedSearch, approvedStage]);
  const approvedSortVar = useMemo(() => toColumnSort(approvedSort), [approvedSort]);

  const { candidates: approvedData, totalCount: approvedTotalCount, hasNextPage: approvedHasNext, loading: approvedDataLoading } = usePortfolioCandidates(
    { candidateType: 'Product', columnFilters: approvedColumnFilters },
    ITEMS_PER_PAGE,
    (approvedPage - 1) * ITEMS_PER_PAGE,
    { sort: approvedSortVar },
  );

  const trialsColumnFilters = useMemo(() => {
    const base = toColumnFilters(trialsFilters) || [];
    const extra = [];
    if (trialsSearch.trim()) extra.push({ column: 'trial_name', kind: 'TEXT', text: trialsSearch.trim() });
    const merged = [...base, ...extra];
    return merged.length > 0 ? merged : undefined;
  }, [trialsFilters, trialsSearch]);
  const trialsSortVar = useMemo(() => toColumnSort(trialsSort), [trialsSort]);

  const { trials: trialsData, totalCount: trialsTotalCount, hasNextPage: trialsHasNext, loading: trialsDataLoading } = useClinicalTrials(
    { columnFilters: trialsColumnFilters },
    ITEMS_PER_PAGE,
    (trialsPage - 1) * ITEMS_PER_PAGE,
    { sort: trialsSortVar },
  );

  // Tech accordion table: candidates filtered by tech type + disease
  const techAccColumnFilters = useMemo(() => {
    const base = toColumnFilters(techAccFilters) || [];
    const extra = [];
    if (selectedTechType) extra.push({ column: 'technology_type', kind: 'CATEGORY', values: [selectedTechType] });
    if (selectedDisease) extra.push({ column: 'disease_name', kind: 'CATEGORY', values: [selectedDisease] });
    const productForFilter = vcpSubProduct || selectedProductType;
    if (productForFilter) extra.push({ column: 'product_name', kind: 'CATEGORY', values: [productForFilter] });
    return [...base, ...extra].length > 0 ? [...base, ...extra] : undefined;
  }, [techAccFilters, selectedTechType, selectedDisease, selectedProductType]);
  const techAccSortVar = useMemo(() => toColumnSort(techAccSort), [techAccSort]);

  const { candidates: techAccData, totalCount: techAccTotalCount, hasNextPage: techAccHasNext, loading: techAccLoading } = usePortfolioCandidates(
    { columnFilters: techAccColumnFilters },
    ITEMS_PER_PAGE,
    (techAccPage - 1) * ITEMS_PER_PAGE,
    { sort: techAccSortVar, skip: !selectedDisease || !candidatesAccordionOpen },
  );

  // Reset accordion table page when tech type / disease changes
  useEffect(() => {
    setTechAccPage(1);
    setTechAccFilters({});
    setTechAccSort(null);
  }, [selectedTechType, selectedDisease]);

  // =========================================================
  // Column definitions with Explore callbacks
  // =========================================================

  const candidateColumns = useMemo(
    () => buildCandidateColumns({
      onExplore: (row) => { setSlideInOpen('candidate'); setSlideInKey(row.candidate_key); },
    }),
    [setSlideInOpen, setSlideInKey],
  );

  const techAccColumns = useMemo(
    () => buildCandidateColumns({
      onExplore: (row) => { setSlideInOpen('candidate'); setSlideInKey(row.candidate_key); },
    }),
    [setSlideInOpen, setSlideInKey],
  );

  const approvedColumns = useMemo(
    () => buildApprovedProductColumns({
      onExplore: (row) => { setSlideInOpen('product'); setSlideInKey(row.candidate_key); },
    }),
    [setSlideInOpen, setSlideInKey],
  );

  const trialColumns = useMemo(
    () => buildClinicalTrialColumns({
      onExplore: (row) => { setSlideInOpen('trial'); setSlideInKey(row.trial_id); },
    }),
    [setSlideInOpen, setSlideInKey],
  );

  // =========================================================
  // Stat cards from API data
  // =========================================================

  const statCards = useMemo(() => {
    const total = activeTab === 'approved'
      ? kpisRaw?.approvedProducts ?? 0
      : activeTab === 'trials'
        ? totalTrials ?? 0
        : kpisRaw?.totalCandidates ?? 0;

    const totalLabel = activeTab === 'approved' ? 'Total approved products'
      : activeTab === 'trials' ? 'Total clinical trials'
        : 'Total candidates';

    const ghaCards = (ghaSummaries || []).map((g, i) => {
      const count = activeTab === 'approved' ? g.productCount : g.candidateCount;
      const pct = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
      return {
        title: g.global_health_area ? displayHealthArea(g.global_health_area) : g.name,
        value: count,
        percentage: pct,
        color: STAT_CARD_COLORS[i % STAT_CARD_COLORS.length],
      };
    });

    return [{ title: totalLabel, value: total, percentage: null }, ...ghaCards];
  }, [activeTab, kpisRaw, totalTrials, ghaSummaries]);

  // =========================================================
  // Technology tab: product type cards from tech distribution
  // =========================================================

  // Build product type cards: consolidate VCP sub-types into one card
  const productTypeCards = useMemo(() => {
    if (!productChartData?.length) return [];
    let vcpTotal = 0;
    const rest = [];
    for (const p of productChartData) {
      if (VECTOR_CONTROL_PRODUCT_NAMES.includes(p.name)) {
        vcpTotal += p.value;
      } else {
        rest.push({ name: p.name, candidates: p.value });
      }
    }
    if (vcpTotal > 0) {
      rest.push({ name: VECTOR_CONTROL_CONSOLIDATED_NAME, candidates: vcpTotal });
    }
    return rest.sort((a, b) => b.candidates - a.candidates);
  }, [productChartData]);

  // VCP sub-category cards
  const vcpSubCategories = useMemo(() => {
    if (!productChartData?.length) return [];
    return productChartData
      .filter((p) => VECTOR_CONTROL_PRODUCT_NAMES.includes(p.name))
      .map((p) => ({ name: p.name, candidates: p.value }))
      .sort((a, b) => b.candidates - a.candidates);
  }, [productChartData]);

  const isVcpSelected = selectedProductType === VECTOR_CONTROL_CONSOLIDATED_NAME;

  // Auto-select first product type card when data loads
  useEffect(() => {
    if (productTypeCards.length > 0 && !selectedProductType) {
      setSelectedProductType(productTypeCards[0].name);
    }
  }, [productTypeCards, selectedProductType]);

  // Tech data for the selected product (or all if none selected)
  const techChartData = useMemo(() => {
    const source = selectedProductType ? technologyTableDataFiltered : technologyTableDataAll;
    if (!source?.length) return [];
    return source;
  }, [selectedProductType, technologyTableDataFiltered, technologyTableDataAll]);

  // Count of tech types for the selected product
  const selectedProductTechCount = techChartData.length;
  const selectedProductCandidateTotal = useMemo(() => {
    return techChartData.reduce((sum, row) => {
      return sum + Object.entries(row).reduce(
        (s, [key, val]) => (key !== 'technology_type' && key !== 'name' ? s + (val || 0) : s), 0
      );
    }, 0);
  }, [techChartData]);

  const techPhases = useMemo(() => {
    if (technologyPhases?.length) return technologyPhases;
    return TECH_PHASES;
  }, [technologyPhases]);

  // Disease coverage for selected tech type (from disease summaries filtered)
  const diseaseCoverageData = useMemo(() => {
    if (!selectedTechType || !diseaseBubble?.length) return [];
    // Use top diseases as coverage placeholder — real API would filter by tech type
    return diseaseBubble
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map((d) => ({ name: d.name, value: d.value, gha: d.group }));
  }, [selectedTechType, diseaseBubble]);

  // Approving authorities chart data
  const authChartData = useMemo(() => {
    if (!approvingAuthoritiesData?.length) return [];
    return approvingAuthoritiesData.map((a) => ({
      name: a.category,
      'No formal WHO listing': a.no_who_listing,
      'WHO prequalified': a.who_prequalified,
    }));
  }, [approvingAuthoritiesData]);

  // Add colors to status/age data for charts
  const STATUS_COLORS = ['#54A5C4', '#F0B456', '#fe7449', '#6AB085', '#AD5133', '#B28FC9'];
  const AGE_COLORS = ['#f9a78d', '#54a5c4', '#fe7449', '#CBAFDE', '#f0b456', '#B28FC9'];

  const coloredTrialStatus = useMemo(() =>
    (trialStatusData || []).map((d, i) => ({ ...d, color: STATUS_COLORS[i % STATUS_COLORS.length] })),
    [trialStatusData],
  );

  const coloredAgeGroups = useMemo(() =>
    (ageGroupsData || []).map((d, i) => ({ ...d, color: AGE_COLORS[i % AGE_COLORS.length] })),
    [ageGroupsData],
  );

  const coloredApprovalStatus = useMemo(() =>
    (approvalStatusData || []).map((d, i) => ({ ...d, color: STATUS_COLORS[i % STATUS_COLORS.length] })),
    [approvalStatusData],
  );

  const coloredWhoPrequal = useMemo(() =>
    (whoPrequalData || []).map((d) => ({
      ...d,
      color: d.name === 'Yes' || d.name === 'yes' ? '#fe7449' : '#e3d6c1',
    })),
    [whoPrequalData],
  );

  // Filter context for DataTable category filters
  const candidatesFilterContext = useMemo(() => ({
    candidate_type: 'Candidate',
    column_filters: candidatesColumnFilters,
  }), [candidatesColumnFilters]);

  const approvedFilterContext = useMemo(() => ({
    candidate_type: 'Product',
    column_filters: approvedColumnFilters,
  }), [approvedColumnFilters]);

  const trialsFilterContext = useMemo(() => ({
    column_filters: trialsColumnFilters,
  }), [trialsColumnFilters]);

  const techAccFilterContext = useMemo(() => ({
    column_filters: techAccColumnFilters,
  }), [techAccColumnFilters]);

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
                  Explore detailed analytics across candidates, approved products, clinical trials, and technology types in the global health R&D pipeline.
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
            onChange={(v) => setActiveTab(v)}
            className="mb-6"
          />

          {/* Stat Cards (hidden on technology tab) */}
          {activeTab !== 'technology' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {statCards.map((card) => (
                <div key={card.title} className="bg-white border border-gray-200 p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-black">{card.title}</h3>
                    <span className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 text-xs cursor-pointer">i</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[40px] font-extrabold text-black leading-tight" style={{ fontFamily: 'var(--font-align), system-ui, sans-serif' }}>
                      {(kpisLoading || ghaLoading) ? '...' : (card.value ?? 0).toLocaleString()}
                    </span>
                    {card.percentage !== null && !kpisLoading && (
                      <MiniDonut percentage={card.percentage} color={card.color} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Two bar charts side by side (hidden on technology tab) */}
          {activeTab !== 'technology' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Top 5 diseases */}
              <div className="bg-white border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="text-base sm:text-lg font-bold text-black">{labels.disease}</h3>
                  <ChartMenu
                    onDownloadCSV={() => {
                      const columns = [
                        { label: 'Disease', accessor: 'name' },
                        { label: 'Count', accessor: 'value' },
                        { label: 'Global Health Area', accessor: 'gha' },
                      ];
                      const csv = buildCSV(columns, top5Diseases);
                      downloadCSV(csv, 'top-5-diseases');
                    }}
                    onDownloadPNG={() => downloadPNG(diseasesChartRef, 'top-5-diseases')}
                  />
                </div>
                <p className="text-sm text-gray-500 mb-4">Lorem ipsum dolor sit amet consectetur.</p>
                <div ref={diseasesChartRef}>
                  {diseasesLoading ? (
                    <div className="h-[260px] flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading...</div></div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={top5Diseases} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 12 }} label={{ value: 'Number of candidates', position: 'insideBottom', offset: -10, fontSize: 12, fill: '#666' }} />
                          <YAxis type="category" dataKey="name" width={180} tick={{ fontSize: 11 }} />
                          <Tooltip content={<BarTooltip />} />
                          <Bar dataKey="value" barSize={20} radius={[0, 4, 4, 0]}>
                            {top5Diseases.map((entry) => (
                              <Cell key={entry.name} fill={GHA_COLORS[entry.gha] || '#B28FC9'} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap items-center gap-4 mt-3">
                        {Object.entries(GHA_COLORS).map(([label, color]) => (
                          <div key={label} className="flex items-center gap-1.5 text-xs text-gray-600">
                            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                            {label}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Top 5 product types */}
              <div className="bg-white border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="text-base sm:text-lg font-bold text-black">{labels.product}</h3>
                  <ChartMenu
                    onDownloadCSV={() => {
                      const columns = [{ label: 'Product type', accessor: 'name' }, { label: 'Count', accessor: 'value' }];
                      const csv = buildCSV(columns, top5Products);
                      downloadCSV(csv, 'top-5-product-types');
                    }}
                    onDownloadPNG={() => downloadPNG(productsChartRef, 'top-5-product-types')}
                  />
                </div>
                <p className="text-sm text-gray-500 mb-4">Lorem ipsum dolor sit amet consectetur.</p>
                <div ref={productsChartRef}>
                  {productsLoading ? (
                    <div className="h-[260px] flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading...</div></div>
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={top5Products} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 12 }} label={{ value: 'Number of candidates', position: 'insideBottom', offset: -10, fontSize: 12, fill: '#666' }} />
                        <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                        <Tooltip content={<BarTooltip />} />
                        <Bar dataKey="value" fill="#fe7449" barSize={20} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Approved Products extra charts */}
          {activeTab === 'approved' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Approval status */}
              <div className="bg-white border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-bold text-black">Approval status</h3>
                  <ChartMenu onDownloadPNG={() => downloadPNG(approvalStatusRef, 'approval-status')} />
                </div>
                <div ref={approvalStatusRef}>
                  {regulatoryLoading ? (
                    <div className="h-[220px] flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading...</div></div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={coloredApprovalStatus} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip content={<BarTooltip />} />
                          <Bar dataKey="value" barSize={28}>
                            {coloredApprovalStatus.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        {coloredApprovalStatus.map((d) => (
                          <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
                            {d.name}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Approving Authorities */}
              <div className="bg-white border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-bold text-black">Approving Authorities</h3>
                  <ChartMenu onDownloadPNG={() => downloadPNG(authoritiesRef, 'approving-authorities')} />
                </div>
                <div ref={authoritiesRef}>
                  {regulatoryLoading ? (
                    <div className="h-[220px] flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading...</div></div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={authChartData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
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
                    </>
                  )}
                </div>
              </div>

              {/* WHO prequalification */}
              <div className="bg-white border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-base sm:text-lg font-bold text-black">WHO prequalification</h3>
                  <ChartMenu onDownloadPNG={() => downloadPNG(whoPrequalRef, 'who-prequalification')} />
                </div>
                <div ref={whoPrequalRef}>
                  {regulatoryLoading ? (
                    <div className="h-[220px] flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading...</div></div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie data={coloredWhoPrequal} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={2}>
                            {coloredWhoPrequal.map((entry) => (
                              <Cell key={entry.name} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<DonutTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex items-center justify-center gap-4 mt-3">
                        {coloredWhoPrequal.map((d) => (
                          <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
                            {d.name}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Clinical Trials extra charts */}
          {activeTab === 'trials' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Age groups */}
                <div className="bg-white border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-base sm:text-lg font-bold text-black">Age groups in clinical trials</h3>
                    <ChartMenu onDownloadPNG={() => downloadPNG(ageGroupsRef, 'age-groups')} />
                  </div>
                  <div ref={ageGroupsRef}>
                    {trialsStatsLoading ? (
                      <div className="h-[260px] flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading...</div></div>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height={260}>
                          <PieChart>
                            <Pie data={coloredAgeGroups} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={2}>
                              {coloredAgeGroups.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<DonutTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
                          {coloredAgeGroups.map((d) => (
                            <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
                              {d.name}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Trial status */}
                <div className="bg-white border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-base sm:text-lg font-bold text-black">Clinical trial status</h3>
                    <ChartMenu onDownloadPNG={() => downloadPNG(trialStatusRef, 'trial-status')} />
                  </div>
                  <div ref={trialStatusRef}>
                    {trialsStatsLoading ? (
                      <div className="h-[260px] flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading...</div></div>
                    ) : (
                      <>
                        <ResponsiveContainer width="100%" height={260}>
                          <BarChart data={coloredTrialStatus} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip content={<BarTooltip />} />
                            <Bar dataKey="value" barSize={32}>
                              {coloredTrialStatus.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          {coloredTrialStatus.map((d) => (
                            <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                              <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
                              {d.name}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Geographic distribution */}
              <div className="bg-white border border-gray-200 p-4 mb-6">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="text-base sm:text-lg font-bold text-black">Geographic distribution of clinical trials</h3>
                  <div className="flex-1" />
                  <div className="min-w-[160px]">
                    <Dropdown
                      value={mapTrialStatus}
                      onChange={setMapTrialStatus}
                      options={(trialStatusData || []).map((s) => ({ value: s.name, label: s.name }))}
                      placeholder="All"
                      multiSelect
                      showSearch={false}
                      compact
                    />
                  </div>
                  <ChartMenu onDownloadPNG={() => downloadPNG(geoMapRef, 'geographic-distribution-trials')} />
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  The spatial heat map shows the country-level distribution of clinical trials, with darker shades indicating countries with higher number of studies, and can be filtered by clinical trial status.
                </p>
                <div ref={geoMapRef}>
                  {geoLoading ? (
                    <div className="h-[320px] flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading map...</div></div>
                  ) : (
                    <WorldMap data={clinicalTrialsMapData || []} height={320} showLegend={false} />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-3">Source: World Bank Official Boundaries</p>
              </div>
            </>
          )}

          {/* Technology Types tab */}
          {activeTab === 'technology' && (
            <>
              <div className="bg-white border border-gray-200 p-4 mb-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base sm:text-lg font-bold text-black">Product types and their technologies</h3>
                    <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">
                      {selectedProductCandidateTotal} candidates
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-6">
                  This matrix grid shows the technology types for which candidates are being developed against the R&D stages. It provides an overview of the portfolio&apos;s progress for each technology type.
                </p>

                {/* Product type cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-6">
                  {productTypeCards.map((pt) => {
                    const isSelected = selectedProductType === pt.name;
                    return (
                      <button
                        key={pt.name}
                        onClick={() => {
                          setSelectedProductType(pt.name);
                          setVcpSubProduct(null);
                          setSelectedTechType(null);
                          setCoverageOpen(false);
                          setSelectedDisease(null);
                          setCandidatesAccordionOpen(false);
                        }}
                        className="p-4 text-left transition-colors cursor-pointer"
                        style={{
                          borderRadius: 0,
                          border: '1px solid #26262629',
                          borderLeft: isSelected ? '3px solid #fe7449' : '1px solid #26262629',
                          background: isSelected ? '#FEF0EC' : '#fff',
                        }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-sm text-black">{pt.name}</span>
                          <span
                            className="flex items-center justify-center flex-shrink-0 rounded-full"
                            style={{
                              width: 20,
                              height: 20,
                              border: isSelected ? '2px solid #fe7449' : '2px solid #26262652',
                              background: isSelected ? '#fe7449' : 'transparent',
                            }}
                          >
                            {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                          </span>
                        </div>
                        <div className="text-[32px] font-extrabold text-black leading-tight" style={{ fontFamily: 'var(--font-align), system-ui, sans-serif' }}>
                          {pt.candidates}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Candidates
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Tech type stacked bar chart OR VCP sub-categories */}
                <div className="border-t border-gray-200 pt-4">
                  {/* VCP sub-category cards (when VCP selected and no sub-product explored) */}
                  {isVcpSelected && !vcpSubProduct ? (
                    <>
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-base sm:text-lg font-bold text-black">Vector Control Products - Sub-categories</h4>
                        <div className="flex-1" />
                        <ChartMenu onDownloadPNG={() => downloadPNG(techChartRef, 'vcp-sub-categories')} />
                      </div>
                      <p className="text-sm text-gray-500 mb-4">Select a category to explore its technology breakdown</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {vcpSubCategories.map((sub) => (
                          <div key={sub.name} className="border border-gray-200 p-4 flex flex-col">
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-semibold text-sm text-black">{sub.name}</span>
                              <span className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 text-xs cursor-pointer">i</span>
                            </div>
                            <div className="text-[32px] font-extrabold text-black leading-tight" style={{ fontFamily: 'var(--font-align), system-ui, sans-serif' }}>
                              {sub.candidates}
                            </div>
                            <div className="mt-auto pt-3">
                              <button
                                onClick={() => {
                                  setVcpSubProduct(sub.name);
                                  setSelectedTechType(null);
                                  setCoverageOpen(false);
                                  setSelectedDisease(null);
                                  setCandidatesAccordionOpen(false);
                                }}
                                className="w-full py-2 text-sm font-medium text-black border border-gray-300 hover:bg-gray-50 transition-colors"
                              >
                                Explore
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-base sm:text-lg font-bold text-black">
                          {isVcpSelected && vcpSubProduct
                            ? `Vector Control Products - ${vcpSubProduct}`
                            : selectedProductType || 'All'}
                        </h4>
                        {selectedProductType && (
                          <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">
                            {selectedProductCandidateTotal} candidates
                          </span>
                        )}
                        <div className="flex-1" />
                        {isVcpSelected && vcpSubProduct && (
                          <button
                            onClick={() => {
                              setVcpSubProduct(null);
                              setSelectedTechType(null);
                              setCoverageOpen(false);
                              setSelectedDisease(null);
                              setCandidatesAccordionOpen(false);
                            }}
                            className="text-sm font-medium text-[#E76A42] hover:underline cursor-pointer"
                          >
                            Back to VCP
                          </button>
                        )}
                        <ChartMenu onDownloadPNG={() => downloadPNG(techChartRef, 'technology-types')} />
                      </div>
                      <p className="text-sm text-gray-500 mb-4">
                        This visualization tracks the evolution of the global pipeline over time. It is showing how candidates have successfully progressed through clinical phases toward market readiness. In the make custom comparison page, it is possible to set up your own comparison of a pipeline over time, or between two or more diseases.
                      </p>

                      <div className="flex flex-wrap items-center gap-4 mb-4">
                        {techPhases.map((p) => (
                          <label key={p.key} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.color }} />
                            {p.label}
                          </label>
                        ))}
                      </div>

                      <div ref={techChartRef}>
                        {(technologyLoading || technologyFilteredLoading) ? (
                          <div className="h-[300px] flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading...</div></div>
                        ) : (
                          <ResponsiveContainer width="100%" height={Math.max(300, (techChartData?.length || 3) * 36)}>
                            <BarChart data={techChartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 20 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                              <XAxis type="number" tick={{ fontSize: 12 }} label={{ value: 'Number of candidates and approved products', position: 'insideBottom', offset: -10, fontSize: 12, fill: '#666' }} />
                              <YAxis type="category" dataKey="technology_type" width={200} tick={{ fontSize: 11 }} />
                              <Tooltip content={<BarTooltip />} />
                              {techPhases.map((p) => (
                                <Bar
                                  key={p.key}
                                  dataKey={p.key}
                                  stackId="a"
                                  fill={p.color}
                                  barSize={18}
                                  cursor="pointer"
                                  onClick={(data) => {
                                    setSelectedTechType(data?.technology_type || data?.name || null);
                                    setCoverageOpen(true);
                                    setSelectedDisease(null);
                                    setTimeout(() => accordionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                                setCandidatesAccordionOpen(false);
                              }}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Accordions */}
              <div ref={accordionRef} className="mt-6 border border-gray-200 divide-y divide-gray-200 bg-white">
                {/* Coverage across diseases */}
                <div>
                  <button
                    onClick={() => setCoverageOpen(!coverageOpen)}
                    className="w-full flex items-center justify-between px-6 py-5 transition-colors" style={{ backgroundColor: '#F9F9FA' }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold text-black">Coverage across diseases</span>
                      {selectedTechType && <span className="text-sm font-medium text-[#E76A42]">{selectedTechType}</span>}
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${coverageOpen ? 'rotate-45' : ''}`}>
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                  {coverageOpen && (
                    <div className="px-6 pb-6 pt-4">
                      {selectedTechType ? (
                        <>
                          <div className="flex items-center gap-3 mb-4">
                            <h4 className="text-lg font-bold text-black">
                              {[vcpSubProduct || selectedProductType, selectedTechType].filter(Boolean).join(' | ')}
                            </h4>
                            <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">
                              {diseaseCoverageData.reduce((s, d) => s + d.value, 0)} candidates
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 mb-4">
                            This visualization tracks the evolution of the global pipeline over time. It is showing how candidates have successfully progressed through clinical phases toward market readiness. In the make custom comparison page, it is possible to set up your own comparison of a pipeline over time, or between two or more diseases.
                          </p>
                          <ResponsiveContainer width="100%" height={Math.max(180, (diseaseCoverageData?.length || 3) * 44)}>
                            <BarChart data={diseaseCoverageData} layout="vertical" margin={{ left: 120, right: 20, top: 5, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                              <XAxis type="number" tick={{ fontSize: 12 }} />
                              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={120} />
                              <Tooltip />
                              <Bar dataKey="value" barSize={16} radius={[0, 4, 4, 0]} cursor="pointer"
                                onClick={(data) => { setSelectedDisease(data?.name || null); setCandidatesAccordionOpen(true); }}
                              >
                                {diseaseCoverageData.map((entry) => (
                                  <Cell key={entry.name} fill={GHA_COLORS[entry.gha] || '#B28FC9'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                          <div className="flex items-center gap-4 mt-2">
                            {Object.entries(GHA_COLORS).map(([label, color]) => (
                              <div key={label} className="flex items-center gap-1.5 text-xs text-gray-600">
                                <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                                {label}
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="py-8 text-center text-gray-400">
                          Select a technology type from the bar chart above to see disease coverage.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Candidates and approved products */}
                <div>
                  <button
                    onClick={() => setCandidatesAccordionOpen(!candidatesAccordionOpen)}
                    className="w-full flex items-center justify-between px-6 py-5 transition-colors" style={{ backgroundColor: '#F9F9FA' }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold text-black">Candidates and approved products</span>
                      {selectedDisease && <span className="text-sm font-medium text-[#E76A42]">{selectedDisease}</span>}
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${candidatesAccordionOpen ? 'rotate-45' : ''}`}>
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                  {candidatesAccordionOpen && (
                    <div className="px-6 pb-6 pt-4">
                      {selectedDisease ? (
                        <>
                          <div className="flex items-center gap-3 mb-4">
                            <h4 className="text-lg font-bold text-black">
                              {[vcpSubProduct || selectedProductType, selectedTechType, selectedDisease].filter(Boolean).join(' | ')}
                            </h4>
                            <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">
                              {techAccTotalCount} candidates
                            </span>
                          </div>
                          <DataTable
                            tableId="ai-tech-accordion"
                            graphqlTable="PORTFOLIO_CANDIDATES"
                            filterContext={techAccFilterContext}
                            columns={techAccColumns}
                            data={techAccData || []}
                            rowKey="candidate_key"
                            page={techAccPage}
                            onPageChange={setTechAccPage}
                            totalCount={techAccTotalCount}
                            hasNextPage={techAccHasNext}
                            itemsPerPage={ITEMS_PER_PAGE}
                            loading={techAccLoading}
                            filters={techAccFilters}
                            onFiltersChange={(next) => { setTechAccFilters(next); setTechAccPage(1); }}
                            sort={techAccSort}
                            onSortChange={(next) => { setTechAccSort(next); setTechAccPage(1); }}
                            visibleColumns={techAccVisibleCols}
                            onVisibleColumnsChange={setTechAccVisibleCols}
                            emptyState={{ title: 'No candidates found', description: 'No candidates match the selected technology type and disease.' }}
                          />
                        </>
                      ) : (
                        <div className="py-8 text-center text-gray-400">
                          Select a disease from the coverage chart above to see candidates and approved products.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* DataTable: Candidates */}
          {activeTab === 'candidates' && (
            <div className="bg-white border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-black">Candidates</h3>
                <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">{candidatesTotalCount.toLocaleString()}</span>
                <div className="flex-1" />
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input
                    type="text"
                    placeholder="Search item"
                    value={candidatesSearch}
                    onChange={(e) => { setCandidatesSearch(e.target.value); setCandidatesPage(1); }}
                    className="pl-9 pr-3 py-2 border border-gray-300 text-sm w-[200px] focus:outline-none focus:border-gray-400"
                  />
                </div>
                <div className="min-w-[160px]">
                  <Dropdown
                    value={candidatesStage}
                    onChange={(val) => { setCandidatesStage(val); setCandidatesPage(1); }}
                    options={rdStages.map((s) => ({ value: s.name, label: s.name }))}
                    placeholder="R&D stage"
                    showSearch={false}
                    compact
                  />
                </div>
              </div>
              <DataTable
                tableId="ai-candidates"
                graphqlTable="PORTFOLIO_CANDIDATES"
                filterContext={candidatesFilterContext}
                columns={candidateColumns}
                data={candidatesData || []}
                rowKey="candidate_key"
                page={candidatesPage}
                onPageChange={setCandidatesPage}
                totalCount={candidatesTotalCount}
                hasNextPage={candidatesHasNext}
                itemsPerPage={ITEMS_PER_PAGE}
                loading={candidatesDataLoading}
                filters={candidatesFilters}
                onFiltersChange={(next) => { setCandidatesFilters(next); setCandidatesPage(1); }}
                sort={candidatesSort}
                onSortChange={(next) => { setCandidatesSort(next); setCandidatesPage(1); }}
                visibleColumns={candidatesVisibleCols}
                onVisibleColumnsChange={setCandidatesVisibleCols}
                emptyState={{ title: 'No candidates found' }}
              />
            </div>
          )}

          {/* DataTable: Approved Products */}
          {activeTab === 'approved' && (
            <div className="bg-white border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-black">Approved products</h3>
                <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">{approvedTotalCount.toLocaleString()}</span>
                <div className="flex-1" />
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input
                    type="text"
                    placeholder="Search item"
                    value={approvedSearch}
                    onChange={(e) => { setApprovedSearch(e.target.value); setApprovedPage(1); }}
                    className="pl-9 pr-3 py-2 border border-gray-300 text-sm w-[200px] focus:outline-none focus:border-gray-400"
                  />
                </div>
              </div>
              <DataTable
                tableId="ai-approved"
                graphqlTable="PORTFOLIO_CANDIDATES"
                filterContext={approvedFilterContext}
                columns={approvedColumns}
                data={approvedData || []}
                rowKey="candidate_key"
                page={approvedPage}
                onPageChange={setApprovedPage}
                totalCount={approvedTotalCount}
                hasNextPage={approvedHasNext}
                itemsPerPage={ITEMS_PER_PAGE}
                loading={approvedDataLoading}
                filters={approvedFilters}
                onFiltersChange={(next) => { setApprovedFilters(next); setApprovedPage(1); }}
                sort={approvedSort}
                onSortChange={(next) => { setApprovedSort(next); setApprovedPage(1); }}
                visibleColumns={approvedVisibleCols}
                onVisibleColumnsChange={setApprovedVisibleCols}
                emptyState={{ title: 'No approved products found' }}
              />
            </div>
          )}

          {/* DataTable: Clinical Trials */}
          {activeTab === 'trials' && (
            <div className="bg-white border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-black">Clinical trials</h3>
                <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">{trialsTotalCount.toLocaleString()}</span>
                <div className="flex-1" />
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                  <input
                    type="text"
                    placeholder="Search item"
                    value={trialsSearch}
                    onChange={(e) => { setTrialsSearch(e.target.value); setTrialsPage(1); }}
                    className="pl-9 pr-3 py-2 border border-gray-300 text-sm w-[200px] focus:outline-none focus:border-gray-400"
                  />
                </div>
              </div>
              <DataTable
                tableId="ai-trials"
                graphqlTable="CLINICAL_TRIALS"
                filterContext={trialsFilterContext}
                columns={trialColumns}
                data={trialsData || []}
                rowKey="trial_id"
                page={trialsPage}
                onPageChange={setTrialsPage}
                totalCount={trialsTotalCount}
                hasNextPage={trialsHasNext}
                itemsPerPage={ITEMS_PER_PAGE}
                loading={trialsDataLoading}
                filters={trialsFilters}
                onFiltersChange={(next) => { setTrialsFilters(next); setTrialsPage(1); }}
                sort={trialsSort}
                onSortChange={(next) => { setTrialsSort(next); setTrialsPage(1); }}
                visibleColumns={trialsVisibleCols}
                onVisibleColumnsChange={setTrialsVisibleCols}
                emptyState={{ title: 'No clinical trials found' }}
              />
            </div>
          )}
        </div>
      </main>

      {/* Slide-in panels */}
      {slideInOpen === 'candidate' && slideInKey != null && (
        <CandidateSlideIn candidateKey={slideInKey} onClose={closeSlideIn} />
      )}
      {slideInOpen === 'product' && slideInKey != null && (
        <ProductSlideIn candidateKey={slideInKey} onClose={closeSlideIn} />
      )}
      {slideInOpen === 'trial' && slideInKey != null && (
        <TrialSlideIn trialId={slideInKey} onClose={closeSlideIn} />
      )}
    </div>
  );
}
