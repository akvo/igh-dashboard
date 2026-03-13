'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { useUrlState } from '@/lib/useUrlState';
import { arraySerializer, stringSerializer } from '@/lib/url-serializers';
import { buildCSV, downloadCSV as downloadCSVFile } from '@/lib/csv';
import { downloadPNG } from '@/lib/png';
import Sidebar from '@/components/layout/Sidebar';
import { StatCard, Dropdown, TabSwitcher, TabNav, ChartMenu, ScrollableTable, DiseaseListPanel } from '@/components/ui';
import ReportsAndInsights from '@/components/ReportsAndInsights';
import {
  BubbleChart,
  StackedBarChart,
  WorldMap,
} from '@/components/charts';
import {
  PieChartIcon,
  ListIcon,
  ClockIcon,
} from '@/components/icons';

import {
  usePortfolioKPIs,
  useGlobalHealthAreaSummaries,
  useCandidateTypeDistribution,
  useGeographicDistribution,
  useTemporalSnapshots,
  useProducts,
  useAvailableYears,
  useLastSyncDate,
  usePhases,
  useDiseases,
  usePipelineFilterPairs,
} from '@/graphql/hooks';
import { SIMPLIFIED_PHASE_NAMES } from '@/lib/transformations/constants';
import {
  consolidateProductOptionsByKey,
  expandProductKeySelection,
} from '@/lib/filterGroups';
import { useCrossFilteredOptions } from '@/lib/useCrossFilteredOptions';

// Candidate type options for bubble chart filter
const candidateTypeOptions = [
  { label: 'Candidates', value: 'Candidate' },
  { label: 'Approved products', value: 'Product' },
];


export default function Home() {
  const [product, setProduct] = useUrlState('product', [], arraySerializer);
  const [rdStage, setRdStage] = useUrlState('rdStage', [], arraySerializer);
  const [bubbleCandidateTypes, setBubbleCandidateTypes] = useUrlState('bubbleType', ['Candidate', 'Product'], arraySerializer);
  const [mapTab, setMapTab] = useUrlState('mapTab', 'trials', { ...stringSerializer, historyMode: 'push' });
  const [chartViewTab, setChartViewTab] = useUrlState('chartView', 'visual', stringSerializer);
  const [crossGlobalHealthArea, setCrossGlobalHealthArea] = useUrlState('crossGha', [], arraySerializer);
  const [crossProduct, setCrossProduct] = useUrlState('crossProduct', [], arraySerializer);
  // Hidden phase keys for the two StackedBarCharts. Storing hidden
  // (not visible) keeps the URL short when most phases are shown.
  const [portfolioHiddenPhases, setPortfolioHiddenPhases] = useUrlState('phide', [], arraySerializer);
  const [crossHiddenPhases, setCrossHiddenPhases] = useUrlState('cphide', [], arraySerializer);
  const [diseasePanelOpen, setDiseasePanelOpen] = useState(false);

  const bubbleChartRef = useRef(null);
  const worldMapRef = useRef(null);

  const { lastSyncDate, loading: syncDateLoading } = useLastSyncDate();
  const { kpis, loading: kpisLoading } = usePortfolioKPIs();
  const { bubbleData: gqlBubbleData, loading: bubbleLoading } = useGlobalHealthAreaSummaries(
    bubbleCandidateTypes.length === candidateTypeOptions.length ? null : bubbleCandidateTypes,
  );
  const { products, loading: productsLoading } = useProducts();
  const { phases, loading: phasesLoading } = usePhases();
  const { raw: diseasesRaw, loading: diseasesLoading } = useDiseases();
  const { pairs, loading: pairsLoading } = usePipelineFilterPairs();
  const { years: availableYears, loading: yearsLoading } = useAvailableYears();
  const { mapData: gqlMapData, distributionList: gqlMapDistribution, loading: mapLoading } = useGeographicDistribution(
    mapTab === 'trials' ? 'Trial Location' : 'Developer Location'
  );
  const expandedCrossProduct = expandProductKeySelection(crossProduct);
  const { chartData: temporalChartData, phases: temporalPhases, loading: temporalLoading } = useTemporalSnapshots(
    availableYears,
    crossGlobalHealthArea.length > 0 ? crossGlobalHealthArea : null,
    expandedCrossProduct.length > 0 ? expandedCrossProduct.map(v => parseInt(v, 10)) : null,
  );

  // R&D stage dropdown options from DB phases
  const rdStageOptions = useMemo(() =>
    phases.map(p => ({
      label: SIMPLIFIED_PHASE_NAMES[p.name] || p.name,
      value: p.name,
    })),
    [phases]
  );

  // Candidate type distribution with filters
  // Product keys are strings in state (URL-safe), convert to integers for the API.
  const expandedProduct = expandProductKeySelection(product);
  const { chartData: portfolioChartData, segments: portfolioSegments, loading: portfolioLoading } = useCandidateTypeDistribution(
    expandedProduct.length > 0 ? expandedProduct.map(v => parseInt(v, 10)) : expandedProduct,
    rdStage.length > 0 ? rdStage : null,
  );

  // Product options for dropdown (from API).
  // Values are strings to stay consistent with URL serialization.
  const allProductOptions = useMemo(() => {
    const raw = products.map(p => ({ label: p.product_name, value: String(p.product_key) }));
    return consolidateProductOptionsByKey(raw);
  }, [products]);

  // Portfolio section uses unfiltered product options (no cross-filtering needed)
  const productOptions = allProductOptions;

  // Cross-pipeline section: cross-filter GHA ↔ product via the hook
  const {
    healthAreaOptions: crossHealthAreaOptions,
    productOptions: crossProductFilteredOptions,
  } = useCrossFilteredOptions({
    data: { healthAreas: gqlBubbleData, diseasesRaw, pairs, allProductOptions },
    selections: { healthArea: crossGlobalHealthArea, disease: [], product: crossProduct },
    setters: { setHealthArea: setCrossGlobalHealthArea, setDisease: () => {}, setProduct: setCrossProduct },
    loading: { healthAreas: bubbleLoading, diseases: diseasesLoading, products: productsLoading, pairs: pairsLoading },
    mode: 'by-key',
  });

  // Convert hidden-phase arrays to { key: boolean } maps for StackedBarChart.
  const portfolioVisiblePhases = useMemo(() =>
    portfolioSegments.reduce((acc, p) => ({ ...acc, [p.key]: !portfolioHiddenPhases.includes(p.key) }), {}),
    [portfolioSegments, portfolioHiddenPhases]
  );
  const crossVisiblePhases = useMemo(() =>
    temporalPhases.reduce((acc, p) => ({ ...acc, [p.key]: !crossHiddenPhases.includes(p.key) }), {}),
    [temporalPhases, crossHiddenPhases]
  );
  const handlePortfolioVisiblePhasesChange = useCallback((next) => {
    setPortfolioHiddenPhases(Object.keys(next).filter(k => !next[k]));
  }, [setPortfolioHiddenPhases]);
  const handleCrossVisiblePhasesChange = useCallback((next) => {
    setCrossHiddenPhases(Object.keys(next).filter(k => !next[k]));
  }, [setCrossHiddenPhases]);

  return (
    <div className="flex min-h-[calc(100vh-74px)] bg-cream-200">
      {/* Sidebar */}
      <Sidebar activeId="home" />

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-8 bg-white p-4 sm:p-6 lg:px-8 -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 border-b border-gray-200">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-black mb-1">
                From discovery to approval: mapping the global health R&D pipeline
              </h1>
              <p className="text-sm text-gray-500">
                An end-to-end interactive view of the global health R&D pipeline, from investigational candidates to approved products reaching people in need.
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-lg">
              <ClockIcon className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-gray-500">
                {syncDateLoading ? (
                  <span className="animate-pulse">Loading...</span>
                ) : lastSyncDate ? (
                  <>Last updated on <strong className="text-black">
                    {new Date(lastSyncDate).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </strong></>
                ) : (
                  'Last updated date unavailable'
                )}
              </span>
            </div>
          </div>

          {/* Stat Cards - Connected to GraphQL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {kpisLoading ? (
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ))}
              </>
            ) : (
              kpis.map((kpi) => (
                <StatCard
                  key={kpi.id}
                  title={kpi.title}
                  value={kpi.value}
                  description={kpi.description}
                  buttonText={kpi.buttonText}
                  buttonHref={kpi.buttonHref}
                  onButtonClick={kpi.id === 'diseases' ? () => setDiseasePanelOpen(true) : undefined}
                  tooltip={kpi.tooltip}
                />
              ))
            )}
          </div>

          {/* Bubble Chart + World Map */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 items-stretch">
            {/* Bubble Chart Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-black mb-1">
                    Scale of R&D by global health area
                  </h3>
                  <p className="text-sm text-gray-500">
                    Toggle views: Candidates in development | Approved products
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Dropdown
                    value={bubbleCandidateTypes}
                    onChange={setBubbleCandidateTypes}
                    placeholder="All"
                    options={candidateTypeOptions}
                    multiSelect={true}
                    compact={true}
                  />
                  <ChartMenu
                    onDownloadCSV={() => {
                      const columns = [
                        { label: 'Global health area', accessor: 'name' },
                        { label: 'Total', accessor: 'value' },
                        { label: 'Candidates in development', accessor: 'candidateCount' },
                        { label: 'Approved products', accessor: 'productCount' },
                        { label: 'Diseases', accessor: 'diseaseCount' },
                      ];
                      const csv = buildCSV(columns, gqlBubbleData);
                      downloadCSVFile(csv, 'scale-of-rd');
                    }}
                    onDownloadPNG={() => downloadPNG(bubbleChartRef, 'scale-of-rd')}
                  />
                  <TabSwitcher
                    activeTab={chartViewTab}
                    onChange={setChartViewTab}
                    tabs={[
                      { value: 'visual', icon: PieChartIcon },
                      { value: 'table', icon: ListIcon },
                    ]}
                  />
                </div>
              </div>
              <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />
              <div ref={bubbleChartRef} className="flex-1">
              {bubbleLoading ? (
                <div className="h-[320px] flex items-center justify-center">
                  <div className="animate-pulse text-gray-400">Loading chart...</div>
                </div>
              ) : !gqlBubbleData || gqlBubbleData.length === 0 ? (
                <div className="h-[320px] flex items-center justify-center">
                  <div className="text-gray-400">No data available</div>
                </div>
              ) : chartViewTab === 'visual' ? (
                <BubbleChart
                  data={gqlBubbleData}
                  height={320}
                  colors={['#fe7449', '#f9a78d', '#8c4028']}
                />
              ) : (
                <ScrollableTable tableClassName="border-collapse">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-normal text-black bg-yellow-50 border-b border-gray-200">
                          Health area
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-normal text-black bg-yellow-50 border-b border-gray-200">
                          Total
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-normal text-black bg-yellow-50 border-b border-gray-200">
                          Candidates in development
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-normal text-black bg-yellow-50 border-b border-gray-200">
                          Approved products
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-normal text-black bg-yellow-50 border-b border-gray-200">
                          Share
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {gqlBubbleData.map((item) => {
                        const total = gqlBubbleData.reduce(
                          (sum, d) => sum + d.value,
                          0
                        );
                        return (
                          <tr
                            key={item.name}
                            className="hover:bg-cream-200 transition-colors"
                          >
                            <td className="px-4 py-3 text-sm text-black border-b border-gray-200">
                              {item.name}
                            </td>
                            <td className="px-4 py-3 text-sm text-black border-b border-gray-200 tabular-nums">
                              {item.value.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-black border-b border-gray-200 tabular-nums">
                              {item.candidateCount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-black border-b border-gray-200 tabular-nums">
                              {item.productCount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-black border-b border-gray-200 tabular-nums">
                              {total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                </ScrollableTable>
              )}
              </div>
              <p className="text-sm text-gray-500 mt-4 pt-4 border-t border-gray-200">
                This bubble chart shows the relative scale of the product development landscape across global health areas. Each bubble represents a global health  area, with its size indicating the number of products in scope. Use the dropdown menu to switch between candidates in development and approved products to compare where R&D activity and market-ready solutions are most concentrated.
              </p>
            </div>

            {/* World Map Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-black mb-1">
                    Geographic distribution of clinical trials and developers
                  </h3>
                  <p className="text-sm text-gray-500">
                    A global snapshot of R&D activity, highlighting where clinical trials are conducted and where product developers are based.
                  </p>
                </div>
                <ChartMenu
                  onDownloadCSV={() => {
                    const columns = [
                      { label: 'Country', accessor: 'country_name' },
                      { label: 'ISO code', accessor: 'iso_code' },
                      { label: 'Count', accessor: 'candidateCount' },
                    ];
                    const csv = buildCSV(columns, gqlMapDistribution);
                    downloadCSVFile(csv, 'geographic-distribution');
                  }}
                  onDownloadPNG={() => downloadPNG(worldMapRef, 'geographic-distribution')}
                />
              </div>
              <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />
              <div ref={worldMapRef} className="flex-1">
                <div className="mb-4">
                  <TabNav
                    activeTab={mapTab}
                    onChange={setMapTab}
                    tabs={[
                      { label: 'Location of clinical trials', value: 'trials' },
                      { label: 'Location of developers', value: 'development' },
                    ]}
                  />
                </div>
                {mapLoading ? (
                  <div className="h-[280px] flex items-center justify-center">
                    <div className="animate-pulse text-gray-400">Loading map...</div>
                  </div>
                ) : (
                  <WorldMap data={gqlMapData} height={280} showLegend={false} />
                )}
              </div>
              <p className="text-sm text-gray-500 mt-4 pt-4 border-t border-gray-200">
                This global heat map illustrates where R&D activity is concentrated across countries. Use the tabs to switch between the location of clinical trials and the location of developers. Darker shades indicate countries with a higher concentration of trials or developers, highlighting global research hubs as well as regions with limited R&D presence.
              </p>
            </div>
          </div>

          {/* Portfolio Overview by Global Health Area */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
              <h3 className="text-base sm:text-lg font-bold text-black">
                Portfolio overview by global health area
              </h3>
              <a
                href="/portfolio-analysis"
                className="inline-flex items-center bg-orange-500 text-black px-4 py-2.5 text-sm font-medium no-underline cursor-pointer hover:bg-black hover:text-white transition-colors"
              >
                Explore portfolio analysis
              </a>
            </div>
            <p className="text-xs text-gray-500 mb-5 max-w-4xl">
                A cross-section of the R&D pipeline by global health area and development stage. Each horizontal bar represents a global health area, with colour-coded segments showing the number of candidates and approved products. Use the filters below to focus on specific product types or R&D stage. Click items in the legend to turn individual stages on or off to compare how pipelines are distributed across the development lifecycle.
            </p>
            <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-4 mb-4">
              <div className="w-[280px]">
                <Dropdown
                  label="Product type"
                  value={product}
                  onChange={setProduct}
                  placeholder="All"
                  options={productOptions}
                  multiSelect={true}
                  showClearText={true}
                />
              </div>
              <div className="w-[280px]">
                <Dropdown
                  label="Select R&D stage"
                  value={rdStage}
                  onChange={setRdStage}
                  placeholder="All"
                  options={rdStageOptions}
                  multiSelect={true}
                  showSearch={true}
                  showClearText={true}
                />
              </div>
              <div className="flex-1" />
              <button
                onClick={() => {
                  setProduct([]);
                  setRdStage([]);
                }}
                disabled={product.length === 0 && rdStage.length === 0}
                className={`px-5 py-2.5 text-sm whitespace-nowrap font-medium border ${
                  product.length > 0 || rdStage.length > 0
                    ? 'text-[#262626] bg-gray-200 border-gray-300 hover:bg-gray-300 cursor-pointer'
                    : 'text-gray-400 bg-transparent border-gray-200 cursor-not-allowed'
                }`}
              >
                Reset filters
              </button>
            </div>

            {/* Chart */}
            {portfolioLoading || productsLoading || phasesLoading ? (
              <div className="h-[250px] flex items-center justify-center">
                <div className="animate-pulse text-gray-400">Loading chart...</div>
              </div>
            ) : (
              <StackedBarChart
                data={portfolioChartData}
                phases={portfolioSegments}
                layout="vertical"
                height={250}
                xAxisLabel="Number of candidates / approved products"
                yAxisLabel="Global health area"
                yAxisWidth={220}
                maxTickChars={40}
                showFilters={true}
                hideXAxisTicks={true}
                visiblePhases={portfolioVisiblePhases}
                onVisiblePhasesChange={handlePortfolioVisiblePhasesChange}
              />
            )}
          </div>

          {/* Cross-pipeline Analytics */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
              <h3 className="text-base sm:text-lg font-bold text-black">
                Cross-pipeline analytics
              </h3>
              <a
                href="/cross-pipeline-analytics"
                className="inline-flex items-center bg-orange-500 text-black px-4 py-2.5 text-sm font-medium no-underline cursor-pointer hover:bg-black hover:text-white transition-colors"
              >
                Make custom comparison
              </a>
            </div>
            <p className="text-xs text-gray-500 mb-5 max-w-4xl">
            A high-level view of how the global R&D pipeline evolves over time across development stages. This chart shows changes in the number of candidates in early development, late development and approved products across IGH review years. Use the filters to focus on a specific global health area or product type. Click on the legend to turn individual development stages on or off to compare how the pipelines are progressing through the R&D lifecycle over time.
            </p>
            <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-4 mb-4">
              <div className="w-[280px]">
                <Dropdown
                  label="Global health area"
                  value={crossGlobalHealthArea}
                  onChange={setCrossGlobalHealthArea}
                  placeholder="All"
                  options={crossHealthAreaOptions}
                  multiSelect={true}
                  showClearText={true}
                  loading={bubbleLoading}
                />
              </div>
              <div className="w-[280px]">
                <Dropdown
                  label="Product type"
                  value={crossProduct}
                  onChange={setCrossProduct}
                  placeholder="All"
                  options={crossProductFilteredOptions}
                  multiSelect={true}
                  showClearText={true}
                  loading={productsLoading}
                />
              </div>
              <div className="flex-1" />
              <button
                onClick={() => {
                  setCrossGlobalHealthArea([]);
                  setCrossProduct([]);
                }}
                disabled={crossGlobalHealthArea.length === 0 && crossProduct.length === 0}
                className={`px-5 py-2.5 text-sm whitespace-nowrap font-medium border ${
                  crossGlobalHealthArea.length > 0 || crossProduct.length > 0
                    ? 'text-[#262626] bg-gray-200 border-gray-300 hover:bg-gray-300 cursor-pointer'
                    : 'text-gray-400 bg-transparent border-gray-200 cursor-not-allowed'
                }`}
              >
                Reset filters
              </button>
            </div>

            {temporalLoading || yearsLoading ? (
              <div className="h-[220px] flex items-center justify-center">
                <div className="animate-pulse text-gray-400">Loading chart...</div>
              </div>
            ) : (
              <StackedBarChart
                data={temporalChartData}
                phases={temporalPhases}
                layout="vertical"
                height={220}
                xAxisLabel="Number of candidates / approved products"
                showFilters={true}
                hideXAxisTicks={true}
                visiblePhases={crossVisiblePhases}
                onVisiblePhasesChange={handleCrossVisiblePhasesChange}
              />
            )}
          </div>


          <ReportsAndInsights />
        </div>
      </main>

      <DiseaseListPanel
        isOpen={diseasePanelOpen}
        onClose={() => setDiseasePanelOpen(false)}
        diseases={diseasesRaw}
      />
    </div>
  );
}
