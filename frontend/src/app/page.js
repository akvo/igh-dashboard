'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { StatCard, Dropdown, TabSwitcher, TabNav, ChartMenu } from '@/components/ui';
import { TextLink } from '@/components/ui/Button';
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
  usePhaseDistribution,
  useGeographicDistribution,
  useTemporalSnapshots,
  useProducts,
} from '@/graphql/hooks';

// Map display names to API names for health areas
const healthAreaDisplayToApi = {
  'Neglected diseases': 'Neglected disease',
  "Women's health": 'Sexual & reproductive health',
  'Emerging infectious diseases': 'Emerging infectious disease',
};

// R&D stage options for filtering (these map to phase labels)
const rdStageOptions = [
  'Pre-clinical',
  'Phase 1',
  'Phase 2',
  'Phase 3',
  'Phase 4',
  'Approved',
];

export default function Home() {
  const [healthArea, setHealthArea] = useState([]);
  const [product, setProduct] = useState([]);
  const [rdStage, setRdStage] = useState([]);
  const [mapTab, setMapTab] = useState('trials');
  const [chartViewTab, setChartViewTab] = useState('visual');

  const bubbleChartRef = useRef(null);
  const worldMapRef = useRef(null);

  const { kpis, loading: kpisLoading } = usePortfolioKPIs();
  const { bubbleData: gqlBubbleData, loading: bubbleLoading } = useGlobalHealthAreaSummaries();
  const { products, loading: productsLoading } = useProducts();
  const { mapData: gqlMapData, loading: mapLoading } = useGeographicDistribution(
    mapTab === 'trials' ? 'Trial Location' : 'Developer Location'
  );
  const { chartData: temporalChartData, phases: temporalPhases, loading: temporalLoading } = useTemporalSnapshots([2023, 2024]);

  // Convert filter selections to API params
  const selectedHealthAreaApi = healthArea.length > 0 ? healthAreaDisplayToApi[healthArea[0]] : null;
  const selectedProductKey = product.length > 0 ? product[0] : null;

  // Phase distribution with filters
  const { chartData: portfolioChartData, phases: portfolioPhases, loading: portfolioLoading } = usePhaseDistribution(
    selectedHealthAreaApi,
    selectedProductKey
  );

  // Product options for dropdown (from API)
  const productOptions = useMemo(() =>
    products.map(p => ({ label: p.product_name, value: p.product_key })),
    [products]
  );

  // Filter phases client-side based on R&D stage selection
  const filteredPortfolioPhases = useMemo(() => {
    if (rdStage.length === 0) return portfolioPhases;

    // Map R&D stage display names to phase labels
    const stageToPhaseMap = {
      'Pre-clinical': ['Discovery', 'Preclinical', 'Screening'],
      'Phase 1': ['Phase I'],
      'Phase 2': ['Phase II'],
      'Phase 3': ['Phase III'],
      'Phase 4': ['Phase IV'],
      'Approved': ['PQ/Approval', 'Reg Filing'],
    };

    const allowedLabels = rdStage.flatMap(stage => stageToPhaseMap[stage] || []);
    return portfolioPhases.filter(phase => allowedLabels.includes(phase.label));
  }, [portfolioPhases, rdStage]);

  // Filter chart data to only include selected phases
  const filteredPortfolioChartData = useMemo(() => {
    if (rdStage.length === 0) return portfolioChartData;

    const allowedKeys = filteredPortfolioPhases.map(p => p.key);
    return portfolioChartData.map(row => {
      const filtered = { category: row.category };
      allowedKeys.forEach(key => {
        if (row[key] !== undefined) filtered[key] = row[key];
      });
      return filtered;
    });
  }, [portfolioChartData, filteredPortfolioPhases, rdStage]);

  // Health area options derived from API data
  const healthAreaOptions = useMemo(() =>
    (gqlBubbleData || []).map(item => item.name),
    [gqlBubbleData]
  );

  // Download CSV function
  const downloadCSV = useCallback((data, filename) => {
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Download PNG function using html2canvas
  const downloadPNG = useCallback(async (ref, filename) => {
    if (!ref.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(ref.current, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.png`;
      a.click();
    } catch (error) {
      console.error('Error generating PNG:', error);
    }
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-74px)] bg-cream-200">
      {/* Sidebar */}
      <Sidebar activeId="home" />

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="p-4 sm:p-6 lg:p-8 lg:px-10">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-8 bg-white p-4 sm:p-6 sm:px-10 -mx-4 sm:-mx-6 lg:-mx-10 -mt-4 sm:-mt-6 lg:-mt-8">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-black mb-1">
                Global portfolio overview
              </h1>
              <p className="text-sm text-gray-500">
                Lorem ipsum dolor sit amet consectetur. Lectus urna netus nunc
                magna rhoncus porttitor.
              </p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 rounded-lg">
              <ClockIcon className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-gray-500">
                Last updated on <strong className="text-black">12.04.24</strong>
              </span>
            </div>
          </div>

          {/* Stat Cards - Connected to GraphQL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
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
                  tooltip={kpi.description}
                />
              ))
            )}
          </div>

          {/* Bubble Chart + World Map */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Bubble Chart Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-black mb-1">
                    Scale of innovation efforts across health pipelines
                  </h3>
                  <p className="text-sm text-gray-500">
                    Click on tabular view to see a list of diseases with amount
                    of candidates and products
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ChartMenu
                    onDownloadCSV={() => downloadCSV(gqlBubbleData, 'scale-of-innovation')}
                    onDownloadPNG={() => downloadPNG(bubbleChartRef, 'scale-of-innovation')}
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
              <div ref={bubbleChartRef}>
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
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-normal text-black bg-yellow-50 border-b border-gray-200">
                          Health Area
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-normal text-black bg-yellow-50 border-b border-gray-200">
                          Candidates
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
                              {((item.value / total) * 100).toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              </div>
              <p className="text-sm text-gray-500 mt-4 pt-4 border-t border-gray-200">
                An overview of R&D volume categorized by global health area.
                This bubble chart visualizes the relative scale of investment
                and activity across Neglected Diseases, Women&apos;s Health, and
                Emerging Infectious Diseases.
              </p>
            </div>

            {/* World Map Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-black mb-1">
                    Geographic distribution research
                  </h3>
                  <p className="text-sm text-gray-500">
                    Number of IGH pipeline products approved across countries
                    (2025)
                  </p>
                </div>
                <ChartMenu
                  onDownloadCSV={() => {
                    const mapDataArray = Object.entries(gqlMapData).map(([code, value]) => ({ countryCode: code, value }));
                    downloadCSV(mapDataArray, 'geographic-distribution');
                  }}
                  onDownloadPNG={() => downloadPNG(worldMapRef, 'geographic-distribution')}
                />
              </div>
              <div ref={worldMapRef}>
                <div className="mb-4">
                  <TabNav
                    activeTab={mapTab}
                    onChange={setMapTab}
                    tabs={[
                      { label: 'Location of clinical trials', value: 'trials' },
                      { label: 'Location of development', value: 'development' },
                    ]}
                  />
                </div>
                <WorldMap data={gqlMapData} height={280} showLegend={false} />
              </div>
              <p className="text-sm text-gray-500 mt-4 pt-4 border-t border-gray-200">
                A global heat map illustrating the concentration of R&D pipeline
                activity and product approvals. This map identifies regional
                hubs of innovation and highlights areas with the highest density
                of clinical progress.
              </p>
            </div>
          </div>

          {/* Portfolio Overview by Global Health Area */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
              <h3 className="text-base sm:text-lg font-bold text-black">
                Portfolio overview by Global Health Area
              </h3>
              <a
                href="/portfolio"
                className="inline-flex items-center bg-[#FE74491F] text-[#E76A42] px-4 py-2.5 rounded-lg text-sm font-medium no-underline cursor-pointer hover:bg-[#FE74492F] transition-colors"
              >
                Explore Portfolio Analysis
              </a>
            </div>
            <p className="text-xs text-gray-500 mb-5 max-w-4xl">
              A breakdown of the global pipeline for each global health area.
              The illustration shows the distribution of R&D activities across
              clinical stages, from pre clinical through to approved products.
              The graph is segmented by global health area. The separate
              clinical stages can be turned on and off by clicking on the
              legend.
            </p>

            {/* Filters */}
            <div className="flex flex-wrap items-end gap-4 mb-5">
              <div className="flex-1 min-w-[180px]">
                <Dropdown
                  label="Global health area"
                  value={healthArea}
                  onChange={setHealthArea}
                  placeholder="All"
                  options={healthAreaOptions}
                  multiSelect={true}
                  showClearText={true}
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <Dropdown
                  label="Product"
                  value={product}
                  onChange={setProduct}
                  placeholder="All"
                  options={productOptions}
                  multiSelect={true}
                  showClearText={true}
                />
              </div>
              <div className="flex-1 min-w-[180px]">
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
              <button
                onClick={() => {
                  setHealthArea([]);
                  setProduct([]);
                  setRdStage([]);
                }}
                className="px-5 py-2.5 text-sm text-gray-500 bg-transparent border border-gray-200 rounded-lg cursor-pointer whitespace-nowrap font-medium"
              >
                Reset filters
              </button>
            </div>

            {/* Chart */}
            {portfolioLoading || productsLoading ? (
              <div className="h-[250px] flex items-center justify-center">
                <div className="animate-pulse text-gray-400">Loading chart...</div>
              </div>
            ) : (
              <StackedBarChart
                data={filteredPortfolioChartData}
                phases={filteredPortfolioPhases}
                layout="vertical"
                height={250}
                xAxisLabel="Amount of Candidates"
                showFilters={true}
              />
            )}
          </div>

          {/* Cross-pipeline Analytics */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
              <h3 className="text-base sm:text-lg font-bold text-black">
                Cross pipeline analytics
              </h3>
              <a
                href="/cross-pipeline"
                className="inline-flex items-center bg-[#FE74491F] text-[#E76A42] px-4 py-2.5 rounded-lg text-sm font-medium no-underline cursor-pointer hover:bg-[#FE74492F] transition-colors"
              >
                Make custom comparison
              </a>
            </div>
            <p className="text-xs text-gray-500 mb-5 max-w-4xl">
              This visualization tracks the evolution of the global pipeline
              over time. It is showing how candidates have successfully
              progressed through clinical phases toward market readiness. In the
              make custom comparison page, it is possible to set up your own
              comparison of a pipeline over time, or between two or more
              diseases.
            </p>
            {temporalLoading ? (
              <div className="h-[220px] flex items-center justify-center">
                <div className="animate-pulse text-gray-400">Loading chart...</div>
              </div>
            ) : (
              <StackedBarChart
                data={temporalChartData}
                phases={temporalPhases}
                layout="vertical"
                height={220}
                xAxisLabel="Amount of Candidates"
                showFilters={true}
              />
            )}
          </div>

          {/* Priority Alignment - Data not available from API */}
          <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-black mb-1">
                  Priority Alignment
                </h3>
                <p className="text-sm text-gray-500">
                  Compare WHO priorities with pipeline
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-gray-400 mb-2">Data not available from API</p>
                <p className="text-xs text-gray-300">Priority alignment data is not yet supported by the backend</p>
              </div>
            </div>
          </div>

          {/* Reports and Insights */}
          <div className="bg-black rounded-2xl p-5 sm:p-8 lg:p-10 mb-10">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Reports and Insights
              </h2>
              <button className="px-5 py-2 text-sm font-medium text-white bg-transparent border border-white/30 rounded-lg cursor-pointer">
                View all insights
              </button>
            </div>
            <p className="text-sm text-white/60 mb-6">
              Discover the insights that two decades of global health data have
              given us.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 md:grid-rows-2 gap-4">
              {/* Report Card 1 - Top Left (horizontal) */}
              <div className="bg-[#FBF6EB] rounded-xl overflow-hidden flex flex-col sm:flex-row">
                <div className="h-36 sm:h-auto sm:w-40 shrink-0 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-300 to-yellow-500" />
                </div>
                <div className="p-4 sm:p-5 flex-1 flex flex-col">
                  <h4 className="text-sm font-semibold text-black mb-2">
                    The ripple effect: how global health R&D delivers for
                    everyone
                  </h4>
                  <p className="text-xs text-gray-500 mb-3">
                    This report shows how investments in global health R&D
                    deliver significant health and economic progress for HI...
                  </p>
                  <TextLink className="mt-auto">Read more</TextLink>
                </div>
              </div>

              {/* Report Card 2 - Right (tall, spans 2 rows) */}
              <div className="bg-[#FBF6EB] rounded-xl overflow-hidden md:row-span-2 flex flex-col">
                <div className="h-44 sm:h-56 relative shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-800 to-orange-500" />
                </div>
                <div className="p-4 sm:p-5 flex-1 flex flex-col">
                  <h4 className="text-sm sm:text-base font-semibold text-black mb-2">
                    State of disunion: The impact of US funding cuts on global
                    health R&D
                  </h4>
                  <p className="text-xs text-gray-500 mb-3">
                    This report offers a quantified assessment of the actual and
                    potential impact of the 2025 US funding cuts giving a
                    system-wide, data-driven picture of the ripple effects by...
                  </p>
                  <TextLink className="mt-auto">Read more</TextLink>
                </div>
              </div>

              {/* Report Card 3 - Bottom Left (horizontal) */}
              <div className="bg-[#FBF6EB] rounded-xl overflow-hidden flex flex-col sm:flex-row">
                <div className="h-36 sm:h-auto sm:w-40 shrink-0 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-400 to-gray-600" />
                </div>
                <div className="p-4 sm:p-5 flex-1 flex flex-col">
                  <h4 className="text-sm font-semibold text-black mb-2">
                    From malaria research to protecting aging populations: AS01
                    Adjuvant in Shingrix
                  </h4>
                  <p className="text-xs text-gray-500 mb-3">
                    This case study focuses on the benefits of AS01 adjuvant,
                    initially advanced through malaria research...
                  </p>
                  <TextLink className="mt-auto">Read more</TextLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
