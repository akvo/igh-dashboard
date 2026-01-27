'use client';

import { useState, useRef, useCallback } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { StatCard, Dropdown, TabSwitcher, TabNav, ChartMenu } from '@/components/ui';
import { TextLink } from '@/components/ui/Button';
import {
  BubbleChart,
  StackedBarChart,
  WorldMap,
  DonutChart,
} from '@/components/charts';
import {
  PieChartIcon,
  ListIcon,
  MoreHorizontalIcon,
  ClockIcon,
} from '@/components/icons';

// Sample data
const bubbleData = [
  { name: 'Neglected diseases', value: 2101 },
  { name: "Women's health", value: 1591 },
  { name: 'Emerging infectious diseases', value: 953 },
];

const portfolioData = [
  {
    category: "Women's Health",
    preClinical: 40,
    phase1: 55,
    phase2: 80,
    phase3: 60,
    phase4: 30,
    approved: 35,
  },
  {
    category: 'Emerging Infectious Diseases',
    preClinical: 60,
    phase1: 70,
    phase2: 90,
    phase3: 50,
    phase4: 25,
    approved: 40,
  },
  {
    category: 'Neglected diseases',
    preClinical: 80,
    phase1: 85,
    phase2: 70,
    phase3: 45,
    phase4: 20,
    approved: 50,
  },
];

const crossPipelineData = [
  {
    category: '2019',
    preClinical: 50,
    phase1: 60,
    phase2: 80,
    phase3: 55,
    phase4: 30,
    approved: 25,
  },
  {
    category: '2023',
    preClinical: 65,
    phase1: 75,
    phase2: 95,
    phase3: 60,
    phase4: 35,
    approved: 40,
  },
  {
    category: '2024',
    preClinical: 80,
    phase1: 85,
    phase2: 100,
    phase3: 65,
    phase4: 40,
    approved: 50,
  },
];

const priorityDonutData = [
  { name: 'Yes', value: 40 },
  { name: 'NA', value: 35 },
  { name: 'No', value: 25 },
];

const priorityDonutColors = ['#fe7449', '#f9a78d', '#ffd4c7'];

const priorityBarPhases = [
  { key: 'segment1', label: 'High priority', color: '#8c4028' },
  { key: 'segment2', label: 'Medium priority', color: '#fe7449' },
  { key: 'segment3', label: 'Low priority', color: '#f9a78d' },
  { key: 'segment4', label: 'Minimal', color: '#ffd4c7' },
];

const priorityBarData = [
  {
    category: 'Neglected',
    segment1: 30,
    segment2: 25,
    segment3: 20,
    segment4: 15,
  },
  {
    category: 'Infectious',
    segment1: 40,
    segment2: 35,
    segment3: 25,
    segment4: 20,
  },
  {
    category: "Women's",
    segment1: 15,
    segment2: 12,
    segment3: 10,
    segment4: 8,
  },
];

const worldMapData = {
  840: 45, // United States
  356: 38, // India
  156: 30, // China
  '076': 25, // Brazil
  566: 22, // Nigeria
  404: 20, // Kenya
  710: 18, // South Africa
  764: 15, // Thailand
  826: 35, // United Kingdom
  276: 28, // Germany
  250: 22, // France
  '036': 12, // Australia
  392: 32, // Japan
  124: 28, // Canada
  484: 16, // Mexico
  '032': 14, // Argentina
  170: 12, // Colombia
  818: 10, // Egypt
  800: 19, // Uganda
  834: 17, // Tanzania
  180: 15, // DR Congo
  231: 13, // Ethiopia
  288: 11, // Ghana
  608: 20, // Philippines
  360: 18, // Indonesia
  '050': 22, // Bangladesh
  586: 16, // Pakistan
  704: 14, // Vietnam
  752: 24, // Sweden
  756: 26, // Switzerland
  528: 20, // Netherlands
  380: 18, // Italy
  724: 16, // Spain
  '056': 22, // Belgium
  578: 20, // Norway
  410: 30, // South Korea
};

const healthAreaOptions = [
  'Neglected Diseases',
  "Women's Health",
  'Emerging Infectious Diseases',
];

const productOptions = [
  'Vaccines',
  'Drugs',
  'Diagnostics',
  'Biologics',
  'Dietary supplements',
  'VCP',
];

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
  const priorityBarRef = useRef(null);
  const priorityDonutRef = useRef(null);

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

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <StatCard
              title="Number of diseases"
              value={111}
              description="Total number of diseases"
              buttonText="Explore pipeline for diseases"
              tooltip="All diseases tracked in the pipeline"
            />
            <StatCard
              title="Total number of candidates"
              value={4022}
              description="Total number of candidates."
              buttonText="Explore candidates"
              tooltip="All candidates in the pipeline"
            />
            <StatCard
              title="Approved products"
              value={200}
              description="Total number of approved products."
              buttonText="Explore approved products"
              tooltip="Products that received approval"
            />
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
                    onDownloadCSV={() => downloadCSV(bubbleData, 'scale-of-innovation')}
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
              {chartViewTab === 'visual' ? (
                <BubbleChart
                  data={bubbleData}
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
                      {bubbleData.map((item) => {
                        const total = bubbleData.reduce(
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
                    const mapDataArray = Object.entries(worldMapData).map(([code, value]) => ({ countryCode: code, value }));
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
                <WorldMap data={worldMapData} height={280} showLegend={false} />
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
            <StackedBarChart
              data={portfolioData}
              layout="vertical"
              height={250}
              xAxisLabel="Amount of Candidates"
              showFilters={true}
            />
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
            <StackedBarChart
              data={crossPipelineData}
              layout="vertical"
              height={220}
              xAxisLabel="Amount of Candidates"
              showFilters={true}
            />
          </div>

          {/* Priority Alignment */}
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
              <button className="px-5 py-2 text-sm font-medium text-black bg-transparent border border-gray-200 rounded-lg cursor-pointer">
                View all
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Priorities Column */}
              <div className="flex flex-col gap-4">
                {/* Priorities Header Card */}
                <div className="rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-base font-semibold text-black">
                      Priorities
                    </span>
                    <button className="border-none bg-[#F2F2F4] cursor-pointer p-3 rounded-[10px] hover:bg-gray-200 transition-colors">
                      <MoreHorizontalIcon className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>
                  <div className="text-3xl sm:text-4xl font-extrabold text-black mb-1">
                    164
                  </div>
                  <p className="text-sm text-gray-500">
                    Total number of priorities
                  </p>
                </div>

                {/* Health Area Cards with mini progress */}
                {[
                  { name: 'Neglected diseases', percent: 20 },
                  { name: 'Emerging infectious diseases', percent: 10 },
                  { name: "Women's health", percent: 5 },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="rounded-xl border border-gray-200 p-6 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-black mb-1">
                        {item.name}
                      </h4>
                      <p className="text-xs text-gray-500">
                        Share with dedicated priority.
                      </p>
                    </div>
                    {/* Mini circular progress */}
                    <div className="relative w-16 h-16 shrink-0 ml-4">
                      <svg
                        className="w-full h-full -rotate-90"
                        viewBox="0 0 36 36"
                      >
                        <circle
                          cx="18"
                          cy="18"
                          r="15"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="3"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="15"
                          fill="none"
                          stroke="#fe7449"
                          strokeWidth="3"
                          strokeDasharray={`${item.percent * 0.942} 94.2`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-black">
                        {item.percent}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Share of diseases with priority */}
              <div className="rounded-xl border border-gray-200 p-6 flex flex-col">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <span className="text-base sm:text-lg font-bold text-black block mb-1">
                      Share of diseases with priority
                    </span>
                    <p className="text-sm text-gray-500">
                      Total amount of diseases with priority
                    </p>
                  </div>
                  <ChartMenu
                    onDownloadCSV={() => downloadCSV(priorityBarData, 'share-of-diseases-with-priority')}
                    onDownloadPNG={() => downloadPNG(priorityBarRef, 'share-of-diseases-with-priority')}
                  />
                </div>
                <div className="border-b border-gray-200 mb-4"></div>
                <div className="mt-auto" ref={priorityBarRef}>
                  <StackedBarChart
                    data={priorityBarData}
                    phases={priorityBarPhases}
                    layout="horizontal"
                    height={320}
                    showFilters={false}
                  />
                </div>
              </div>

              {/* Share of priorities dedicated to women or children */}
              <div className="rounded-xl border border-gray-200 p-6 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-base sm:text-lg font-bold text-black">
                    Share of priorities dedicated to women or children
                  </span>
                  <ChartMenu
                    onDownloadCSV={() => downloadCSV(priorityDonutData, 'share-of-priorities-women-children')}
                    onDownloadPNG={() => downloadPNG(priorityDonutRef, 'share-of-priorities-women-children')}
                  />
                </div>
                <div className="border-b border-gray-200 mb-4"></div>
                <div className="mt-auto" ref={priorityDonutRef}>
                  <DonutChart
                    data={priorityDonutData}
                    colors={priorityDonutColors}
                    height={340}
                    innerRadius={60}
                    outerRadius={125}
                    showLegend={true}
                  />
                </div>
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
