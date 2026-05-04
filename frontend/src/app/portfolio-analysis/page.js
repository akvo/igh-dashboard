'use client';

// =========================================================
// Portfolio Analysis page (Explore visual insights only)
// =========================================================
//
// The original single-page experience was split into three
// sibling routes under `/portfolio-analysis`. This file holds
// just the Explore content: three KPI cards, the Global pipeline
// overview stacked bar chart, and the Product types donut. The
// Extract tab moved to `/portfolio-analysis/extract` and the
// trailing Aggregated portfolio section moved to
// `/portfolio-analysis/aggregated`. Sidebar navigation between
// the three siblings forwards filters via the query string so
// the page-group filter state feels persistent.

import { useMemo, useRef, useState } from 'react';
import { useUrlState } from '@/lib/useUrlState';
import { arraySerializer } from '@/lib/url-serializers';
import Sidebar from '@/components/layout/Sidebar';
import { StatCard, Dropdown, ChartMenu } from '@/components/ui';
import { DownloadIcon } from '@/components/icons';
import { StackedBarChart, DonutChart } from '@/components/charts';
import {
  usePortfolioKPIs,
  useClinicalTrialStats,
  useProductPhaseDistribution,
  useProductDistribution,
} from '@/graphql/hooks';
import { buildCSV, downloadCSV } from '@/lib/csv';
import { downloadPNG } from '@/lib/png';
import {
  mergeVectorControlChartData,
  mergeVectorControlStackedData,
} from '@/lib/filterGroups';
import {
  useGlobalFilters,
  GlobalFilterBar,
  PortfolioPageHeader,
} from '@/components/portfolio-analysis';

// Donut chart colours — brand chart palette (from design system)
const productTypeColors = [
  '#F0B456', '#CBAFDE', '#B08888', '#E3D6C1',
  '#F9A78D', '#CC9949', '#6AB085', '#54A5C4',
  '#B28FC9', '#FFDCD1',
];

export default function PortfolioAnalysis() {
  const {
    healthArea,
    primary,
    secondary,
    rdPhase,
    expandedProduct,
  } = useGlobalFilters();

  // =========================================================
  // Page-local URL state (chart-scoped, not part of the global
  // filter bar)
  // =========================================================

  const [productTypeFilter, setProductTypeFilter] = useUrlState('productType', [], arraySerializer);
  const [pipelineHiddenPhases, setPipelineHiddenPhases] = useUrlState('phide', [], arraySerializer);

  // =========================================================
  // Data
  // =========================================================

  const { kpis, loading: kpisLoading } = usePortfolioKPIs(
    healthArea, primary, secondary, expandedProduct, rdPhase,
  );
  const { totalTrials: ongoingTrials } = useClinicalTrialStats(
    healthArea, primary, secondary, expandedProduct, rdPhase,
  );
  const { chartData: rawPipelineData, phases: pipelinePhases, loading: pipelineLoading } =
    useProductPhaseDistribution(healthArea, primary, secondary, expandedProduct, rdPhase);
  const pipelineData = useMemo(
    () => mergeVectorControlStackedData(rawPipelineData),
    [rawPipelineData],
  );
  // The Product types donut accepts a single optional candidateType
  // filter. The dropdown is multi-select for UX consistency, but
  // the API only narrows when exactly one option is picked.
  const candidateTypeForApi = productTypeFilter.length === 1 ? productTypeFilter[0] : undefined;
  const { chartData: rawProductTypesData, loading: productTypesLoading } = useProductDistribution(
    healthArea, primary, secondary, expandedProduct, rdPhase, candidateTypeForApi,
  );
  const productTypesData = useMemo(
    () => mergeVectorControlChartData(rawProductTypesData),
    [rawProductTypesData],
  );

  // Convert hidden-phase array (URL-friendly) into the
  // {key: boolean} visibility map that StackedBarChart expects.
  const pipelineVisiblePhases = useMemo(
    () => pipelinePhases.reduce(
      (acc, p) => ({ ...acc, [p.key]: !pipelineHiddenPhases.includes(p.key) }),
      {},
    ),
    [pipelinePhases, pipelineHiddenPhases],
  );
  const handlePipelineVisiblePhasesChange = (next) => {
    setPipelineHiddenPhases(Object.keys(next).filter((k) => !next[k]));
  };

  // PNG export targets
  const productTypesChartRef = useRef(null);
  const globalPipelineChartRef = useRef(null);
  const [exportingPNG, setExportingPNG] = useState(false);
  const handleExportPNG = async () => {
    setExportingPNG(true);
    try {
      await downloadPNG(globalPipelineChartRef, 'global-pipeline-overview');
    } finally {
      setExportingPNG(false);
    }
  };

  // KPI value lookups
  const activeCandidates = kpis?.find((k) => k.id === 'candidates')?.value || 0;
  const approvedProducts = kpis?.find((k) => k.id === 'approved')?.value || 0;

  return (
    <div className="flex h-[calc(100vh-74px)] bg-cream-200">
      <Sidebar />

      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Page header band */}
          <div className="flex flex-col gap-6 bg-white p-4 sm:p-6 lg:px-8 -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 mb-0">
            <PortfolioPageHeader
              title="Portfolio analysis"
              description="Explore the global R&D pipeline across health areas, diseases and product types through two complementary views. Use interactive charts and maps to visualize portfolio trends and apply filters (across the complete visual insights view) or switch to the table view to build a custom dataset and export it as .csv for further analysis."
            />
          </div>

          <GlobalFilterBar />

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {kpisLoading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                  </div>
                ))}
              </>
            ) : (
              <>
                <StatCard
                  title="Candidates in development"
                  value={activeCandidates}
                  description="Active candidates"
                  tooltip="Number of candidates currently in active development"
                />
                <StatCard
                  title="Linked clinical trials"
                  value={ongoingTrials}
                  description="Ongoing clinical trials"
                  tooltip="Number of clinical trials currently in progress"
                />
                <StatCard
                  title="Approved health products"
                  value={approvedProducts}
                  description="Approved products"
                  tooltip="Number of products that have received approval"
                />
              </>
            )}
          </div>

          {/* Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Global pipeline overview — 2 columns */}
            <div className="lg:col-span-2 bg-white border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-black">Global pipeline overview</h3>
                <button
                  onClick={handleExportPNG}
                  disabled={exportingPNG}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-black bg-white border border-black-24 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {exportingPNG ? 'Exporting...' : 'Export Visual'}
                  <DownloadIcon className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                A global overview of the R&amp;D pipeline by product type and development stage. Each horizontal bar represents a product type, with colour‑coded segments showing how many candidates and approved products sit at each stage of the R&D lifecycle, from discovery and pre‑clinical through clinical phases to approval. Use the filters above to narrow the view by global health area, disease, or product type, and click items in the legend to toggle individual stages on or off and compare where activity is concentrated across the pipeline.
              </p>
              <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />
              <div ref={globalPipelineChartRef}>
                {pipelineLoading ? (
                  <div className="h-[500px] flex items-center justify-center">
                    <div className="animate-pulse text-gray-400">Loading chart data...</div>
                  </div>
                ) : (
                  <StackedBarChart
                    data={pipelineData}
                    phases={pipelinePhases}
                    layout="vertical"
                    height={500}
                    yAxisWidth={100}
                    maxTickChars={15}
                    xAxisLabel="Number of candidates / approved products"
                    yAxisLabel="Product type"
                    showFilters={true}
                    visiblePhases={pipelineVisiblePhases}
                    onVisiblePhasesChange={handlePipelineVisiblePhasesChange}
                  />
                )}
              </div>
            </div>

            {/* Product types — 1 column */}
            <div className="bg-white border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-black">Product types</h3>
                <div className="flex items-center gap-2">
                  <Dropdown
                    value={productTypeFilter}
                    onChange={setProductTypeFilter}
                    placeholder="All"
                    options={[
                      { label: 'Candidates', value: 'Candidate' },
                      { label: 'Approved products', value: 'Product' },
                    ]}
                    multiSelect={true}
                    compact={true}
                    className="w-32"
                    variant="outlined"
                  />
                  <ChartMenu
                    onDownloadCSV={() => {
                      const columns = [
                        { label: 'Product type', accessor: 'name' },
                        { label: 'Count', accessor: 'value' },
                      ];
                      const csv = buildCSV(columns, productTypesData);
                      downloadCSV(csv, 'product-types');
                    }}
                    onDownloadPNG={() => downloadPNG(productTypesChartRef, 'product-types')}
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                A snapshot of how the R&amp;D pipeline is distributed across product types. Click on the drop-down to toggle between candidates, approved products or both.
              </p>
              <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />
              <div ref={productTypesChartRef}>
                {productTypesLoading ? (
                  <div className="h-[500px] flex items-center justify-center">
                    <div className="animate-pulse text-gray-400">Loading chart data...</div>
                  </div>
                ) : (
                  <DonutChart
                    data={productTypesData}
                    colors={productTypeColors}
                    height={500}
                    innerRadius={55}
                    outerRadius={140}
                    showLegend={true}
                    legendPosition="top"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
