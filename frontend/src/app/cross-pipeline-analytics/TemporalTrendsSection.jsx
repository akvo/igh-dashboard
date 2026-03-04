'use client';

import { useState, useMemo } from 'react';
import { Dropdown, ChartMenu, TabNav, Table } from '@/components/ui';
import { RefreshIcon } from '@/components/icons';
import { StackedBarChart, GroupedBarChart } from '@/components/charts';
import { useTemporalSnapshots } from '@/graphql/hooks';
import {
  aggregateTemporalPhases,
  computeGrowthTable,
  AGGREGATE_STAGE_LABELS,
  AGGREGATE_STAGE_COLORS,
} from '@/lib/transformations';

// Year colors — deliberately distinct from the stage colors
// (earlyDev=#FE7449, lateDev=#B28FC9, approved=#F0B456) used in
// the stacked bar chart above, so the two charts read differently.
const YEAR_COLORS = [
  '#AD5133',
  '#FE7449',
  '#F9A78D',
  '#8c4028',
  '#CC9949',
  '#e3d6c1',
];

const PORTFOLIO_LABELS = ['Portfolio A', 'Portfolio B', 'Portfolio C', 'Portfolio D'];

const STAGE_SERIES = [
  { key: 'approved', label: 'Approved', color: '#F0B456' },
  { key: 'lateDevelopment', label: 'Late development', color: '#B28FC9' },
  { key: 'earlyDevelopment', label: 'Early development', color: '#FE7449' },
];

// Dummy data for compare tab (placeholder until API is wired)
const DUMMY_COMPARE_CHART_DATA = [
  {
    category: 'Portfolio A',
    discovery: 35, preclinical: 45, phase_i: 30, phase_ii: 60, phase_iii: 50, approved: 30,
  },
  {
    category: 'Portfolio B',
    discovery: 40, preclinical: 50, phase_i: 35, phase_ii: 55, phase_iii: 45, approved: 25,
  },
  {
    category: 'Portfolio C',
    discovery: 10, preclinical: 15, phase_i: 8, phase_ii: 12, phase_iii: 10, approved: 5,
  },
];

const DUMMY_COMPARE_PHASES = [
  { key: 'discovery', label: 'Discovery', color: '#AD5133' },
  { key: 'preclinical', label: 'Pre-clinical', color: '#FE7449' },
  { key: 'phase_i', label: 'Phase 1', color: '#F9A78D' },
  { key: 'phase_ii', label: 'Phase 2', color: '#B28FC9' },
  { key: 'phase_iii', label: 'Phase 3', color: '#CBAFDE' },
  { key: 'approved', label: 'Approved', color: '#F0B456' },
];

const DUMMY_COMPARE_TABLE = [
  { id: 'early', phase: 'Early development', portfolioA: 20, portfolioALabel: 'candidates', portfolioB: 30, portfolioBLabel: 'candidates', portfolioC: 45, portfolioCLabel: 'candidates', total: 95, totalLabel: 'Candidates' },
  { id: 'late', phase: 'Late development', portfolioA: 34, portfolioALabel: 'candidates', portfolioB: 12, portfolioBLabel: 'candidates', portfolioC: 34, portfolioCLabel: 'candidates', total: 80, totalLabel: 'Candidates' },
  { id: 'approved', phase: 'Approved products', portfolioA: 34, portfolioALabel: 'Products', portfolioB: 41, portfolioBLabel: 'Products', portfolioC: 21, portfolioCLabel: 'Products', total: 96, totalLabel: 'Products' },
  { id: 'total', phase: 'Total', portfolioA: 88, portfolioALabel: '', portfolioB: 83, portfolioBLabel: '', portfolioC: 100, portfolioCLabel: '', total: 271, totalLabel: '' },
];

const DUMMY_ACROSS_CHART_DATA = [
  { category: '2023', earlyDevelopment: 200, lateDevelopment: 80, approved: 10, group: 'Covid 19' },
  { category: '2025', earlyDevelopment: 95, lateDevelopment: 75, approved: 0, group: 'Covid 19' },
  { category: '2019', earlyDevelopment: 0, lateDevelopment: 70, approved: 0, group: 'Malaria' },
  { category: '2023', earlyDevelopment: 190, lateDevelopment: 80, approved: 30, group: 'Malaria' },
  { category: '2025', earlyDevelopment: 150, lateDevelopment: 90, approved: 40, group: 'Malaria' },
  { category: '2025', earlyDevelopment: 10, lateDevelopment: 5, approved: 2, group: 'Mpox' },
];

const tabs = [
  { value: 'single', label: 'Compare a single portfolio over time' },
  { value: 'compare', label: 'Compare different portfolios' },
];

function ComparePortfoliosTab({ diseaseOptions = [], productOptions = [], yearOptions = [] }) {
  const [visibleCount, setVisibleCount] = useState(2);
  const [portfolios, setPortfolios] = useState([
    { disease: '', product: '' },
    { disease: '', product: '' },
    { disease: '', product: '' },
    { disease: '', product: '' },
  ]);
  const [compareYear, setCompareYear] = useState('');
  const [appliedPortfolios, setAppliedPortfolios] = useState([]);
  const [appliedCompareYear, setAppliedCompareYear] = useState('');

  // Compare phase checkboxes
  const [comparePhases, setComparePhases] = useState(
    DUMMY_COMPARE_PHASES.map(p => p.key)
  );
  const handleComparePhaseToggle = (key) => {
    setComparePhases(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Across-portfolios stage checkboxes
  const [acrossStages, setAcrossStages] = useState(
    STAGE_SERIES.map(s => s.key)
  );
  const handleAcrossStageToggle = (key) => {
    setAcrossStages(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleDiseaseChange = (index, value) => {
    setPortfolios(prev => {
      const next = [...prev];
      next[index] = { ...next[index], disease: value };
      return next;
    });
  };

  const handleProductChange = (index, value) => {
    setPortfolios(prev => {
      const next = [...prev];
      next[index] = { ...next[index], product: value };
      return next;
    });
  };

  const handleCompareApply = () => {
    const applied = portfolios
      .slice(0, visibleCount)
      .map((p, idx) => ({ ...p, label: PORTFOLIO_LABELS[idx] }))
      .filter(p => p.disease || p.product);
    setAppliedPortfolios(applied);
    setAppliedCompareYear(compareYear);
  };

  const hasCompareFilters = portfolios.some(p => p.disease || p.product) || compareYear !== '';

  const handleCompareClear = () => {
    setPortfolios([
      { disease: '', product: '' },
      { disease: '', product: '' },
      { disease: '', product: '' },
      { disease: '', product: '' },
    ]);
    setCompareYear('');
    setAppliedPortfolios([]);
    setAppliedCompareYear('');
    setVisibleCount(2);
  };

  const handleAddPortfolio = () => {
    setVisibleCount(prev => Math.min(prev + 1, 4));
  };

  const handleRemoveTag = (idx) => {
    setAppliedPortfolios(prev => prev.filter((_, i) => i !== idx));
  };

  // Table columns for compare view — always show 3 portfolios with static data as default
  const portfolioCellClass = (value, row) =>
    row.id !== 'total' ? 'bg-[#FEF0EB]' : '';

  const DEFAULT_PORTFOLIO_COUNT = 3;
  const displayPortfolioCount = Math.max(
    appliedPortfolios.length,
    DEFAULT_PORTFOLIO_COUNT
  );

  const compareTableColumns = useMemo(() => {
    const cols = [
      { accessor: 'phase', header: 'Phase', minWidth: '140px' },
    ];
    for (let idx = 0; idx < displayPortfolioCount; idx++) {
      const label = PORTFOLIO_LABELS[idx] || `Portfolio ${idx + 1}`;
      const accessor = `portfolio_${idx}`;
      cols.push({
        accessor,
        header: label,
        cellClassName: portfolioCellClass,
        render: (value, row) => {
          const sublabel = row[`${accessor}_label`];
          return (
            <div>
              <div className="font-bold text-gray-900 text-base">{value}</div>
              {sublabel && <div className="text-sm text-gray-500 mt-0.5">{sublabel}</div>}
            </div>
          );
        },
      });
    }
    cols.push({
      accessor: 'total',
      header: 'Total',
      cellClassName: portfolioCellClass,
      render: (value, row) => {
        const sublabel = row.total_label;
        return (
          <div>
            <div className="font-bold text-gray-900 text-base">{value}</div>
            {sublabel && <div className="text-sm text-gray-500 mt-0.5">{sublabel}</div>}
          </div>
        );
      },
    });
    return cols;
  }, [displayPortfolioCount]);

  const compareTableData = useMemo(() => {
    const source = DUMMY_COMPARE_TABLE;
    const srcKeys = ['portfolioA', 'portfolioB', 'portfolioC', 'portfolioA'];
    const srcLabels = ['portfolioALabel', 'portfolioBLabel', 'portfolioCLabel', 'portfolioALabel'];
    return source.map(row => {
      const entry = { id: row.id, phase: row.phase, total: row.total, total_label: row.totalLabel };
      for (let idx = 0; idx < displayPortfolioCount; idx++) {
        entry[`portfolio_${idx}`] = row[srcKeys[idx]] ?? '-';
        entry[`portfolio_${idx}_label`] = row[srcLabels[idx]] ?? '';
      }
      return entry;
    });
  }, [displayPortfolioCount]);

  // Build stacked bar chart data for compare view
  const compareChartData = useMemo(() => {
    if (appliedPortfolios.length === 0) return DUMMY_COMPARE_CHART_DATA;
    return appliedPortfolios.map((p, idx) => {
      const src = DUMMY_COMPARE_CHART_DATA[idx] || DUMMY_COMPARE_CHART_DATA[0];
      return { ...src, category: p.label || PORTFOLIO_LABELS[idx] };
    });
  }, [appliedPortfolios]);

  // Build across-portfolios grouped bar data
  const acrossChartData = useMemo(() => {
    const grouped = {};
    DUMMY_ACROSS_CHART_DATA.forEach(item => {
      const key = `${item.group}_${item.category}`;
      if (!grouped[key]) {
        grouped[key] = { category: item.category, group: item.group };
      }
      STAGE_SERIES.forEach(s => {
        grouped[key][s.key] = item[s.key] || 0;
      });
    });
    return Object.values(grouped);
  }, []);

  // Group across chart data by disease for display
  const acrossGroups = useMemo(() => {
    const groups = {};
    acrossChartData.forEach(item => {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    });
    return Object.entries(groups);
  }, [acrossChartData]);

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Compare up to four portfolios&mdash;each defined by a specific combination of disease and product. Examine how their R&amp;D stage distributions differ in a selected year, review the underlying data in table form, and explore temporal trends for each portfolio over time using aggregated R&amp;D stages to identify contrasts in growth and progression.
      </p>

      {/* Portfolio selectors — each has Disease + Product */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 grid grid-cols-2 gap-4">
          {PORTFOLIO_LABELS.slice(0, visibleCount).map((label, idx) => (
            <div
              key={label}
              className="bg-[#F7F7F7] rounded px-5 pt-4 pb-2"
            >
              <div className="flex gap-4">
                <div className="flex-1">
                  <Dropdown
                    label="Disease"
                    value={portfolios[idx].disease}
                    onChange={(val) => handleDiseaseChange(idx, val)}
                    placeholder="All"
                    options={diseaseOptions}
                  />
                </div>
                <div className="flex-1">
                  <Dropdown
                    label="Product"
                    value={portfolios[idx].product}
                    onChange={(val) => handleProductChange(idx, val)}
                    placeholder="All"
                    options={productOptions}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 text-right mt-2 mb-0">{label.toLowerCase()}</p>
            </div>
          ))}
        </div>
        {visibleCount < 4 && (
          <button
            type="button"
            onClick={handleAddPortfolio}
            className="flex items-center justify-center w-11 h-11 rounded-full text-gray-400 bg-gray-100 hover:bg-gray-200 cursor-pointer shrink-0 transition-colors"
            style={{ border: '1px solid #d1d5db' }}
            title="Add portfolio"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2V14M2 8H14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Tags + Year + Clear + Apply — single row */}
      <div className="flex items-end gap-4 pb-6 mb-2 border-b border-gray-200">
        <div className="flex items-center gap-2 flex-wrap flex-1 min-h-[44px]">
          {appliedPortfolios.map((p, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-2 pl-4 pr-3 py-1.5 bg-[#E76A42] text-white text-sm font-medium rounded-full"
            >
              {p.label}
              <button
                type="button"
                onClick={() => handleRemoveTag(idx)}
                className="bg-white/20 hover:bg-white/40 border-none text-white cursor-pointer p-0 leading-none rounded-full w-5 h-5 flex items-center justify-center transition-colors"
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1 1L7 7M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </span>
          ))}
        </div>
        <div className="min-w-[200px]">
          <Dropdown
            label="Year"
            value={compareYear}
            onChange={setCompareYear}
            placeholder="Most recent"
            options={yearOptions}
          />
        </div>
        <button
          onClick={handleCompareClear}
          disabled={!hasCompareFilters}
          className={`flex items-center gap-2 text-sm px-4 h-[44px] whitespace-nowrap shrink-0 border ${
            hasCompareFilters
              ? 'text-[#262626] bg-gray-200 border-gray-300 hover:bg-gray-300 cursor-pointer font-medium'
              : 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed'
          }`}
        >
          Clear
          <RefreshIcon className="w-4 h-4" />
        </button>
        <button
          onClick={handleCompareApply}
          className="flex items-center gap-2 text-sm font-medium text-black bg-orange-500 px-6 hover:bg-black hover:text-white h-[44px] shrink-0 transition-colors"
        >
          Apply
        </button>
      </div>

      {/* Sub-section A: Portfolio comparison by R&D stage */}
      <div className="mb-4 p-4" style={{ border: '1px solid #26262617' }}>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-base font-semibold text-black">
            Portfolio comparison by R&amp;D stage in selected year
          </h4>
          <ChartMenu onDownloadCSV={() => {}} onDownloadPNG={() => {}} />
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Compare up to four portfolios &mdash; each defined by a specific combination of disease and product &mdash; in a single year. View how each portfolio is distributed across R&amp;D stages, choose the year of interest, and use the legend to filter stages in or out to focus the comparison on pipeline components most relevant to the analysis.
        </p>
        <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />

        {/* Phase checkboxes */}
        <div className="flex items-center gap-6 py-4 flex-wrap">
          {DUMMY_COMPARE_PHASES.map(phase => (
            <label key={phase.key} className="flex items-center gap-2 cursor-pointer">
              <span
                onClick={() => handleComparePhaseToggle(phase.key)}
                className={`w-5 h-5 border rounded flex items-center justify-center shrink-0 cursor-pointer ${
                  comparePhases.includes(phase.key)
                    ? 'border-transparent'
                    : 'border-gray-300 bg-white'
                }`}
                style={{
                  backgroundColor: comparePhases.includes(phase.key) ? phase.color : undefined,
                }}
              >
                {comparePhases.includes(phase.key) && (
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                    <path d="M1 5L4 8L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
              <span className="text-sm text-gray-700">{phase.label}</span>
            </label>
          ))}
        </div>

        <div className="mt-4">
          <StackedBarChart
            data={compareChartData}
            phases={DUMMY_COMPARE_PHASES.filter(p => comparePhases.includes(p.key))}
            layout="vertical"
            height={220}
            xAxisLabel="Number of Products"
            yAxisLabel="Years"
            showFilters={false}
          />
        </div>
      </div>

      {/* Sub-section B: Table view */}
      <div className="mb-4 p-4" style={{ border: '1px solid #26262617' }}>
        <p className="text-sm text-gray-500 mb-2">
          Explore the underlying data for the selected portfolios by aggregated R&amp;D stage in the chosen year, enabling detailed comparison of portfolio compositions.
        </p>
        <p className="text-sm text-gray-400 italic mb-4">
          How many candidates are present in each research stage for each portfolio?
        </p>
        <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />

        <Table
          columns={compareTableColumns}
          data={compareTableData}
          pagination={false}
          emptyState={{
            title: 'No data available',
            description: 'Select portfolios and apply to see comparison data.',
          }}
        />
      </div>

      {/* Sub-section C: Aggregated R&D stages across portfolios */}
      <div className="mb-4 p-4" style={{ border: '1px solid #26262617' }}>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-base font-semibold text-black">
            Temporal trends in aggregated R&amp;D stages across portfolios
          </h4>
          <ChartMenu onDownloadCSV={() => {}} onDownloadPNG={() => {}} />
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Explore the temporal trends for each selected portfolio with R&amp;D stages aggregated into early development, late development, and approved products across IGH review years.
        </p>
        <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />

        {/* Stage checkboxes */}
        <div className="flex items-center gap-6 py-4 flex-wrap">
          {STAGE_SERIES.map(stage => (
            <label key={stage.key} className="flex items-center gap-2 cursor-pointer">
              <span
                onClick={() => handleAcrossStageToggle(stage.key)}
                className={`w-5 h-5 border rounded flex items-center justify-center shrink-0 cursor-pointer ${
                  acrossStages.includes(stage.key)
                    ? 'border-transparent'
                    : 'border-gray-300 bg-white'
                }`}
                style={{
                  backgroundColor: acrossStages.includes(stage.key) ? stage.color : undefined,
                }}
              >
                {acrossStages.includes(stage.key) && (
                  <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                    <path d="M1 5L4 8L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </span>
              <span className="text-sm text-gray-700">{stage.label}</span>
            </label>
          ))}
        </div>

        {/* Grouped charts per disease */}
        <div className="mt-4 flex gap-0">
          {acrossGroups.map(([group, items]) => {
            const visibleStages = STAGE_SERIES.filter(s => acrossStages.includes(s.key));
            return (
              <div key={group} className="flex-1 min-w-0">
                <StackedBarChart
                  data={items}
                  phases={visibleStages}
                  layout="horizontal"
                  height={300}
                  xAxisLabel={group}
                  yAxisLabel={acrossGroups[0][0] === group ? 'Number of Candidates' : ''}
                  showFilters={false}
                  yAxisWidth={acrossGroups[0][0] === group ? 50 : 30}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function TemporalTrendsSection({
  diseaseOptions = [],
  productOptions = [],
  availableYears = [],
}) {
  const [activeTab, setActiveTab] = useState('single');

  // Local filter state (Apply/Clear pattern)
  const [filterDisease, setFilterDisease] = useState([]);
  const [filterProduct, setFilterProduct] = useState([]);
  const [filterYear, setFilterYear] = useState('');

  // Applied filters (committed on Apply)
  const [appliedDisease, setAppliedDisease] = useState([]);
  const [appliedProduct, setAppliedProduct] = useState([]);
  const [appliedYear, setAppliedYear] = useState('');

  const handleApply = () => {
    setAppliedDisease(filterDisease);
    setAppliedProduct(filterProduct);
    setAppliedYear(filterYear);
  };

  const hasSingleFilters = filterDisease.length > 0 || filterProduct.length > 0 || filterYear !== '';

  const handleClear = () => {
    setFilterDisease([]);
    setFilterProduct([]);
    setFilterYear('');
    setAppliedDisease([]);
    setAppliedProduct([]);
    setAppliedYear('');
  };

  // Build API filter params
  const diseaseGroupNames = appliedDisease.length > 0 ? appliedDisease : null;
  const productKeys = appliedProduct.length > 0 ? appliedProduct.map(v => parseInt(v)) : null;
  const years = appliedYear ? [parseInt(appliedYear)] : null;

  const { chartData, phases, loading, raw } = useTemporalSnapshots(
    years,
    null,
    productKeys,
    diseaseGroupNames
  );

  // Sub-section A: phase selection for stacked bar
  const [selectedPhases, setSelectedPhases] = useState([]);
  useMemo(() => {
    if (phases.length > 0 && selectedPhases.length === 0) {
      setSelectedPhases(phases.map(p => p.key));
    }
  }, [phases]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePhaseToggle = (phaseKey) => {
    setSelectedPhases(prev =>
      prev.includes(phaseKey)
        ? prev.filter(k => k !== phaseKey)
        : [...prev, phaseKey]
    );
  };

  // Sub-section B: aggregated grouped bar chart
  const aggregatedData = useMemo(() => aggregateTemporalPhases(raw), [raw]);

  const groupedChartData = useMemo(() => {
    if (!aggregatedData.length) return [];
    const stages = ['earlyDevelopment', 'lateDevelopment', 'approved'];
    return stages.map(stage => {
      const row = { category: AGGREGATE_STAGE_LABELS[stage] };
      aggregatedData.forEach(yd => {
        row[String(yd.year)] = yd[stage];
      });
      return row;
    });
  }, [aggregatedData]);

  const yearSeries = useMemo(() => {
    return aggregatedData.map((yd, idx) => ({
      key: String(yd.year),
      label: String(yd.year),
      color: YEAR_COLORS[idx % YEAR_COLORS.length],
    }));
  }, [aggregatedData]);

  // Sub-section C: growth table
  const growthTable = useMemo(() => computeGrowthTable(aggregatedData), [aggregatedData]);

  // Build Table component columns and data from growthTable
  const growthTableColumns = useMemo(() => {
    if (!growthTable.years.length) return [];
    const cols = [
      { accessor: 'phase', header: 'Phase', minWidth: '180px' },
    ];
    growthTable.years.forEach((year, idx) => {
      cols.push({
        accessor: `year_${year}`,
        header: idx === 0 ? `${year} (Baseline)` : String(year),
        render: (value, row) => {
          const cell = row._values?.[year];
          if (!cell) return '-';
          const change = cell.yoyChange !== null ? parseFloat(cell.yoyChange) : null;
          const isNegative = change !== null && change < 0;
          const isPositive = change !== null && change > 0;
          return (
            <div className="flex items-center gap-3">
              <span>{cell.count}</span>
              {change !== null && (
                <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${
                  isNegative
                    ? 'bg-[#FFEBEE] text-[#C62828]'
                    : isPositive
                      ? 'bg-[#E8F5E9] text-[#2E7D32]'
                      : 'bg-gray-100 text-gray-600'
                }`}>
                  {isNegative ? '↓' : isPositive ? '↑' : ''} {Math.abs(change).toFixed(0)}%
                </span>
              )}
            </div>
          );
        },
      });
    });
    cols.push({
      accessor: 'totalGrowth',
      header: 'Total Growth (%)',
      render: (value) => {
        if (value === null || value === undefined) return '-';
        const num = parseFloat(value);
        const isNegative = num < 0;
        const isPositive = num > 0;
        return (
          <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-medium ${
            isNegative
              ? 'bg-[#FFEBEE] text-[#C62828]'
              : isPositive
                ? 'bg-[#E8F5E9] text-[#2E7D32]'
                : 'bg-gray-100 text-gray-600'
          }`}>
            {isNegative ? '↓' : isPositive ? '↑' : ''} {Math.abs(num).toFixed(1)}%
          </span>
        );
      },
    });
    return cols;
  }, [growthTable.years]);

  const growthTableData = useMemo(() => {
    return growthTable.rows.map(row => {
      const entry = {
        id: row.stage,
        phase: row.label,
        totalGrowth: row.totalGrowth,
        _values: row.values,
      };
      growthTable.years.forEach(year => {
        entry[`year_${year}`] = row.values[year]?.count ?? 0;
      });
      return entry;
    });
  }, [growthTable]);

  const yearOptions = useMemo(() =>
    (availableYears || []).map(y => ({ value: String(y), label: String(y) })),
    [availableYears]
  );

  return (
    <div className="bg-white border border-gray-200 p-4 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold text-black">
          Temporal trends &amp; portfolio comparison
        </h3>
        <ChartMenu onDownloadCSV={() => {}} onDownloadPNG={() => {}} />
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Track how candidates progress through the R&amp;D cycle over time and compare
        the maturity of different disease portfolios with each other.
      </p>
      <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />

      {/* Tabs */}
      <TabNav
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        className="mb-4"
      />

      {activeTab === 'single' ? (
        <div>
          {/* Filters */}
          <div className="flex items-end gap-4 pb-4 border-b border-gray-200">
            <div className="min-w-[200px]">
              <Dropdown
                label="Disease"
                value={filterDisease}
                onChange={setFilterDisease}
                placeholder="All"
                options={diseaseOptions}
                multiSelect={true}

              />
            </div>
            <div className="min-w-[200px]">
              <Dropdown
                label="Product"
                value={filterProduct}
                onChange={setFilterProduct}
                placeholder="All"
                options={productOptions}
                multiSelect={true}

              />
            </div>
            <div className="min-w-[160px]">
              <Dropdown
                label="Year"
                value={filterYear}
                onChange={setFilterYear}
                placeholder="All years"
                options={yearOptions}
              />
            </div>
            <div className="flex-1" />
            <button
              onClick={handleClear}
              disabled={!hasSingleFilters}
              className={`flex items-center gap-2 text-sm px-4 h-[44px] whitespace-nowrap border ${
                hasSingleFilters
                  ? 'text-[#262626] bg-gray-200 border-gray-300 hover:bg-gray-300 cursor-pointer font-medium'
                  : 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed'
              }`}
            >
              Clear
              <RefreshIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleApply}
              className="flex items-center gap-2 text-sm font-medium text-black bg-orange-500 px-6 hover:bg-black hover:text-white h-[44px] transition-colors"
            >
              Apply
            </button>
          </div>

          <p className="text-sm text-gray-500 my-4">
            Compare how a single portfolio evolved over measurement years.
            Use the filters above to narrow down to specific diseases, products,
            or a single year.
          </p>

          {/* Sub-section A: Temporal trends in portfolio composition */}
          <div className="mt-4 mb-4 p-4" style={{ border: '1px solid #26262617' }}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-semibold text-black">
                Temporal trends in portfolio composition across R&amp;D stages
              </h4>
              <ChartMenu onDownloadCSV={() => {}} onDownloadPNG={() => {}} />
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Explore the temporal trends in a single portfolio, showing how distributions across R&amp;D stages change over time. Filter by disease and product, and use the R&amp;D stage legend and year controls to include or exclude specific stages and IGH review years for more focused analysis.
            </p>
            <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />

            {/* Phase checkboxes */}
            <div className="flex items-center gap-6 py-4 flex-wrap">
              {phases.map(phase => (
                <label key={phase.key} className="flex items-center gap-2 cursor-pointer">
                  <span
                    onClick={() => handlePhaseToggle(phase.key)}
                    className={`w-5 h-5 border rounded flex items-center justify-center shrink-0 cursor-pointer ${
                      selectedPhases.includes(phase.key)
                        ? 'border-transparent'
                        : 'border-gray-300 bg-white'
                    }`}
                    style={{
                      backgroundColor: selectedPhases.includes(phase.key) ? phase.color : undefined,
                    }}
                  >
                    {selectedPhases.includes(phase.key) && (
                      <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                        <path d="M1 5L4 8L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  <span className="text-sm text-gray-700">{phase.label}</span>
                </label>
              ))}
            </div>

            {/* Stacked bar chart */}
            <div className="mt-4">
              {loading ? (
                <div className="h-[280px] flex items-center justify-center">
                  <div className="animate-pulse text-gray-400">Loading chart data...</div>
                </div>
              ) : (
                <StackedBarChart
                  data={chartData}
                  phases={phases.filter(p => selectedPhases.includes(p.key))}
                  layout="vertical"
                  height={280}
                  xAxisLabel="Amount of Candidates / Products"
                  yAxisLabel="Years"
                  showFilters={false}
                />
              )}
            </div>
          </div>

          {/* Sub-section B: Aggregated R&D stages grouped bar */}
          <div className="mb-4 p-4" style={{ border: '1px solid #26262617' }}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-semibold text-black">
                Temporal trends in aggregated R&amp;D stages
              </h4>
              <ChartMenu onDownloadCSV={() => {}} onDownloadPNG={() => {}} />
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Explore the temporal trends in a single portfolio with R&amp;D stages aggregated into early development, late development, and approved products. Each cluster represents an aggregated R&amp;D stage across IGH review years, showing how the portfolio shifts over time at a higher level than the granular stage view above.
            </p>
            <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />

            <div className="mt-4">
              {loading ? (
                <div className="h-[350px] flex items-center justify-center">
                  <div className="animate-pulse text-gray-400">Loading chart data...</div>
                </div>
              ) : (
                <GroupedBarChart
                  data={groupedChartData}
                  series={yearSeries}
                  categoryKey="category"
                  height={380}
                  xAxisLabel="R&D Stage"
                  yAxisLabel="Number of Candidates"
                  showFilters={true}
                  showBarLabels={true}
                />
              )}
            </div>
          </div>

          {/* Sub-section C: Growth table */}
          <div className="mb-4 p-4" style={{ border: '1px solid #26262617' }}>
            <h4 className="text-lg font-bold text-black mb-2">
              Temporal trends in aggregated R&amp;D stages &ndash; table view
            </h4>
            <p className="text-sm text-gray-400 mb-4">
              Explore the underlying data for aggregated R&amp;D stages, including year-on-year changes and total growth in portfolio composition over time.
            </p>
            <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />

            {loading ? (
              <div className="h-[120px] flex items-center justify-center">
                <div className="animate-pulse text-gray-400">Loading table data...</div>
              </div>
            ) : (
              <Table
                columns={growthTableColumns}
                data={growthTableData}
                pagination={false}
                emptyState={{
                  title: 'No data available',
                  description: 'No data available for the selected filters.',
                }}
              />
            )}
          </div>
        </div>
      ) : (
        /* Tab 2: Compare different portfolios */
        <ComparePortfoliosTab
          diseaseOptions={diseaseOptions}
          productOptions={productOptions}
          yearOptions={yearOptions}
        />
      )}
    </div>
  );
}
