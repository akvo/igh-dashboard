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

const YEAR_COLORS = [
  '#E76A42',
  '#F9A78D',
  '#C0A0E8',
  '#8c4028',
  '#fe7449',
  '#b090e0',
];

const PORTFOLIO_LABELS = ['Portfolio A', 'Portfolio B', 'Portfolio C', 'Portfolio D'];

const STAGE_SERIES = [
  { key: 'approved', label: 'Approved', color: '#C0A0E8' },
  { key: 'lateDevelopment', label: 'Late development', color: '#F9A78D' },
  { key: 'earlyDevelopment', label: 'Early development', color: '#E76A42' },
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
  { key: 'discovery', label: 'Discovery', color: '#8c4028' },
  { key: 'preclinical', label: 'Pre-clinical', color: '#b45038' },
  { key: 'phase_i', label: 'Phase 1', color: '#fe7449' },
  { key: 'phase_ii', label: 'Phase 2', color: '#f9a78d' },
  { key: 'phase_iii', label: 'Phase 3', color: '#ddd6fe' },
  { key: 'approved', label: 'Approved', color: '#f0b456' },
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

function ComparePortfoliosTab({ diseaseOptions = [], yearOptions = [] }) {
  const [visibleCount, setVisibleCount] = useState(2);
  const [portfolios, setPortfolios] = useState(['', '', '', '']);
  const [compareYear, setCompareYear] = useState('');
  const [appliedPortfolios, setAppliedPortfolios] = useState(['', '', '', '']);
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

  const handlePortfolioChange = (index, value) => {
    setPortfolios(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleCompareApply = () => {
    setAppliedPortfolios([...portfolios]);
    setAppliedCompareYear(compareYear);
  };

  const handleCompareClear = () => {
    setPortfolios(['', '', '', '']);
    setCompareYear('');
    setAppliedPortfolios(['', '', '', '']);
    setAppliedCompareYear('');
    setVisibleCount(2);
  };

  const handleAddPortfolio = () => {
    setVisibleCount(prev => Math.min(prev + 1, 4));
  };

  const handleRemovePortfolio = (idx) => {
    setPortfolios(prev => {
      const next = [...prev];
      next[idx] = '';
      return next;
    });
    setVisibleCount(prev => Math.max(prev - 1, 2));
  };

  // Table columns for compare view — always show 3 portfolios with static data as default
  const portfolioCellClass = (value, row) =>
    row.id !== 'total' ? 'bg-[#FEF0EB]' : '';

  const DEFAULT_PORTFOLIO_COUNT = 3;
  const displayPortfolioCount = Math.max(
    appliedPortfolios.filter(Boolean).length,
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
  const selectedPortfolios = appliedPortfolios.filter(Boolean);
  const compareChartData = useMemo(() => {
    if (selectedPortfolios.length === 0) return DUMMY_COMPARE_CHART_DATA;
    return selectedPortfolios.map((name, idx) => {
      const src = DUMMY_COMPARE_CHART_DATA[idx] || DUMMY_COMPARE_CHART_DATA[0];
      return { ...src, category: PORTFOLIO_LABELS[idx] || name };
    });
  }, [selectedPortfolios]);

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
      {/* Portfolio dropdowns */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {PORTFOLIO_LABELS.slice(0, visibleCount).map((label, idx) => (
          <div
            key={label}
            className="relative p-0"
            style={{ border: '1px solid #26262617' }}
          >
            <Dropdown
              value={portfolios[idx]}
              onChange={(val) => handlePortfolioChange(idx, val)}
              placeholder={label}
              options={diseaseOptions}
            />
            {idx >= 2 && (
              <button
                type="button"
                onClick={() => handleRemovePortfolio(idx)}
                className="absolute top-1/2 -translate-y-1/2 right-10 w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 bg-transparent border-none cursor-pointer"
                title="Remove portfolio"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        ))}
        {visibleCount < 4 && (
          <button
            type="button"
            onClick={handleAddPortfolio}
            className="flex items-center justify-center gap-2 text-sm text-[#E76A42] bg-transparent cursor-pointer h-[44px]"
            style={{ border: '1px dashed #E76A42' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Add portfolio
          </button>
        )}
      </div>

      {/* Year + Clear + Apply */}
      <div className="flex items-end gap-4 pb-6 mb-4">
        <div className="min-w-[220px]">
          <Dropdown
            label="Year"
            value={compareYear}
            onChange={setCompareYear}
            placeholder="Latest"
            options={yearOptions}
          />
        </div>
        <div className="flex-1" />
        <button
          onClick={handleCompareClear}
          className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 border border-gray-200 px-4 hover:bg-gray-200 h-[44px]"
        >
          Clear
          <RefreshIcon className="w-4 h-4" />
        </button>
        <button
          onClick={handleCompareApply}
          className="flex items-center gap-2 text-sm font-medium text-white bg-[#E76A42] px-6 hover:bg-[#d45e38] h-[44px]"
        >
          Apply
        </button>
      </div>

      <p className="text-sm text-gray-500 mb-6">
        Compare up to four portfolios &mdash; each defined by a specific combination of disease and product. Examine how their R&amp;D stage distributions differ in a selected year, review the underlying data in table form, and explore temporal trends for each portfolio over time using aggregated R&amp;D stages to identify contrasts in growth and progression.
      </p>

      {/* Sub-section A: Portfolio comparison by R&D stage */}
      <div className="mb-6 p-6" style={{ border: '1px solid #26262617' }}>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-base font-semibold text-black">
            Portfolio comparison by R&amp;D stage in selected year
          </h4>
          <ChartMenu onDownloadCSV={() => {}} onDownloadPNG={() => {}} />
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Compare up to four portfolios &mdash; each defined by a specific combination of disease and product &mdash; in a single year. View how each portfolio is distributed across R&amp;D stages, choose the year of interest, and use the legend to filter stages in or out to focus the comparison on pipeline components most relevant to the analysis.
        </p>

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
      <div className="mb-6 p-6" style={{ border: '1px solid #26262617' }}>
        <h4 className="text-lg font-bold text-black mb-2">
          Temporal trends in aggregated R&amp;D stages &ndash; table view
        </h4>
        <p className="text-sm text-gray-400 mb-6">
          Explore the underlying data for aggregated R&amp;D stages, including year-on-year changes and total growth in portfolio composition over time.
        </p>

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
      <div className="mb-4 p-6" style={{ border: '1px solid #26262617' }}>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-base font-semibold text-black">
            Temporal trends in aggregated R&amp;D stages across portfolios
          </h4>
          <ChartMenu onDownloadCSV={() => {}} onDownloadPNG={() => {}} />
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Explore the temporal trends for each selected portfolio with R&amp;D stages aggregated into early development, late development, and approved products across IGH review years.
        </p>

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
          return (
            <div className="flex items-center gap-3">
              <span>{cell.count}</span>
              {cell.yoyChange !== null && (
                <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-[#E8F5E9] text-[#2E7D32]">
                  {Math.abs(parseFloat(cell.yoyChange)).toFixed(0)}%
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
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-[#E8F5E9] text-[#2E7D32]">
            {Math.abs(parseFloat(value)).toFixed(1)}%
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
    <div className="bg-white border border-gray-200 p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xl font-bold text-black">
          Temporal trends &amp; portfolio comparison
        </h3>
        <ChartMenu onDownloadCSV={() => {}} onDownloadPNG={() => {}} />
      </div>
      <p className="text-sm text-gray-500 mb-6">
        Track how candidates progress through the R&amp;D cycle over time and compare
        the maturity of different disease portfolios with each other.
      </p>

      {/* Tabs */}
      <TabNav
        tabs={tabs}
        activeTab={activeTab}
        onChange={setActiveTab}
        className="mb-6"
      />

      {activeTab === 'single' ? (
        <div>
          {/* Filters */}
          <div className="flex items-end gap-4 pb-6 border-b border-gray-200">
            <div className="min-w-[200px]">
              <Dropdown
                label="Disease"
                value={filterDisease}
                onChange={setFilterDisease}
                placeholder="All"
                options={diseaseOptions}
                multiSelect={true}
                showAllOption={true}
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
                showAllOption={true}
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
              className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 border border-gray-200 px-4 hover:bg-gray-200 h-[44px]"
            >
              Clear
              <RefreshIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleApply}
              className="flex items-center gap-2 text-sm font-medium text-white bg-[#E76A42] px-6 hover:bg-[#d45e38] h-[44px]"
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
          <div className="mt-6 mb-6 p-6" style={{ border: '1px solid #26262617' }}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-semibold text-black">
                Temporal trends in portfolio composition across R&amp;D stages
              </h4>
              <ChartMenu onDownloadCSV={() => {}} onDownloadPNG={() => {}} />
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Explore the temporal trends in a single portfolio, showing how distributions across R&amp;D stages change over time. Filter by disease and product, and use the R&amp;D stage legend and year controls to include or exclude specific stages and IGH review years for more focused analysis.
            </p>

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
          <div className="mb-6 p-6" style={{ border: '1px solid #26262617' }}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-base font-semibold text-black">
                Temporal trends in aggregated R&amp;D stages
              </h4>
              <ChartMenu onDownloadCSV={() => {}} onDownloadPNG={() => {}} />
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Explore the temporal trends in a single portfolio with R&amp;D stages aggregated into early development, late development, and approved products. Each cluster represents an aggregated R&amp;D stage across IGH review years, showing how the portfolio shifts over time at a higher level than the granular stage view above.
            </p>

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
                  height={350}
                  xAxisLabel="R&D Stage"
                  yAxisLabel="Number of Candidates"
                  showFilters={true}
                />
              )}
            </div>
          </div>

          {/* Sub-section C: Growth table */}
          <div className="mb-4 p-6" style={{ border: '1px solid #26262617' }}>
            <h4 className="text-lg font-bold text-black mb-2">
              Temporal trends in aggregated R&amp;D stages &ndash; table view
            </h4>
            <p className="text-sm text-gray-400 mb-6">
              Explore the underlying data for aggregated R&amp;D stages, including year-on-year changes and total growth in portfolio composition over time.
            </p>

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
          yearOptions={yearOptions}
        />
      )}
    </div>
  );
}
