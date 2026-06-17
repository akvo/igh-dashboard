'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Dropdown, ChartMenu, TabNav, DataTable } from '@/components/ui';
import { RefreshIcon } from '@/components/icons';
import { StackedBarChart, GroupedBarChart, ChartEmptyState, ChartLegend } from '@/components/charts';
import HierarchicalDiseaseFilter from '@/components/filters/HierarchicalDiseaseFilter';
import HierarchicalProductFilter from '@/components/filters/HierarchicalProductFilter';
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
  expandProductKeySelection,
  VECTOR_CONTROL_CONSOLIDATED_NAME,
} from '@/lib/filterGroups';
import { buildCSV, downloadCSV } from '@/lib/csv';
import { downloadPNG } from '@/lib/png';
import { createHeatmapScale } from '@/lib/heatmap';

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

const PORTFOLIO_FALLBACK_LABELS = ['Portfolio A', 'Portfolio B', 'Portfolio C', 'Portfolio D'];

/**
 * Build a descriptive label for a portfolio from its selections.
 * Combines primary diseases, secondary diseases, and product types,
 * each comma-joined within their own group and dash-joined across
 * groups. Falls back to "Portfolio A" etc. when no selections exist.
 */
function buildPortfolioLabel(portfolio, productOptions, fallbackIndex) {
  const parts = [];
  if (portfolio.primaryDisease && portfolio.primaryDisease.length > 0) {
    parts.push(portfolio.primaryDisease.join(', '));
  }
  if (portfolio.secondaryDisease && portfolio.secondaryDisease.length > 0) {
    parts.push(portfolio.secondaryDisease.join(', '));
  }
  if (portfolio.product && portfolio.product.length > 0) {
    const productLabels = portfolio.product.map(val => {
      const opt = productOptions.find(o =>
        typeof o === 'object' ? o.value === val : o === val
      );
      return opt ? (typeof opt === 'object' ? opt.label : opt) : val;
    });
    parts.push(productLabels.join(', '));
  }
  return parts.length > 0 ? parts.join(' - ') : PORTFOLIO_FALLBACK_LABELS[fallbackIndex] || `Portfolio ${fallbackIndex + 1}`;
}

// Compact URL encoding for up to 4 portfolio
// {primaryDisease[], secondaryDisease[], product[]} objects.
//
// The encoded form uses three separators, in increasing scope:
//   ';' joins multi-values WITHIN a single field
//   ':' separates the three fields (primary : secondary : product)
//   ',' separates portfolios from each other
//
// Empty fields collapse to nothing, e.g. a portfolio with only a
// primary disease serializes to "Malaria::" (two trailing colons).
const portfolioSerializer = {
  serialize: (portfolios) => {
    const parts = portfolios
      .filter(p =>
        (Array.isArray(p.primaryDisease) && p.primaryDisease.length > 0) ||
        (Array.isArray(p.secondaryDisease) && p.secondaryDisease.length > 0) ||
        (Array.isArray(p.product) && p.product.length > 0))
      .map(p => {
        const pd = Array.isArray(p.primaryDisease) ? p.primaryDisease.join(';') : '';
        const sd = Array.isArray(p.secondaryDisease) ? p.secondaryDisease.join(';') : '';
        const pr = Array.isArray(p.product) ? p.product.join(';') : '';
        return `${pd}:${sd}:${pr}`;
      });
    return parts.length > 0 ? parts.join(',') : null;
  },
  deserialize: (str) => {
    if (!str) return null;
    return str.split(',').map((part, idx) => {
      const [primary = '', secondary = '', product = ''] = part.split(':');
      return {
        primaryDisease: primary ? primary.split(';') : [],
        secondaryDisease: secondary ? secondary.split(';') : [],
        product: product ? product.split(';') : [],
        label: PORTFOLIO_FALLBACK_LABELS[idx],
      };
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

function ComparePortfoliosTab({
  narrowedHierarchy = [],
  productOptions = [],
  yearOptions = [],
  filterPairs = [],
}) {
  const [appliedPortfolios, setAppliedPortfolios] = useUrlState('cpf', [], portfolioSerializer);
  const [appliedCompareYear, setAppliedCompareYear] = useUrlState('cpYear', '', stringSerializer);
  const [visibleCount, setVisibleCount] = useUrlState('cpN', 2, numberSerializer);
  // Sort + visible-column state for the comparison table. Kept as
  // local component state — the table is a presentation drill-down
  // (no URL persistence needed) but the DataTable kebab/popover
  // affordances still need controlled props to do anything.
  const [compareSort, setCompareSort] = useState(null);
  const [compareVisibleColumns, setCompareVisibleColumns] = useState([]);

  // Local/pending state — initialized from URL-restored applied values.
  // Each row is the new portfolio shape:
  //   { primaryDisease: string[], secondaryDisease: string[], product: string[] }
  //
  // The deserializer already coerces every field to an array, so we
  // only need to defend against absent fields when reading older URL
  // states (or the first-render empty case).
  const emptyPortfolio = () => ({ primaryDisease: [], secondaryDisease: [], product: [] });
  const coercePortfolio = (p) => ({
    primaryDisease: Array.isArray(p?.primaryDisease) ? p.primaryDisease : [],
    secondaryDisease: Array.isArray(p?.secondaryDisease) ? p.secondaryDisease : [],
    product: Array.isArray(p?.product) ? p.product : (p?.product ? [p.product] : []),
  });
  const [portfolios, setPortfolios] = useState(() => {
    const initial = [emptyPortfolio(), emptyPortfolio(), emptyPortfolio(), emptyPortfolio()];
    appliedPortfolios.forEach((p, i) => {
      if (i < 4) initial[i] = coercePortfolio(p);
    });
    return initial;
  });
  const [compareYear, setCompareYear] = useState(appliedCompareYear);

  // Refs for PNG download capture targets
  const portfolioCompareRef = useRef(null);
  const acrossPortfoliosRef = useRef(null);

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
            if (i < 4) next[i] = coercePortfolio(p);
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

  // Client-side cascading filters from the disease×product pairs.
  //
  // For each portfolio row, narrow the OPPOSITE axis based on the
  // current selection of one axis. Because pairs now carry both
  // `disease_filter` (the authoritative primary) and
  // `secondary_disease_name`, a row whose primary or secondary is
  // selected can constrain the product list, and vice versa.
  //
  // Disease selections are canonical post-migration -- there is no
  // composite expansion to apply (no legacy group-name synonyms),
  // so we compare raw names directly.
  const validProducts = useMemo(() => {
    return portfolios.map(p => {
      const primarySel = p.primaryDisease || [];
      const secondarySel = p.secondaryDisease || [];
      if (primarySel.length === 0 && secondarySel.length === 0) return null;
      const validKeys = new Set(
        filterPairs
          .filter(pair => {
            if (primarySel.length > 0 && !primarySel.includes(pair.disease_filter)) return false;
            if (secondarySel.length > 0 && !secondarySel.includes(pair.secondary_disease_name)) return false;
            return true;
          })
          .map(pair => String(pair.product_key))
      );
      return productOptions.filter(o => o.value.split('|').some(k => validKeys.has(k)));
    });
  }, [portfolios, filterPairs, productOptions]);

  // For each portfolio, derive a narrowed hierarchy that reflects
  // the products selected in that row. We use `pairs` to find which
  // primaries and secondaries are still reachable under the chosen
  // products, then prune the parent `narrowedHierarchy`. Rows whose
  // secondary equals the primary (the self-row emitted for
  // childless primaries) are kept as long as the primary is
  // reachable.
  const validHierarchies = useMemo(() => {
    return portfolios.map(p => {
      if (!p.product || p.product.length === 0) return null;
      const pkeys = new Set(expandProductKeySelection(p.product));
      const reachablePrimaries = new Set();
      const reachableSecondaries = new Set();
      for (const pair of filterPairs) {
        if (!pkeys.has(String(pair.product_key))) continue;
        if (pair.disease_filter) reachablePrimaries.add(pair.disease_filter);
        if (pair.secondary_disease_name) reachableSecondaries.add(pair.secondary_disease_name);
      }
      return narrowedHierarchy.filter((r) => {
        if (!reachablePrimaries.has(r.primary_disease)) return false;
        if (r.secondary_disease === r.primary_disease) return true;
        return reachableSecondaries.has(r.secondary_disease);
      });
    });
  }, [portfolios, filterPairs, narrowedHierarchy]);

  // Fetch data for applied portfolios
  const { results, loading } = usePortfolioComparison(appliedPortfolios);

  // Active portfolios (applied and non-empty) with descriptive labels
  const activePortfolios = useMemo(
    () => appliedPortfolios.filter(Boolean).map((p, idx) => ({
      ...p,
      label: buildPortfolioLabel(p, productOptions, idx),
    })),
    [appliedPortfolios, productOptions]
  );

  // Extract phases from all portfolio results combined
  const allRawData = useMemo(() => results.filter(Boolean).flat(), [results]);
  const apiPhases = useMemo(() => extractTemporalPhases(allRawData), [allRawData]);

  // Compare phase checkboxes — persisted via URL query params
  const [hiddenComparePhases, setHiddenComparePhases] = useUrlState('ttCPhide', [], arraySerializer);
  const comparePhases = useMemo(
    () => apiPhases.filter(p => !hiddenComparePhases.includes(p.key)).map(p => p.key),
    [apiPhases, hiddenComparePhases]
  );
  const handleComparePhaseToggle = (key) => {
    setHiddenComparePhases(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Across-portfolios stage checkboxes — persisted via URL query params
  const [hiddenAcrossStages, setHiddenAcrossStages] = useUrlState('ttCShide', [], arraySerializer);
  const acrossStages = useMemo(
    () => STAGE_SERIES.filter(s => !hiddenAcrossStages.includes(s.key)).map(s => s.key),
    [hiddenAcrossStages]
  );
  const handleAcrossStageToggle = (key) => {
    setHiddenAcrossStages(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  // Disease changes flow through `HierarchicalDiseaseFilter`'s
  // `onChange` directly into setPortfolios -- the component owns
  // both arrays so we no longer need a separate disease handler.
  const handleProductChange = (index, value) => {
    setPortfolios(prev => {
      const next = [...prev];
      next[index] = { ...next[index], product: value };
      return next;
    });
  };

  // A portfolio is "non-empty" if any of its three axes carry a
  // selection -- this gates both Apply (only commit non-empty rows)
  // and Clear (enabled when any pending or applied state exists).
  const isPortfolioNonEmpty = (p) =>
    (p.primaryDisease?.length ?? 0) > 0 ||
    (p.secondaryDisease?.length ?? 0) > 0 ||
    (p.product?.length ?? 0) > 0;

  const handleCompareApply = () => {
    const applied = portfolios
      .slice(0, visibleCount)
      .map((p, idx) => ({ ...p, label: buildPortfolioLabel(p, productOptions, idx) }))
      .filter(isPortfolioNonEmpty);
    setAppliedPortfolios(applied);
    setAppliedCompareYear(compareYear);
    setHiddenComparePhases([]);
  };

  const hasCompareFilters = portfolios.some(isPortfolioNonEmpty) || compareYear !== '' ||
    appliedPortfolios.length > 0 || appliedCompareYear !== '';

  const handleCompareClear = () => {
    setPortfolios([emptyPortfolio(), emptyPortfolio(), emptyPortfolio(), emptyPortfolio()]);
    setCompareYear('');
    setAppliedPortfolios([]);
    setAppliedCompareYear('');
    setVisibleCount(2);
    setHiddenComparePhases([]);
    setHiddenAcrossStages([]);
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
    const rows = activePortfolios.map((portfolio, idx) => {
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
    // Sort by total count descending (widest bar first)
    const sum = (row) => apiPhases.reduce((s, p) => s + (row[p.key] || 0), 0);
    rows.sort((a, b) => sum(b) - sum(a));
    return rows;
  }, [results, activePortfolios, targetYear, apiPhases]);

  // --- Sub-section B: Table ---
  const portfolioAccessors = useMemo(
    () => activePortfolios.map((_, idx) => `portfolio_${idx}`).concat('total'),
    [activePortfolios],
  );

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

  const getCompareHeatmap = useMemo(
    () => createHeatmapScale(compareTableData, portfolioAccessors),
    [compareTableData, portfolioAccessors],
  );

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
        cellStyle: (value, row) => row.id !== 'total' ? getCompareHeatmap(value) : {},
        render: (value, row) => {
          const sublabel = row[`${accessor}_label`];
          return (
            <div>
              <div className="font-bold text-base">{value || 0}</div>
              {sublabel && <div className="text-sm mt-0.5" style={{ opacity: 0.7 }}>{sublabel}</div>}
            </div>
          );
        },
      });
    });
    cols.push({
      accessor: 'total',
      header: 'Total',
      cellStyle: (value, row) => row.id !== 'total' ? getCompareHeatmap(value) : {},
      render: (value, row) => {
        const sublabel = row.total_label;
        return (
          <div>
            <div className="font-bold text-base">{value || 0}</div>
            {sublabel && <div className="text-sm mt-0.5" style={{ opacity: 0.7 }}>{sublabel}</div>}
          </div>
        );
      },
    });
    return cols;
  }, [activePortfolios, getCompareHeatmap]);

  // --- Sub-section C: Across portfolios ---
  const acrossChartData = useMemo(() => {
    if (activePortfolios.length === 0) return [];
    return activePortfolios.flatMap((portfolio, idx) => {
      const raw = results[idx];
      if (!raw) return [];
      const aggregated = aggregateTemporalPhases(raw);
      return [...aggregated].sort((a, b) => a.year - b.year).map(yd => ({
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
          {PORTFOLIO_FALLBACK_LABELS.slice(0, visibleCount).map((fallbackLabel, idx) => {
            const currentLabel = buildPortfolioLabel(portfolios[idx], productOptions, idx);
            return (
            <div
              key={fallbackLabel}
              className="bg-[#F7F7F7] rounded px-5 pt-4 pb-2"
            >
              <div className="flex gap-4">
                <div className="flex-1">
                  <HierarchicalDiseaseFilter
                    label="Disease"
                    hierarchy={validHierarchies[idx] ?? narrowedHierarchy}
                    primarySelected={portfolios[idx].primaryDisease}
                    secondarySelected={portfolios[idx].secondaryDisease}
                    onChange={({ primarySelected, secondarySelected }) => {
                      setPortfolios(prev => {
                        const next = [...prev];
                        next[idx] = {
                          ...next[idx],
                          primaryDisease: primarySelected,
                          secondaryDisease: secondarySelected,
                        };
                        return next;
                      });
                    }}
                    placeholder="All"
                  />
                </div>
                <div className="flex-1">
                  <Dropdown
                    label="Product type"
                    value={portfolios[idx].product}
                    onChange={(val) => handleProductChange(idx, val)}
                    placeholder="All"
                    options={validProducts[idx] ?? productOptions}
                    multiSelect={true}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 text-right mt-2 mb-0">{currentLabel.toLowerCase()}</p>
            </div>
            );
          })}
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
          {activePortfolios.map((p, idx) => (
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
          <ChartMenu onDownloadCSV={() => {
              const visiblePhases = apiPhases.filter((p) => comparePhases.includes(p.key));
              const columns = [
                { label: 'Portfolio', accessor: 'category' },
                ...visiblePhases.map((p) => ({ label: p.label, accessor: p.key })),
              ];
              const csv = buildCSV(columns, compareChartData);
              downloadCSV(csv, `portfolio-comparison-rd-stage-${targetYear}`);
            }} onDownloadPNG={() => downloadPNG(portfolioCompareRef, `portfolio-comparison-rd-stage-${targetYear}`)} />
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Compare up to four portfolios, each defined by a specific combination of disease and product. Examine how their R&D stage distributions differ in a selected year, review the underlying data in table form, and explore temporal trends for each portfolio. Use aggregated R&D stages to identify contrasts in growth and progression.
    </p>
        <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />

        {/* Phase checkboxes */}
        {apiPhases.length > 0 && (
          <ChartLegend
            items={apiPhases}
            visibleItems={apiPhases.reduce((acc, p) => ({ ...acc, [p.key]: comparePhases.includes(p.key) }), {})}
            onToggle={handleComparePhaseToggle}
            onSelectAll={() => setHiddenComparePhases([])}
            onClearAll={() => setHiddenComparePhases(apiPhases.map(p => p.key))}
          />
        )}

        <div ref={portfolioCompareRef} className="mt-4">
          {loading ? (
            <div className="h-[220px] flex items-center justify-center">
              <div className="animate-pulse text-gray-400">Loading chart data...</div>
            </div>
          ) : compareChartData.length > 0 ? (
            <StackedBarChart
              data={compareChartData}
              phases={apiPhases}
              layout="vertical"
              height={Math.max(220, compareChartData.length * 80)}
              xAxisLabel="Number of candidates / approved products"
              yAxisLabel="Portfolio"
              showFilters={false}
              yAxisWidth={280}
              maxTickChars={45}
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
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-500">
            Explore the underlying data for the selected portfolios by aggregated R&amp;D stage in the chosen year, enabling detailed comparison of portfolio compositions.
          </p>
          <ChartMenu onDownloadCSV={() => {
            const csvColumns = [
              { label: 'Phase', accessor: 'phase' },
              ...activePortfolios.map((p, idx) => ({
                label: p.label,
                accessor: `portfolio_${idx}`,
              })),
              { label: 'Total', accessor: 'total' },
            ];
            const csv = buildCSV(csvColumns, compareTableData);
            downloadCSV(csv, 'portfolio-comparison-by-rd-stage');
          }} />
        </div>
       
        <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />

        {loading ? (
          <div className="h-[120px] flex items-center justify-center">
            <div className="animate-pulse text-gray-400">Loading table data...</div>
          </div>
        ) : (
          <DataTable
            tableId="temporal-compare"
            serverSide={false}
            columns={compareTableColumns}
            data={compareTableData}
            itemsPerPage={Math.max(compareTableData.length, 1)}
            sort={compareSort}
            onSortChange={setCompareSort}
            visibleColumns={compareVisibleColumns}
            onVisibleColumnsChange={setCompareVisibleColumns}
            className="compare-table-bordered"
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
          <ChartMenu onDownloadCSV={() => {
              const visibleStages = STAGE_SERIES.filter((s) => acrossStages.includes(s.key));
              const columns = [
                { label: 'Portfolio', accessor: 'group' },
                { label: 'Year', accessor: 'category' },
                ...visibleStages.map((s) => ({ label: s.label, accessor: s.key })),
              ];
              const csv = buildCSV(columns, acrossChartData);
              downloadCSV(csv, 'temporal-trends-aggregated-rd-stages-across-portfolios');
            }} onDownloadPNG={() => downloadPNG(acrossPortfoliosRef, 'temporal-trends-aggregated-rd-stages-across-portfolios')} />
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Explore the temporal trends for each selected portfolio with R&amp;D stages aggregated into early development, late development, and approved products across IGH review years.
        </p>
        <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />

        {/* Stage checkboxes */}
        <ChartLegend
          items={STAGE_SERIES}
          visibleItems={STAGE_SERIES.reduce((acc, s) => ({ ...acc, [s.key]: acrossStages.includes(s.key) }), {})}
          onToggle={handleAcrossStageToggle}
          onSelectAll={() => setHiddenAcrossStages([])}
          onClearAll={() => setHiddenAcrossStages(STAGE_SERIES.map(s => s.key))}
        />

        {/* Grouped charts per disease */}
        <div ref={acrossPortfoliosRef} className="mt-4 flex gap-0">
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
  narrowedHierarchy = [],
  productOptions = [],
  productGroupMembers = [],
  availableYears = [],
}) {
  // Refs for PNG download capture targets
  const portfolioCompositionRef = useRef(null);
  const aggregatedStagesRef = useRef(null);

  const [activeTab, setActiveTab] = useUrlState('ttTab', 'single', {
    ...stringSerializer, historyMode: 'push',
  });
  const { pairs } = usePipelineFilterPairs();

  // Applied filters → URL (committed on Apply). Disease selections
  // now live in two parallel arrays mirroring the
  // HierarchicalDiseaseFilter contract: `appliedPrimary` carries
  // primary disease names, `appliedSecondary` the (optional) explicit
  // children. Keeping them as two URL params makes the URL idempotent
  // and easy to share.
  const [appliedPrimary, setAppliedPrimary] = useUrlState('ttPrimary', [], arraySerializer);
  const [appliedSecondary, setAppliedSecondary] = useUrlState('ttSecondary', [], arraySerializer);
  const [appliedProduct, setAppliedProduct] = useUrlState('ttProduct', [], arraySerializer);
  const [appliedYear, setAppliedYear] = useUrlState('ttYear', [], arraySerializer);

  // Local/pending filter state — initialized from URL-restored applied values
  const [filterPrimary, setFilterPrimary] = useState(appliedPrimary);
  const [filterSecondary, setFilterSecondary] = useState(appliedSecondary);
  const [filterProduct, setFilterProduct] = useState(appliedProduct);
  const [filterYear, setFilterYear] = useState(appliedYear);

  // One-time sync: populate local filter dropdowns from URL-restored
  // applied values after client hydration. useState initializers miss
  // the URL state because getServerSnapshot returns '' during SSR.
  const singleSynced = useRef(false);
  useEffect(() => {
    if (!singleSynced.current) {
      if (
        appliedPrimary.length ||
        appliedSecondary.length ||
        appliedProduct.length ||
        appliedYear.length
      ) {
        singleSynced.current = true;
        setFilterPrimary(appliedPrimary);
        setFilterSecondary(appliedSecondary);
        setFilterProduct(appliedProduct);
        setFilterYear(appliedYear);
      }
    }
  }, [appliedPrimary, appliedSecondary, appliedProduct, appliedYear]);

  // Client-side cascading filters from the disease×product pairs.
  //
  // The product list is narrowed by whichever disease axes the user
  // has touched. Both primary AND secondary selections constrain
  // independently: a chosen primary keeps only pairs where
  // `disease_filter` matches; a chosen secondary keeps only pairs
  // where `secondary_disease_name` matches; together they intersect.
  const effectiveProductOptions = useMemo(() => {
    if (filterPrimary.length === 0 && filterSecondary.length === 0) return productOptions;
    const validKeys = new Set(
      pairs
        .filter(p => {
          if (filterPrimary.length > 0 && !filterPrimary.includes(p.disease_filter)) return false;
          if (filterSecondary.length > 0 && !filterSecondary.includes(p.secondary_disease_name)) return false;
          return true;
        })
        .map(p => String(p.product_key))
    );
    return productOptions.filter(o => o.value.split('|').some(k => validKeys.has(k)));
  }, [filterPrimary, filterSecondary, pairs, productOptions]);

  // The disease hierarchy is narrowed by the chosen products. We
  // walk pairs to find every primary and secondary still reachable
  // under those product keys, then prune `narrowedHierarchy`.
  // Self-rows (where secondary equals primary, emitted for childless
  // primaries) are kept as long as the primary is reachable.
  const effectiveHierarchy = useMemo(() => {
    if (filterProduct.length === 0) return narrowedHierarchy;
    const pkeys = new Set(expandProductKeySelection(filterProduct));
    const reachablePrimaries = new Set();
    const reachableSecondaries = new Set();
    for (const p of pairs) {
      if (!pkeys.has(String(p.product_key))) continue;
      if (p.disease_filter) reachablePrimaries.add(p.disease_filter);
      if (p.secondary_disease_name) reachableSecondaries.add(p.secondary_disease_name);
    }
    return narrowedHierarchy.filter((r) => {
      if (!reachablePrimaries.has(r.primary_disease)) return false;
      if (r.secondary_disease === r.primary_disease) return true;
      return reachableSecondaries.has(r.secondary_disease);
    });
  }, [narrowedHierarchy, filterProduct, pairs]);

  const handleApply = () => {
    setAppliedPrimary(filterPrimary);
    setAppliedSecondary(filterSecondary);
    setAppliedProduct(filterProduct);
    setAppliedYear(filterYear);
  };

  const hasSingleFilters =
    filterPrimary.length > 0 || filterSecondary.length > 0 ||
    filterProduct.length > 0 || filterYear.length > 0 ||
    appliedPrimary.length > 0 || appliedSecondary.length > 0 ||
    appliedProduct.length > 0 || appliedYear.length > 0;

  const handleClear = () => {
    setFilterPrimary([]);
    setFilterSecondary([]);
    setFilterProduct([]);
    setFilterYear([]);
    setAppliedPrimary([]);
    setAppliedSecondary([]);
    setAppliedProduct([]);
    setAppliedYear([]);
    setHiddenPhases([]);
    setHiddenYears([]);
  };

  // Build API filter params. Disease axes are now canonical names --
  // no expansion needed. Empty selections become `null` so the
  // resolver treats them as "no filter on this axis".
  const expandedProductKeys = expandProductKeySelection(appliedProduct);
  const primaryNames = appliedPrimary.length > 0 ? appliedPrimary : null;
  const secondaryNames = appliedSecondary.length > 0 ? appliedSecondary : null;
  const productKeys = expandedProductKeys.length > 0 ? expandedProductKeys.map(v => parseInt(v)) : null;
  const years = appliedYear.length > 0 ? appliedYear.map(v => parseInt(v)) : null;

  const { chartData, phases, loading, raw } = useTemporalSnapshots(
    years,
    null,
    productKeys,
    primaryNames,
    secondaryNames,
  );

  // Sub-section A: phase selection for stacked bar
  // Store hidden (not visible) phases in URL so the default state (all visible)
  // produces a clean URL with no extra param.
  const [hiddenPhases, setHiddenPhases] = useUrlState('ttPhide', [], arraySerializer);

  const selectedPhases = useMemo(
    () => phases.filter(p => !hiddenPhases.includes(p.key)).map(p => p.key),
    [phases, hiddenPhases]
  );

  const handlePhaseToggle = (phaseKey) => {
    setHiddenPhases(prev =>
      prev.includes(phaseKey)
        ? prev.filter(k => k !== phaseKey)
        : [...prev, phaseKey]
    );
  };

  // Sub-section B: aggregated grouped bar chart
  // Store hidden years in URL so default state (all visible) produces a clean URL.
  const [hiddenYears, setHiddenYears] = useUrlState('ttYhide', [], arraySerializer);

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

  const visibleYears = useMemo(
    () => yearSeries.reduce((acc, s) => ({ ...acc, [s.key]: !hiddenYears.includes(s.key) }), {}),
    [yearSeries, hiddenYears]
  );

  const handleYearToggle = (key) => {
    setHiddenYears(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };
  const handleYearSelectAll = () => setHiddenYears([]);
  const handleYearClearAll = () => setHiddenYears(yearSeries.map(s => s.key));

  // Sub-section C: growth table
  const growthTable = useMemo(() => computeGrowthTable(aggregatedData), [aggregatedData]);
  const [growthSort, setGrowthSort] = useState(null);
  const [growthVisibleColumns, setGrowthVisibleColumns] = useState([]);

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
                <HierarchicalDiseaseFilter
                  label="Disease"
                  hierarchy={effectiveHierarchy}
                  primarySelected={filterPrimary}
                  secondarySelected={filterSecondary}
                  onChange={({ primarySelected, secondarySelected }) => {
                    setFilterPrimary(primarySelected);
                    setFilterSecondary(secondarySelected);
                  }}
                  placeholder="All"
                />
              </div>
              <div className="min-w-[200px]">
                <HierarchicalProductFilter
                  label="Product type"
                  selected={filterProduct}
                  onChange={setFilterProduct}
                  placeholder="All"
                  options={effectiveProductOptions}
                  groupMembers={productGroupMembers}
                  hiddenMemberLabels={[VECTOR_CONTROL_CONSOLIDATED_NAME]}
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
              <ChartMenu onDownloadCSV={() => {
                const columns = [
                  { label: 'Year', accessor: 'category' },
                  ...phases.map(p => ({ label: p.label, accessor: p.key })),
                ];
                const csv = buildCSV(columns, chartData);
                downloadCSV(csv, 'temporal-trends-portfolio-composition');
              }} onDownloadPNG={() => downloadPNG(portfolioCompositionRef, 'temporal-trends-portfolio-composition')} />
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Explore the temporal trends in a single portfolio, showing how distributions across R&amp;D stages change over time. Filter by disease and product, and use the R&amp;D stage legend and year controls to include or exclude specific stages and IGH review years for more focused analysis.
            </p>
            <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />

            {/* Phase checkboxes */}
            <ChartLegend
              items={phases}
              visibleItems={phases.reduce((acc, p) => ({ ...acc, [p.key]: selectedPhases.includes(p.key) }), {})}
              onToggle={handlePhaseToggle}
              onSelectAll={() => setHiddenPhases([])}
              onClearAll={() => setHiddenPhases(phases.map(p => p.key))}
            />

            {/* Stacked bar chart */}
            <div ref={portfolioCompositionRef} className="mt-4">
              {loading ? (
                <div className="h-[280px] flex items-center justify-center">
                  <div className="animate-pulse text-gray-400">Loading chart data...</div>
                </div>
              ) : !chartData || chartData.length === 0 ? (
                <ChartEmptyState variant="stackedBar" height={280} description="No data available for the selected filters." />
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
              <ChartMenu onDownloadCSV={() => {
                  const columns = [
                    { label: 'R&D Stage', accessor: 'category' },
                    ...yearSeries.map((ys) => ({ label: ys.label, accessor: ys.key })),
                  ];
                  const csv = buildCSV(columns, groupedChartData);
                  downloadCSV(csv, 'temporal-trends-aggregated-rd-stages');
                }} onDownloadPNG={() => downloadPNG(aggregatedStagesRef, 'temporal-trends-aggregated-rd-stages')} />
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Explore the temporal trends in a single portfolio with R&amp;D stages aggregated into early development, late development, and approved products. Each cluster represents an aggregated R&amp;D stage across IGH review years, showing how the portfolio shifts over time at a higher level than the granular stage view above.
            </p>
            <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />

            <div ref={aggregatedStagesRef} className="mt-4">
              {loading ? (
                <div className="h-[350px] flex items-center justify-center">
                  <div className="animate-pulse text-gray-400">Loading chart data...</div>
                </div>
              ) : !groupedChartData || groupedChartData.length === 0 ? (
                <ChartEmptyState variant="bar" height={380} description="No data available for the selected filters." />
              ) : (
                <GroupedBarChart
                  data={groupedChartData}
                  series={yearSeries}
                  visibleSeries={visibleYears}
                  onToggleSeries={handleYearToggle}
                  onSelectAll={handleYearSelectAll}
                  onClearAll={handleYearClearAll}
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
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-lg font-bold text-black">
                Temporal trends in aggregated R&amp;D stages &ndash; table view
              </h4>
              <ChartMenu onDownloadCSV={() => {
                const years = growthTable.years;
                const csvColumns = [
                  { label: 'Phase', accessor: 'phase' },
                  ...years.flatMap((year, idx) => {
                    const cols = [{
                      label: idx === 0 ? `${year} (Baseline)` : String(year),
                      accessor: (row) => row._values?.[year]?.count ?? 0,
                    }];
                    if (idx > 0) {
                      cols.push({
                        label: `${year} YoY (%)`,
                        accessor: (row) => row._values?.[year]?.yoyChange ?? '',
                      });
                    }
                    return cols;
                  }),
                  { label: 'Total Growth (%)', accessor: 'totalGrowth' },
                ];
                const csv = buildCSV(csvColumns, growthTableData);
                downloadCSV(csv, 'temporal-trends-aggregated-rd-stages-table');
              }} />
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Explore the underlying data for aggregated R&amp;D stages, including year-on-year changes and total growth in portfolio composition over time.
            </p>
            <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />

            {loading ? (
              <div className="h-[120px] flex items-center justify-center">
                <div className="animate-pulse text-gray-400">Loading table data...</div>
              </div>
            ) : (
              <DataTable
                tableId="temporal-growth"
                serverSide={false}
                columns={growthTableColumns}
                data={growthTableData}
                itemsPerPage={Math.max(growthTableData.length, 1)}
                sort={growthSort}
                onSortChange={setGrowthSort}
                visibleColumns={growthVisibleColumns}
                onVisibleColumnsChange={setGrowthVisibleColumns}
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
          narrowedHierarchy={narrowedHierarchy}
          productOptions={productOptions}
          yearOptions={yearOptions}
          filterPairs={pairs}
        />
      )}
    </div>
  );
}
