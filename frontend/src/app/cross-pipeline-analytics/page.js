'use client';

import { useState, useMemo, useRef } from 'react';
import { useUrlState } from '@/lib/useUrlState';
import { arraySerializer } from '@/lib/url-serializers';
import Sidebar from '@/components/layout/Sidebar';
import { Dropdown, ChartMenu } from '@/components/ui';
import { UploadIcon, RefreshIcon } from '@/components/icons';
import { StackedBarChart, ChartLegend } from '@/components/charts';
import { buildCSV, downloadCSV } from '@/lib/csv';
import { downloadPNG } from '@/lib/png';
import {
  useTemporalSnapshots,
  useAvailableYears,
  useGlobalHealthAreaSummaries,
  useProducts,
  useDiseaseHierarchy,
  usePipelineFilterPairs,
} from '@/graphql/hooks';
import {
  consolidateProductOptionsByKey,
  expandProductKeySelection,
} from '@/lib/filterGroups';
import { useCrossFilteredOptions } from '@/lib/useCrossFilteredOptions';
import HierarchicalDiseaseFilter from '@/components/filters/HierarchicalDiseaseFilter';
import TemporalTrendsSection from './TemporalTrendsSection';

export default function CrossPipelineAnalytics() {
  const [selectedHealthArea, setSelectedHealthArea] = useUrlState('gha', [], arraySerializer);
  // Disease selection is hierarchical: `primary` is the high-level
  // group ("Malaria"), `secondary` is the explicit sub-disease.
  const [primary, setPrimary] = useUrlState('primary', [], arraySerializer);
  const [secondary, setSecondary] = useUrlState('secondary', [], arraySerializer);
  const [selectedProduct, setSelectedProduct] = useUrlState('product', [], arraySerializer);

  // Fetch filter options first
  const { years: availableYears, loading: yearsLoading } = useAvailableYears();
  const { bubbleData: healthAreas, loading: healthAreasLoading } = useGlobalHealthAreaSummaries();
  const { products: productsList, loading: productsLoading } = useProducts();
  const { hierarchy: diseaseHierarchy, loading: diseasesLoading } = useDiseaseHierarchy();
  const { pairs, loading: pairsLoading } = usePipelineFilterPairs();

  // Build filter arrays for API. The hierarchical filter already
  // emits canonical primary / secondary lists -- no expansion step.
  const selectedHealthAreas = selectedHealthArea.length > 0 ? selectedHealthArea : null;
  const expandedProductKeys = expandProductKeySelection(selectedProduct);
  const selectedProductKeys = expandedProductKeys.length > 0 ? expandedProductKeys.map(v => parseInt(v)) : null;
  const selectedPrimary = primary.length > 0 ? primary : null;
  const selectedSecondary = secondary.length > 0 ? secondary : null;

  // Fetch chart data with filters
  const { chartData, phases: apiPhases, loading: temporalLoading } = useTemporalSnapshots(null, selectedHealthAreas, selectedProductKeys, selectedPrimary, selectedSecondary);

  // Only unselected/hidden phase keys are stored in the URL so that
  // the default state (all visible) produces a clean URL.
  const [hiddenPhases, setHiddenPhases] = useUrlState('phide', [], arraySerializer);

  const isPhaseVisible = (key) => !hiddenPhases.includes(key);

  const crossPipelineChartRef = useRef(null);
  const [shareCopied, setShareCopied] = useState(false);

  // All product options (before cross-filtering), with VC consolidation
  const allProductOptions = useMemo(() => {
    const raw = (productsList || []).map(p => ({ value: String(p.product_key), label: p.product_name }));
    return consolidateProductOptionsByKey(raw);
  }, [productsList]);

  const { healthAreaOptions, narrowedHierarchy, productOptions } = useCrossFilteredOptions({
    data: { healthAreas, diseaseHierarchy, pairs, allProductOptions },
    selections: { healthArea: selectedHealthArea, primary, secondary, product: selectedProduct },
    setters: { setHealthArea: setSelectedHealthArea, setPrimary, setSecondary, setProduct: setSelectedProduct },
    loading: { healthAreas: healthAreasLoading, diseases: diseasesLoading, products: productsLoading, pairs: pairsLoading },
    mode: 'by-key',
  });

  // Use API phases with consistent colors, enforcing lifecycle ordering
  // via sortOrder so the chart and legend always read
  // Discovery → … → Approved.
  const phases = useMemo(() => {
    const source = apiPhases.length > 0
      ? apiPhases
      : [
          { key: 'discovery', label: 'Discovery', color: '#AD5133', sortOrder: 10 },
          { key: 'pre_clinical', label: 'Pre-clinical', color: '#FE7449', sortOrder: 20 },
          { key: 'phase_1', label: 'Phase 1', color: '#F9A78D', sortOrder: 30 },
          { key: 'phase_2', label: 'Phase 2', color: '#B28FC9', sortOrder: 40 },
          { key: 'phase_3', label: 'Phase 3', color: '#CBAFDE', sortOrder: 50 },
          { key: 'approved', label: 'Approved', color: '#F0B456', sortOrder: 90 },
        ];
    return [...source].sort((a, b) => (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity));
  }, [apiPhases]);

  const handlePhaseToggle = (phaseKey) => {
    setHiddenPhases((prev) =>
      prev.includes(phaseKey) ? prev.filter((key) => key !== phaseKey) : [...prev, phaseKey]
    );
  };

  const hasCrossFilters = selectedHealthArea.length > 0 || primary.length > 0 || secondary.length > 0 || selectedProduct.length > 0 || hiddenPhases.length > 0;

  const handleResetFilters = () => {
    setSelectedHealthArea([]);
    setPrimary([]);
    setSecondary([]);
    setSelectedProduct([]);
    // Reset phases to all visible
    setHiddenPhases([]);
  };

  // Loading state
  const isLoading = temporalLoading || yearsLoading;

  return (
    <div className="flex min-h-[calc(100vh-74px)] bg-cream-200">
      <Sidebar activeId="cross-pipeline-analytics" />

      <main className="flex-1 min-w-0">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Page Header */}
          <div className="flex flex-col gap-4 mb-8 bg-white p-4 sm:p-6 lg:px-8 -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-black mb-2">
                  Cross-pipeline analytics
                </h1>
                <p className="text-sm text-gray-500">
                  Explore how the global health R&D pipeline evolves over time across global health areas, diseases, and product types. Track changes by R&D stage for specific IGH review years, and build custom comparisons by selecting one or multiple portfolios for deeper temporal analysis.
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

          {/* Cross-pipeline analytics section */}
          <div className="bg-white border border-gray-200 p-4 mb-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-black">Cross-pipeline analytics</h3>
              <div className="flex items-center gap-3">
                <ChartMenu onDownloadCSV={() => {
                  const visiblePhases = phases.filter((p) => isPhaseVisible(p.key));
                  const columns = [
                    { label: 'Year', accessor: 'category' },
                    ...visiblePhases.map((p) => ({ label: p.label, accessor: p.key })),
                  ];
                  const csv = buildCSV(columns, chartData);
                  downloadCSV(csv, 'cross-pipeline-analytics');
                }} onDownloadPNG={() => downloadPNG(crossPipelineChartRef, 'cross-pipeline-analytics')} />
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Explore the temporal trends in the global health R&D pipeline, tracking how distributions across R&D stages shift over time by global health area, disease, and product, with filters and legend controls to refine the analysis.
            </p>
            <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />

            {/* Sticky filters + phase checkboxes */}
            <div className="sticky z-40 bg-white pt-4" style={{ top: 58 }}>
              {/* Filters */}
              <div className="flex items-end gap-4 pb-4 border-b border-gray-200">
                <div className="min-w-[220px]">
                  <Dropdown
                    label="Global health area"
                    value={selectedHealthArea}
                    onChange={setSelectedHealthArea}
                    placeholder="All"
                    options={healthAreaOptions}
                    multiSelect={true}

                    loading={healthAreasLoading}
                  />
                </div>
                <div className="min-w-[220px]">
                  <HierarchicalDiseaseFilter
                    label="Disease"
                    hierarchy={narrowedHierarchy}
                    primarySelected={primary}
                    secondarySelected={secondary}
                    onChange={({ primarySelected, secondarySelected }) => {
                      setPrimary(primarySelected);
                      setSecondary(secondarySelected);
                    }}
                    placeholder="All"
                  />
                </div>
                <div className="min-w-[220px]">
                  <Dropdown
                    label="Product type"
                    value={selectedProduct}
                    onChange={setSelectedProduct}
                    placeholder="All"
                    options={productOptions}
                    multiSelect={true}

                    loading={productsLoading}
                  />
                </div>
                <div className="flex-1" />
                <button
                  onClick={handleResetFilters}
                  disabled={!hasCrossFilters}
                  className={`flex items-center gap-2 text-sm px-4 h-[44px] whitespace-nowrap border ${
                    hasCrossFilters
                      ? 'text-[#262626] bg-gray-200 border-gray-300 hover:bg-gray-300 cursor-pointer font-medium'
                      : 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed'
                  }`}
                >
                  Clear
                  <RefreshIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Phase checkboxes */}
              <div className="py-4">
                <ChartLegend
                  items={phases}
                  visibleItems={phases.reduce((acc, p) => ({ ...acc, [p.key]: isPhaseVisible(p.key) }), {})}
                  onToggle={handlePhaseToggle}
                  onSelectAll={() => setHiddenPhases([])}
                  onClearAll={() => setHiddenPhases(phases.map(p => p.key))}
                />
              </div>
            </div>

            {/* Chart */}
            <div ref={crossPipelineChartRef} className="mt-4">
              {isLoading ? (
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
                  visiblePhases={phases.reduce((acc, p) => ({ ...acc, [p.key]: isPhaseVisible(p.key) }), {})}
                />
              )}
            </div>

          </div>

          {/* Temporal trends & portfolio comparison */}
          <TemporalTrendsSection
            narrowedHierarchy={narrowedHierarchy}
            productOptions={productOptions}
            availableYears={availableYears}
          />

          {/* G-FINDER promotional section */}
          <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mb-4 sm:-mb-6 lg:-mb-8" style={{ backgroundColor: '#262626', color: '#fff' }}>
            {/* Image area with overlaid heading */}
            <div className="relative">
              <img
                src="/gfinder.png"
                alt="G-FINDER"
                className="block"
                style={{ width: 'calc(100% - 48px)', marginLeft: 48 }}
              />
              {/* Heading overlaid on top-left of image */}
              <div className="absolute top-0 left-0 p-8 md:p-12">
                <h2 className="text-3xl md:text-4xl font-bold m-0" style={{ fontFamily: 'var(--font-align), serif', color: '#fff', maxWidth: 450 }}>
                  Tracking global health investments: discover G-FINDER&apos;s impact
                </h2>
              </div>
            </div>

            {/* Text + CTA below image */}
            <div style={{ padding: '32px 48px 40px' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-6">
                <p className="m-0 text-white" style={{ fontSize: '1.0625rem', lineHeight: 1.6 }}>
                  G-FINDER is the gold-standard tracker of R&amp;D funding for new products and technologies for global health. Updated annually, this is the evidence base informing all global health advocacy, investment and policy change.
                </p>
                <div className="flex flex-col" style={{ gap: 16 }}>
                  <p className="m-0 text-white" style={{ fontSize: '1.0625rem', lineHeight: 1.6 }}>
                    <strong>The case for change:</strong> Explore funding trends over time, where there is innovation and where there are gaps.
                  </p>
                  <p className="m-0 text-white" style={{ fontSize: '1.0625rem', lineHeight: 1.6 }}>
                    <strong>Drivers of impact:</strong> Understand which initiatives are gaining strength and where there are weaknesses in global health R&amp;D impact.
                  </p>
                  <a
                    href="https://gfinderdata.impactglobalhealth.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-black bg-orange-500 hover:bg-black hover:text-white transition-colors mt-4"
                    style={{ padding: '12px 24px', width: 'fit-content' }}
                  >
                    Explore G-Finder data
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
