'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Dropdown, ChartMenu, TabNav, Table } from '@/components/ui';
import { RefreshIcon } from '@/components/icons';
import { StackedBarChart, GroupedBarChart } from '@/components/charts';
import { useTemporalSnapshots, usePortfolioComparison, usePipelineFilterPairs } from '@/graphql/hooks';
import { useUrlState } from '@/lib/useUrlState';
import { arraySerializer, stringSerializer, numberSerializer } from '@/lib/url-serializers';
import {
  aggregateTemporalPhases,
  computeGrowthTable,
  extractTemporalPhases,
  phaseNameToKey,
  AGGREGATE_STAGE_LABELS,
} from '@/lib/transformations';
import {
  expandDiseaseSelection,
  expandProductKeySelection,
  MALARIA_GROUP,
} from '@/lib/filterGroups';

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

// Compact URL encoding for up to 4 portfolio {disease, product} objects.
// [{disease:'HIV/AIDS', product:'1|2'}, {disease:'TB', product:'3'}]
//   → 'HIV/AIDS:1|2,TB:3'
// Labels are derived from index (Portfolio A, B, ...) — not stored.
const portfolioSerializer = {
  serialize: (portfolios) => {
    const parts = portfolios
      .filter(p => p.disease || p.product)
      .map(p => `${p.disease || ''}:${p.product || ''}`);
    return parts.length > 0 ? parts.join(',') : null;
  },
  deserialize: (str) => {
    if (!str) return null;
    return str.split(',').map((part, idx) => {
      const [disease = '', product = ''] = part.split(':');
      return { disease, product, label: PORTFOLIO_LABELS[idx] };
    });
  },
};

const STAGE_SERIES = [
  { key: 'approved', label: 'Approved', color: '#F0B456' },
  { key: 'lateDevelopment', label: 'Late development', color: '#B28FC9' },
  { key: 'earlyDevelopment', label: 'Early development', color: '#FE7449' },
];

const tabs = [
  { value: 'single', label: 'Compare a single portfolio over time' },
  { value: 'compare', label: 'Compare different portfolios' },
];

function ComparePortfoliosTab({ diseaseOptions = [], productOptions = [], yearOptions = [], filterPairs = [] }) {
  const [appliedPortfolios, setAppliedPortfolios] = useUrlState('cpf', [], portfolioSerializer);
  const [appliedCompareYear, setAppliedCompareYear] = useUrlState('cpYear', '', stringSerializer);
  const [visibleCount, setVisibleCount] = useUrlState('cpN', 2, numberSerializer);

  // Local/pending state — initialized from URL-restored applied values
  const [portfolios, setPortfolios] = useState(() => {
    const initial = [
      { disease: '', product: '' },
      { disease: '', product: '' },
      { disease: '', product: '' },
      { disease: '', product: '' },
    ];
    appliedPortfolios.forEach((p, i) => {
      if (i < 4) initial[i] = { disease: p.disease || '', product: p.product || '' };
    });
    return initial;
  });
  const [compareYear, setCompareYear] = useState(appliedCompareYear);

  // One-time sync: populate local portfolio dropdowns from URL-restored
  // applied values after client hydration.
  const compareSynced = useRef(false);
  useEffect(() => {
    if (!compareSynced.current) {
      if (appliedPortfolios.length > 0) {
        compareSynced.current = true;
        setPortfolios(prev => {
          const next = [...prev];
          appliedPortfolios.forEach((p, i) => {
            if (i < 4) next[i] = { disease: p.disease || '', product: p.product || '' };
          });
          return next;
        });
      }
      if (appliedCompareYear) {
        compareSynced.current = true;
        setCompareYear(appliedCompareYear);
      }
    }
  }, [appliedPortfolios, appliedCompareYear]);

  // Client-side cascading filters from disease×product pairs
  // (product options may have pipe-separated keys from VC consolidation)
  const validProducts = useMemo(() => {
    return portfolios.map(p => {
      if (!p.disease) return null;
      const expandedDisease = expandDiseaseSelection([p.disease]);
      const validKeys = new Set(
        filterPairs.filter(pair => expandedDisease.includes(pair.disease_group_name))
                   .map(pair => String(pair.product_key))
      );
      return productOptions.filter(o => o.value.split('|').some(k => validKeys.has(k)));
    });
  }, [portfolios, filterPairs, productOptions]);

  const validDiseases = useMemo(() => {
    return portfolios.map(p => {
      if (!p.product) return null;
      const expanded = expandProductKeySelection([p.product]);
      const pkeys = new Set(expanded);
      const validNames = new Set(
        filterPairs.filter(pair => pkeys.has(String(pair.product_key)))
                   .map(pair => pair.disease_group_name)
      );
      return diseaseOptions.filter(d => {
        const name = typeof d === 'string' ? d : d.value;
        if (validNames.has(name)) return true;
        if (name === MALARIA_GROUP.label) {
          return MALARIA_GROUP.members.some(m => validNames.has(m));
        }
        return false;
      });
    });
  }, [portfolios, filterPairs, diseaseOptions]);

  // Fetch data for applied portfolios
  const { results, loading } = usePortfolioComparison(appliedPortfolios);

  // Active portfolios (applied and non-empty)
  const activePortfolios = useMemo(
    () => appliedPortfolios.filter(Boolean),
    [appliedPortfolios]
  );

  // Extract phases from all portfolio results combined
  const allRawData = useMemo(() => results.filter(Boolean).flat(), [results]);
  const apiPhases = useMemo(() => extractTemporalPhases(allRawData), [allRawData]);

  // Compare phase checkboxes — initialized from API phases
  const [comparePhases, setComparePhases] = useState([]);
  useMemo(() => {
    if (apiPhases.length > 0 && comparePhases.length === 0) {
      setComparePhases(apiPhases.map(p => p.key));
    }
  }, [apiPhases]); // eslint-disable-line react-hooks/exhaustive-deps
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
    setComparePhases([]);
  };

  const hasCompareFilters = portfolios.some(p => p.disease || p.product) || compareYear !== '' ||
    appliedPortfolios.length > 0 || appliedCompareYear !== '';

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
    setComparePhases([]);
  };

  const handleAddPortfolio = () => {
    setVisibleCount(prev => Math.min(prev + 1, 4));
  };

  const handleRemoveTag = (idx) => {
    setAppliedPortfolios(prev => prev.filter((_, i) => i !== idx));
  };

  // Determine target year for sub-sections A and B
  const targetYear = useMemo(() => {
    if (appliedCompareYear) return parseInt(appliedCompareYear);
    if (allRawData.length === 0) return null;
    return Math.max(...allRawData.map(r => r.year));
  }, [appliedCompareYear, allRawData]);

  // --- Sub-section A: Stacked bar chart data ---
  const compareChartData = useMemo(() => {
    if (activePortfolios.length === 0 || !targetYear) return [];
    return activePortfolios.map((portfolio, idx) => {
      const raw = results[idx];
      if (!raw) return null;
      const yearData = raw.filter(r => r.year === targetYear);
      const row = { category: portfolio.label };
      apiPhases.forEach(phase => {
        const match = yearData.find(r => phaseNameToKey(r.phase_name) === phase.key);
        row[phase.key] = match ? match.candidateCount : 0;
      });
      return row;
    }).filter(Boolean);
  }, [results, activePortfolios, targetYear, apiPhases]);

  // --- Sub-section B: Table ---
  const portfolioCellClass = (value, row) =>
    row.id !== 'total' ? 'bg-[#FEF0EB]' : '';

  const compareTableColumns = useMemo(() => {
    if (activePortfolios.length === 0) return [];
    const cols = [
      { accessor: 'phase', header: 'Phase', minWidth: '140px' },
    ];
    activePortfolios.forEach((portfolio, idx) => {
      const accessor = `portfolio_${idx}`;
      cols.push({
        accessor,
        header: portfolio.label,
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
    });
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
  }, [activePortfolios]);

  const compareTableData = useMemo(() => {
    if (activePortfolios.length === 0 || !targetYear) return [];
    const stages = ['earlyDevelopment', 'lateDevelopment', 'approved'];
    const stageLabels = {
      earlyDevelopment: 'Early development',
      lateDevelopment: 'Late development',
      approved: 'Approved products',
    };

    const aggregated = activePortfolios.map((_, idx) => {
      const raw = results[idx];
      if (!raw) return { earlyDevelopment: 0, lateDevelopment: 0, approved: 0 };
      const yearData = raw.filter(r => r.year === targetYear);
      const agg = aggregateTemporalPhases(yearData);
      return agg.length > 0 ? agg[0] : { earlyDevelopment: 0, lateDevelopment: 0, approved: 0 };
    });

    const rows = stages.map(stage => {
      const entry = { id: stage, phase: stageLabels[stage] };
      let total = 0;
      aggregated.forEach((agg, idx) => {
        const value = agg[stage] || 0;
        entry[`portfolio_${idx}`] = value;
        entry[`portfolio_${idx}_label`] = stage === 'approved' ? 'Products' : 'Candidates';
        total += value;
      });
      entry.total = total;
      entry.total_label = stage === 'approved' ? 'Products' : 'Candidates';
      return entry;
    });

    // Total row
    const totalRow = { id: 'total', phase: 'Total' };
    let grandTotal = 0;
    aggregated.forEach((agg, idx) => {
      const value = stages.reduce((sum, stage) => sum + (agg[stage] || 0), 0);
      totalRow[`portfolio_${idx}`] = value;
      totalRow[`portfolio_${idx}_label`] = '';
      grandTotal += value;
    });
    totalRow.total = grandTotal;
    totalRow.total_label = '';
    rows.push(totalRow);
    return rows;
  }, [results, activePortfolios, targetYear]);

  // --- Sub-section C: Across portfolios ---
  const acrossChartData = useMemo(() => {
    if (activePortfolios.length === 0) return [];
    return activePortfolios.flatMap((portfolio, idx) => {
      const raw = results[idx];
      if (!raw) return [];
      const aggregated = aggregateTemporalPhases(raw);
      return aggregated.map(yd => ({
        category: String(yd.year),
        earlyDevelopment: yd.earlyDevelopment,
        lateDevelopment: yd.lateDevelopment,
        approved: yd.approved,
        group: portfolio.label,
      }));
    });
  }, [results, activePortfolios]);

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

      {/* Portfolio selectors — sticky filter bar */}
      <div className="sticky z-40 bg-white pt-4" style={{ top: 58 }}>
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
                    options={validDiseases[idx] ?? diseaseOptions}
                  />
                </div>
                <div className="flex-1">
                  <Dropdown
                    label="Product type"
                    value={portfolios[idx].product}
                    onChange={(val) => handleProductChange(idx, val)}
                    placeholder="All"
                    options={validProducts[idx] ?? productOptions}
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
      <div className="flex items-end gap-4 pb-4 border-b border-gray-200">
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
        {apiPhases.length > 0 && (
          <div className="flex items-center gap-6 py-4 flex-wrap">
            {apiPhases.length >= 3 && (
              <div className="flex gap-1 mr-2">
                <button type="button" onClick={() => setComparePhases(apiPhases.map(p => p.key))} className="text-xs text-orange-500 hover:underline cursor-pointer bg-transparent border-0 p-0">Select all</button>
                <span className="text-xs text-black-24">|</span>
                <button type="button" onClick={() => setComparePhases([])} className="text-xs text-orange-500 hover:underline cursor-pointer bg-transparent border-0 p-0">Clear all</button>
              </div>
            )}
            {apiPhases.map(phase => (
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
        )}

        <div className="mt-4">
          {loading ? (
            <div className="h-[220px] flex items-center justify-center">
              <div className="animate-pulse text-gray-400">Loading chart data...</div>
            </div>
          ) : compareChartData.length > 0 ? (
            <StackedBarChart
              data={compareChartData}
              phases={apiPhases}
              layout="vertical"
              height={220}
              xAxisLabel="Number of candidates / approved products"
              yAxisLabel="Portfolio"
              showFilters={false}
              visiblePhases={apiPhases.reduce((acc, p) => ({ ...acc, [p.key]: comparePhases.includes(p.key) }), {})}
            />
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
              Select portfolios and click Apply to see comparison data.
            </div>
          )}
        </div>
      </div>

      {/* Sub-section B: Table view */}
      <div className="mb-4 p-4" style={{ border: '1px solid #26262617' }}>
        <p className="text-sm text-gray-500 mb-2">
          Explore the underlying data for the selected portfolios by aggregated R&amp;D stage in the chosen year, enabling detailed comparison of portfolio compositions.
        </p>
       
        <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />

        {loading ? (
          <div className="h-[120px] flex items-center justify-center">
            <div className="animate-pulse text-gray-400">Loading table data...</div>
          </div>
        ) : (
          <Table
            columns={compareTableColumns}
            data={compareTableData}
            pagination={false}
            emptyState={{
              title: 'No data available',
              description: 'Select portfolios and apply to see comparison data.',
            }}
          />
        )}
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
          {STAGE_SERIES.length >= 3 && (
            <div className="flex gap-1 mr-2">
              <button type="button" onClick={() => setAcrossStages(STAGE_SERIES.map(s => s.key))} className="text-xs text-orange-500 hover:underline cursor-pointer bg-transparent border-0 p-0">Select all</button>
              <span className="text-xs text-black-24">|</span>
              <button type="button" onClick={() => setAcrossStages([])} className="text-xs text-orange-500 hover:underline cursor-pointer bg-transparent border-0 p-0">Clear all</button>
            </div>
          )}
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
          {loading ? (
            <div className="w-full h-[300px] flex items-center justify-center">
              <div className="animate-pulse text-gray-400">Loading chart data...</div>
            </div>
          ) : acrossGroups.length > 0 ? (
            acrossGroups.map(([group, items]) => (
              <div key={group} className="flex-1 min-w-0">
                <StackedBarChart
                  data={items}
                  phases={STAGE_SERIES}
                  layout="horizontal"
                  height={300}
                  xAxisLabel={group}
                  yAxisLabel={acrossGroups[0][0] === group ? 'Number of candidates / approved products' : ''}
                  showFilters={false}
                  yAxisWidth={acrossGroups[0][0] === group ? 50 : 30}
                  visiblePhases={STAGE_SERIES.reduce((acc, s) => ({ ...acc, [s.key]: acrossStages.includes(s.key) }), {})}
                />
              </div>
            ))
          ) : (
            <div className="w-full h-[300px] flex items-center justify-center text-gray-400 text-sm">
              Select portfolios and click Apply to see temporal trends.
            </div>
          )}
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
  const [activeTab, setActiveTab] = useUrlState('ttTab', 'single', {
    ...stringSerializer, historyMode: 'push',
  });
  const { pairs } = usePipelineFilterPairs();

  // Applied filters → URL (committed on Apply)
  const [appliedDisease, setAppliedDisease] = useUrlState('ttDisease', [], arraySerializer);
  const [appliedProduct, setAppliedProduct] = useUrlState('ttProduct', [], arraySerializer);
  const [appliedYear, setAppliedYear] = useUrlState('ttYear', [], arraySerializer);

  // Local/pending filter state — initialized from URL-restored applied values
  const [filterDisease, setFilterDisease] = useState(appliedDisease);
  const [filterProduct, setFilterProduct] = useState(appliedProduct);
  const [filterYear, setFilterYear] = useState(appliedYear);

  // One-time sync: populate local filter dropdowns from URL-restored
  // applied values after client hydration. useState initializers miss
  // the URL state because getServerSnapshot returns '' during SSR.
  const singleSynced = useRef(false);
  useEffect(() => {
    if (!singleSynced.current) {
      if (appliedDisease.length || appliedProduct.length || appliedYear.length) {
        singleSynced.current = true;
        setFilterDisease(appliedDisease);
        setFilterProduct(appliedProduct);
        setFilterYear(appliedYear);
      }
    }
  }, [appliedDisease, appliedProduct, appliedYear]);

  // Client-side cascading filters from disease×product pairs
  // (product options may have pipe-separated keys from VC consolidation)
  const effectiveProductOptions = useMemo(() => {
    if (filterDisease.length === 0) return productOptions;
    const expandedDisease = expandDiseaseSelection(filterDisease);
    const validKeys = new Set(
      pairs.filter(p => expandedDisease.includes(p.disease_group_name))
           .map(p => String(p.product_key))
    );
    return productOptions.filter(o => o.value.split('|').some(k => validKeys.has(k)));
  }, [filterDisease, pairs, productOptions]);

  const effectiveDiseaseOptions = useMemo(() => {
    if (filterProduct.length === 0) return diseaseOptions;
    const pkeys = new Set(expandProductKeySelection(filterProduct));
    const validNames = new Set(
      pairs.filter(p => pkeys.has(String(p.product_key)))
           .map(p => p.disease_group_name)
    );
    return diseaseOptions.filter(d => {
      const name = typeof d === 'string' ? d : d.value;
      if (validNames.has(name)) return true;
      if (name === MALARIA_GROUP.label) {
        return MALARIA_GROUP.members.some(m => validNames.has(m));
      }
      return false;
    });
  }, [filterProduct, pairs, diseaseOptions]);

  const handleApply = () => {
    setAppliedDisease(filterDisease);
    setAppliedProduct(filterProduct);
    setAppliedYear(filterYear);
  };

  const hasSingleFilters = filterDisease.length > 0 || filterProduct.length > 0 ||
    filterYear.length > 0 || appliedDisease.length > 0 || appliedProduct.length > 0 ||
    appliedYear.length > 0;

  const handleClear = () => {
    setFilterDisease([]);
    setFilterProduct([]);
    setFilterYear([]);
    setAppliedDisease([]);
    setAppliedProduct([]);
    setAppliedYear([]);
  };

  // Build API filter params (expand composite selections)
  const expandedDisease = expandDiseaseSelection(appliedDisease);
  const expandedProductKeys = expandProductKeySelection(appliedProduct);
  const diseaseGroupNames = expandedDisease.length > 0 ? expandedDisease : null;
  const productKeys = expandedProductKeys.length > 0 ? expandedProductKeys.map(v => parseInt(v)) : null;
  const years = appliedYear.length > 0 ? appliedYear.map(v => parseInt(v)) : null;

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
       Explore how selected portfolios evolve over time in the global health R&amp;D pipeline. Analyse the temporal progression of a single portfolio, by one or more diseases and products, or compare up to four portfolios side by side to identify differences in stage distribution and trajectory.
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
          {/* Sticky filters */}
          <div className="sticky z-40 bg-white pt-4" style={{ top: 58 }}>
            <div className="flex items-end gap-4 pb-4 border-b border-gray-200">
              <div className="min-w-[200px]">
                <Dropdown
                  label="Disease"
                  value={filterDisease}
                  onChange={setFilterDisease}
                  placeholder="All"
                  options={effectiveDiseaseOptions}
                  multiSelect={true}
                />
              </div>
              <div className="min-w-[200px]">
                <Dropdown
                  label="Product type"
                  value={filterProduct}
                  onChange={setFilterProduct}
                  placeholder="All"
                  options={effectiveProductOptions}
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
                  multiSelect={true}
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
          </div>

        

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
              {phases.length >= 3 && (
                <div className="flex gap-1 mr-2">
                  <button type="button" onClick={() => setSelectedPhases(phases.map(p => p.key))} className="text-xs text-orange-500 hover:underline cursor-pointer bg-transparent border-0 p-0">Select all</button>
                  <span className="text-xs text-black-24">|</span>
                  <button type="button" onClick={() => setSelectedPhases([])} className="text-xs text-orange-500 hover:underline cursor-pointer bg-transparent border-0 p-0">Clear all</button>
                </div>
              )}
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
                  phases={phases}
                  layout="vertical"
                  height={280}
                  xAxisLabel="Number of candidates / approved products"
                  yAxisLabel="Years"
                  showFilters={false}
                  visiblePhases={phases.reduce((acc, p) => ({ ...acc, [p.key]: selectedPhases.includes(p.key) }), {})}
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
                  xAxisLabel="R&D stage"
                  yAxisLabel="Number of candidates / approved products"
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
          filterPairs={pairs}
        />
      )}
    </div>
  );
}
