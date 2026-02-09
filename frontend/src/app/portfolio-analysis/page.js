'use client';

import { useState, useMemo } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { StatCard, Dropdown, TabSwitcher, ChartMenu } from '@/components/ui';
import { UploadIcon, RefreshIcon, DownloadIcon, InfoIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon, CloudDownloadIcon, BoltIcon } from '@/components/icons';
import { StackedBarChart, DonutChart, BarChart, WorldMap } from '@/components/charts';
import { usePortfolioKPIs, useGlobalHealthAreaSummaries, useProducts } from '@/graphql/hooks';

export default function PortfolioAnalysis() {
  const [activeTab, setActiveTab] = useState('explore');
  const [healthArea, setHealthArea] = useState([]);
  const [disease, setDisease] = useState([]);
  const [product, setProduct] = useState([]);
  const [productTypeFilter, setProductTypeFilter] = useState([]);
  const [portfolioTab, setPortfolioTab] = useState('candidates');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch data from API
  const { kpis, loading: kpisLoading } = usePortfolioKPIs();
  const { bubbleData: healthAreas, loading: healthAreasLoading } = useGlobalHealthAreaSummaries();
  const { products: productsList, loading: productsLoading } = useProducts();

  // Health area options from API
  const healthAreaOptions = useMemo(() =>
    (healthAreas || []).map(item => item.name),
    [healthAreas]
  );

  // Product options from API
  const productOptions = useMemo(() =>
    (productsList || []).map(p => p.product_name),
    [productsList]
  );

  // Dummy diseases for now (backend has this endpoint)
  const diseaseOptions = [
    'Malaria',
    'Tuberculosis',
    'HIV/AIDS',
    'COVID-19',
    'Dengue',
    'Zika',
  ];

  const handleClearFilters = () => {
    setHealthArea([]);
    setDisease([]);
    setProduct([]);
  };

  const hasFilters = healthArea.length > 0 || disease.length > 0 || product.length > 0;

  // Get KPI values
  const activeCandidates = kpis?.find(k => k.id === 'candidates')?.value || 0;
  const approvedProducts = kpis?.find(k => k.id === 'approved')?.value || 0;

  // Dummy data for clinical trials (not in current API)
  const ongoingTrials = 42;

  // Dummy data for Global pipeline overview chart
  const pipelinePhases = [
    { key: 'discovery', label: 'Discovery', color: '#8c4028' },
    { key: 'preClinical', label: 'Pre-clinical', color: '#fe7449' },
    { key: 'phase1', label: 'Phase 1', color: '#f9a78d' },
    { key: 'phase2', label: 'Phase 2', color: '#ddd6fe' },
    { key: 'phase3', label: 'Phase 3', color: '#a78bfa' },
    { key: 'approved', label: 'Approved', color: '#f0b456' },
  ];

  const pipelineData = [
    { category: 'Diagnostics', discovery: 30, preClinical: 45, phase1: 60, phase2: 80, phase3: 50, approved: 40 },
    { category: 'Vaccines', discovery: 40, preClinical: 55, phase1: 70, phase2: 90, phase3: 60, approved: 50 },
    { category: 'Drugs', discovery: 25, preClinical: 35, phase1: 40, phase2: 30, phase3: 20, approved: 15 },
    { category: 'Microbicides', discovery: 35, preClinical: 50, phase1: 65, phase2: 85, phase3: 70, approved: 45 },
    { category: 'Biologics', discovery: 45, preClinical: 60, phase1: 75, phase2: 95, phase3: 65, approved: 55 },
    { category: 'VCP', discovery: 20, preClinical: 30, phase1: 45, phase2: 55, phase3: 35, approved: 25 },
  ];

  // Dummy data for Product types donut chart
  const productTypesData = [
    { name: 'Vaccines', value: 120 },
    { name: 'Drugs', value: 85 },
    { name: 'Diagnostics', value: 95 },
    { name: 'Biologics', value: 60 },
    { name: 'VCP', value: 45 },
    { name: 'Dietary supplement', value: 30 },
    { name: 'Microbicides', value: 55 },
    { name: 'Microbial interventions', value: 25 },
  ];

  const productTypeColors = [
    '#fe7449', // Vaccines - orange
    '#a78bfa', // Drugs - purple
    '#f9a78d', // Diagnostics - peach
    '#ddd6fe', // Biologics - light purple
    '#f0b456', // VCP - gold
    '#54a5c4', // Dietary supplement - teal
    '#8c4028', // Microbicides - brown
    '#e3d6c1', // Microbial interventions - beige
  ];

  // Dummy data for candidates table
  const candidatesData = [
    { name: 'DPP Fever Panel II Asia IgM', gha: 'Emerging infectious disease', disease: 'Zika', product: 'Diagnostics', rdStage: 'Unknown', altNames: 'Unknown', approved: 'It is a rapid multiplex detection of IgM...' },
    { name: 'TRURAPID MPXV Ag Test', gha: 'Emerging infectious disease', disease: 'Dengue', product: 'Drugs', rdStage: 'Phase 2', altNames: 'Unknown', approved: 'It is a rapid multiplex detection of IgM...' },
    { name: 'NABIT Mpox Test', gha: 'Emerging infectious disease', disease: 'Tuberculosis', product: 'Drugs', rdStage: 'Discovery', altNames: 'Unknown', approved: 'It is a rapid multiplex detection of IgM...' },
    { name: 'Moxidectin - Onchocerciasis', gha: 'Emerging infectious disease', disease: 'Malaria', product: 'Drugs', rdStage: 'Unknown', altNames: 'Unknown', approved: 'It is a rapid multiplex detection of IgM...' },
    { name: 'Comparative Study of MMV371 LAI and Existing Treatments for Efficacy', gha: 'Emerging infectious disease', disease: 'COVID-19', product: 'Drugs', rdStage: 'Unknown', altNames: 'Unknown', approved: 'It is a rapid multiplex detection of IgM...' },
    { name: 'Post-Marketing Surveillance of MMV371 LAI in Diverse Populations', gha: 'Emerging infectious disease', disease: 'Hepatitis', product: 'Drugs', rdStage: 'Unknown', altNames: 'Unknown', approved: 'It is a rapid multiplex detection of IgM...' },
  ];

  const getRdStageStyle = (stage) => {
    switch (stage) {
      case 'Phase 2': return 'bg-orange-100 text-orange-700';
      case 'Phase 1': return 'bg-orange-100 text-orange-600';
      case 'Discovery': return 'bg-red-100 text-red-700';
      case 'Pre clinical': return 'bg-purple-100 text-purple-700';
      case 'Approved': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  // Dummy data for approved products table
  const approvedProductsData = [
    { name: 'Single Ascending Dose Study to Assess the Safety, Tolerability and Pharmacokinetics of...', disease: 'Malaria', product: 'Drugs', ageSpecific: 'No data available', researchStatus: 'Approved', whoPrequal: 'yes', countries: 0 },
    { name: 'Phase 2 Clinical Trial to Evaluate the Efficacy of MMV371 LAI in Patients with Chronic Conditio...', disease: 'Dengue', product: 'Drugs', ageSpecific: '18+', researchStatus: 'Phase 2', whoPrequal: 'no', countries: 1 },
    { name: 'Long-Term Safety Study of MMV371 LAI in Pediatric Participants', disease: 'Tuberculosis', product: 'Drugs', ageSpecific: '6+', researchStatus: 'Phase 1', whoPrequal: 'yes', countries: 2 },
    { name: 'MMV371 LAI Dosing Regimen Study for Optimal Therapeutic Outcomes', disease: 'HIV/AIDS', product: 'Drugs', ageSpecific: '12+', researchStatus: 'Pre clinical', whoPrequal: 'no', countries: 3 },
    { name: 'Comparative Study of MMV371 LAI and Existing Treatments for Efficacy', disease: 'COVID-19', product: 'Drugs', ageSpecific: '3+', researchStatus: 'Discovery', whoPrequal: 'yes', countries: 4 },
    { name: 'Post-Marketing Surveillance of MMV371 LAI in Diverse Populations', disease: 'Hepatitis', product: 'Drugs', ageSpecific: 'All Ages', researchStatus: 'Unknown', whoPrequal: 'no', countries: 5 },
  ];

  // Dummy data for approval status chart
  const approvalStatusData = [
    { name: 'Approved', value: 170 },
    { name: 'Used off-label', value: 25 },
    { name: 'Withdraw', value: 95 },
    { name: 'Emergency Use', value: 65 },
    { name: 'Review', value: 75 },
    { name: 'Unknown', value: 55 },
  ];

  // Dummy data for WHO prequalification donut
  const whoPrequalData = [
    { name: 'Yes', value: 65 },
    { name: 'No', value: 35 },
  ];

  // Dummy data for age groups in clinical trials
  const ageGroupsData = [
    { name: 'Neonates', value: 15 },
    { name: 'Infants', value: 25 },
    { name: 'Children', value: 35 },
    { name: 'Adolescents', value: 20 },
    { name: 'Young adults (18-45)', value: 30 },
    { name: 'Older adults (45+)', value: 25 },
  ];

  const ageGroupColors = ['#f9a78d', '#54a5c4', '#fe7449', '#ddd6fe', '#f0b456', '#a78bfa'];

  // Dummy data for clinical trial status
  const trialStatusData = [
    { name: 'Terminated', value: 2 },
    { name: 'Active', value: 5 },
    { name: 'Completed', value: 4 },
    { name: 'Suspended', value: 3 },
    { name: 'Withdrawn', value: 1 },
    { name: 'Unknown', value: 4 },
  ];

  // Dummy map data for clinical trials
  const clinicalTrialsMapData = {
    US: 150, BR: 80, CN: 120, IN: 90, RU: 60, AU: 40, ZA: 30, NG: 25, KE: 20, EG: 15,
  };

  // Dummy data for technology types table
  const technologyTypesData = [
    { name: 'Immunoglobulin products - animal plasma/serum derived', discovery: 1, preClinical: 132, phase1: 1, phase2: 4, phase3: 1, approved: 0 },
    { name: 'Therapeutic - synthetic', discovery: 12, preClinical: 37, phase1: 1, phase2: 1, phase3: 0, approved: 0 },
    { name: 'Non-immunoglobulin products - animal/naturally derived; recombinant', discovery: 2, preClinical: 8, phase1: 0, phase2: 0, phase3: 0, approved: 0 },
    { name: 'Immunoglobulin products - recombinant', discovery: 6, preClinical: 24, phase1: 0, phase2: 0, phase3: 0, approved: 0 },
    { name: 'Therapeutic - natural/botanical', discovery: 12, preClinical: 42, phase1: 0, phase2: 0, phase3: 0, approved: 0 },
  ];

  // Dummy data for clinical trials table
  const clinicalTrialsTableData = [
    { name: 'NCT06558643', title: 'Single Ascending Dose Study to Assess the Safety, Tolerability and Pharmacokinetics of MMV371 LAI i...', phase: 'Pre clinical', candidate: 'MMV371', disease: 'Malaria', product: 'Drugs', startDate: '2024-08' },
    { name: 'NCT06558644', title: 'Phase 2 Clinical Trial to Evaluate the Efficacy of MMV371 LAI in Patients with Chronic Conditions', phase: 'Phase 2', candidate: 'MMV372', disease: 'Dengue', product: 'Drugs', startDate: '2024-08' },
    { name: 'NCT06558645', title: 'Long-Term Safety Study of MMV371 LAI in Pediatric Participants', phase: 'Pre clinical', candidate: 'MMV373', disease: 'Tuberculosis', product: 'Drugs', startDate: '2024-08' },
    { name: 'NCT06558646', title: 'MMV371 LAI Dosing Regimen Study for Optimal Therapeutic Outcomes', phase: 'Approved', candidate: 'MMV374', disease: 'HIV/AIDS', product: 'Drugs', startDate: '2024-08' },
    { name: 'NCT06558647', title: 'Comparative Study of MMV371 LAI and Existing Treatments for Efficacy', phase: 'Phase 1', candidate: 'MMV375', disease: 'COVID-19', product: 'Drugs', startDate: '2024-08' },
    { name: 'NCT06558648', title: 'Post-Marketing Surveillance of MMV371 LAI in Diverse Populations', phase: 'Phase 1', candidate: 'MMV376', disease: 'Hepatitis', product: 'Drugs', startDate: '2024-09' },
  ];

  return (
    <div className="flex min-h-[calc(100vh-74px)] bg-cream-200">
      <Sidebar activeId="portfolio-analysis" />

      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="p-4 sm:p-6 lg:p-8 lg:px-10">
          {/* Page Header */}
          <div className="flex flex-col gap-6 mb-8 bg-white p-4 sm:p-6 sm:px-10 -mx-4 sm:-mx-6 lg:-mx-10 -mt-4 sm:-mt-6 lg:-mt-8">
            {/* Title Row */}
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-black mb-2">
                  Portfolio Analysis
                </h1>
                <p className="text-sm text-gray-500 max-w-3xl">
                  Explore the global R&D pipeline for each global health area, disease or product type through two lenses.
                  Use the Explore visual insights view to analyze portfolio trends through interactive charts and maps,
                  or switch to the Extract custom details tab to build a filtered data table tailored to your needs and
                  export your findings as a .csv file for further analysis.
                </p>
              </div>
              <button className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[#E76A42] bg-[#FE74491F] hover:bg-[#FE74492F] whitespace-nowrap">
                Share this view
                <UploadIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Tab Switcher and AI Link */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <TabSwitcher
                tabs={[
                  { value: 'explore', label: 'Explore visual insights' },
                  { value: 'extract', label: 'Extract custom details' },
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
              />
              <a
                href="#"
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-300 px-4 py-2"
              >
                <BoltIcon className="w-4 h-4" />
                Try AI page for Pipeline statistic <span className="text-orange-500 ml-1">*beta*</span>
              </a>
            </div>

            {/* Filters */}
            <div className="flex items-end gap-4">
              <div className="min-w-[220px]">
                <Dropdown
                  label="Global health area"
                  value={healthArea}
                  onChange={setHealthArea}
                  placeholder="All"
                  options={healthAreaOptions}
                  multiSelect={true}
                  loading={healthAreasLoading}
                />
              </div>
              <div className="min-w-[220px]">
                <Dropdown
                  label="Diseases"
                  value={disease}
                  onChange={setDisease}
                  placeholder="All"
                  options={diseaseOptions}
                  multiSelect={true}
                />
              </div>
              <div className="min-w-[220px]">
                <Dropdown
                  label="Product"
                  value={product}
                  onChange={setProduct}
                  placeholder="All"
                  options={productOptions}
                  multiSelect={true}
                  loading={productsLoading}
                />
              </div>
              <div className="flex-1" />
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-2 text-sm text-gray-500 bg-gray-100 border border-gray-200 px-4 hover:bg-gray-200 h-[44px]"
              >
                Clear
                <RefreshIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Pipeline Stats */}
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
              <>
                <StatCard
                  title="Pipeline"
                  value={activeCandidates}
                  description="Active candidates"
                  tooltip="Number of candidates currently in active development"
                />
                <StatCard
                  title="Pipeline"
                  value={ongoingTrials}
                  description="Ongoing clinical trials"
                  tooltip="Number of clinical trials currently in progress"
                />
                <StatCard
                  title="Pipeline"
                  value={approvedProducts}
                  description="Approved products"
                  tooltip="Number of products that have received approval"
                />
              </>
            )}
          </div>

          {/* Content based on active tab */}
          {activeTab === 'explore' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Global pipeline overview - takes 2 columns */}
              <div className="lg:col-span-2 bg-white border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-black">Global pipeline overview</h3>
                  <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200">
                    Export Visual
                    <DownloadIcon className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-6">
                  A cross-section of the pipeline by product type. Each horizontal bar represents a product type. The color coded
                  segments indicate the amount of candidates currently in each stage of development. The global health area, disease and
                  product filter can by used, to zoom in to the specified part of the pipeline.
                </p>

                <StackedBarChart
                  data={pipelineData}
                  phases={pipelinePhases}
                  layout="vertical"
                  height={350}
                  xAxisLabel="Amount of Candidates/Products"
                  yAxisLabel="Product type"
                  showFilters={true}
                />

                {/* Last data update footer */}
                <div className="mt-4 bg-orange-50 px-4 py-3 flex items-center justify-center gap-2">
                  <InfoIcon className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-gray-700">Last data update: <strong>12 Jan 2025</strong></span>
                </div>
              </div>

              {/* Product types - takes 1 column */}
              <div className="bg-white border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-black">Product types</h3>
                  <div className="flex items-center gap-2">
                    <Dropdown
                      value={productTypeFilter}
                      onChange={setProductTypeFilter}
                      placeholder="All"
                      options={['Candidates', 'Products']}
                      multiSelect={true}
                      compact={true}
                      className="w-32"
                    />
                    <ChartMenu
                      onDownloadCSV={() => console.log('Download CSV')}
                      onDownloadPNG={() => console.log('Download PNG')}
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-6">
                  Show overview of the amount of candidates or approved products per product type.
                </p>

                <DonutChart
                  data={productTypesData}
                  colors={productTypeColors}
                  height={280}
                  innerRadius={70}
                  outerRadius={110}
                  showLegend={true}
                  legendPosition="top"
                />
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-center py-12 bg-white border border-gray-200">
              Extract custom details content will go here (Data table with pagination)
            </div>
          )}

          {/* Aggregated portfolio section */}
          <div className="bg-white border border-gray-200 p-6 mt-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-black">Aggregated portfolio</h3>
              <button className="p-2 text-gray-500 hover:bg-gray-100">
                <MoreHorizontalIcon className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Switch between the tabs below to deep-dive into active candidates, the approved products, the clinical trials or the technology type within your selection of the pipeline.
            </p>

            {/* Tabs */}
            <div className="flex gap-6 border-b border-gray-200 mb-6">
              {['candidates', 'approved', 'trials', 'technology'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setPortfolioTab(tab)}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                    portfolioTab === tab
                      ? 'text-black border-black'
                      : 'text-gray-400 border-transparent hover:text-gray-600'
                  }`}
                >
                  {tab === 'candidates' && 'Candidates'}
                  {tab === 'approved' && 'Approved product'}
                  {tab === 'trials' && 'Clinical trials'}
                  {tab === 'technology' && 'Technology'}
                </button>
              ))}
            </div>

            {/* Candidates Tab Content */}
            {portfolioTab === 'candidates' && (
              <>
                {/* Title row */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h4 className="text-xl font-bold text-black leading-none">Selected candidates</h4>
                    <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">240 candidates</span>
                  </div>
                  <div className="flex items-center gap-3 h-[36px]">
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search item"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 text-sm bg-gray-100 border-none w-64 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200">
                      <CloudDownloadIcon className="w-4 h-4" />
                      Download CSV
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-500 mb-6">
                  This matrix grid shows the technology types for which candidates are being developed against the R&D stages. It provides an overview of the portfolio's progress for each technology type. The numbers insight each cell indicate the total candidates matching the technology and the phase.
                </p>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]">Name</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]">GHA</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]">Disease</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]">Product</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]">Current R&D Stage</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]">Alternative names</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]">Approved</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidatesData.map((candidate, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div className="text-sm font-medium text-black">{candidate.name}</div>
                            <a href="#" className="text-sm text-orange-500 hover:underline">Explore →</a>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">{candidate.gha}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{candidate.disease}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{candidate.product}</td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-1 text-xs rounded ${getRdStageStyle(candidate.rdStage)}`}>
                              {candidate.rdStage}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">{candidate.altNames}</td>
                          <td className="py-4 px-4 text-sm text-gray-500 max-w-[200px] truncate">{candidate.approved}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-6">
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-400 hover:bg-gray-100 rounded">
                      <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    {[1, 2, 3, 4, 5].map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 text-sm rounded ${
                          currentPage === page
                            ? 'bg-orange-500 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <span className="text-gray-400">...</span>
                    <button className="w-8 h-8 text-sm text-gray-600 hover:bg-gray-100 rounded">10</button>
                    <button className="p-2 text-gray-400 hover:bg-gray-100 rounded">
                      <ChevronRightIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    Results per page:
                    <Dropdown
                      value={[]}
                      onChange={() => {}}
                      placeholder="6"
                      options={['6', '12', '24', '48']}
                      compact={true}
                      className="w-20"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Approved Product Tab Content */}
            {portfolioTab === 'approved' && (
              <>
                <p className="text-sm text-gray-500 mb-6">
                  This section provides a comprehensive overview of products that have successfully transitioned from the development pipeline to regulatory approval. Use the data below to track the availability of approved products across your selected health areas, disease and product type.
                </p>

                {/* Three chart cards */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
                  {/* Approval status */}
                  <div className="bg-white border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-bold text-black">Approval status</h4>
                      <ChartMenu onDownloadCSV={() => {}} onDownloadPNG={() => {}} />
                    </div>
                    <BarChart data={approvalStatusData} height={200} />
                    <p className="text-xs text-gray-500 mt-4">
                      A detailed look at the approving authorities and what type of approval they have given to the products.
                    </p>
                  </div>

                  {/* Approving Authorities */}
                  <div className="bg-white border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-bold text-black">Approving Authorities</h4>
                      <ChartMenu onDownloadCSV={() => {}} onDownloadPNG={() => {}} />
                    </div>
                    <div className="h-[200px] flex items-center justify-center text-gray-400">
                      Grouped bar chart placeholder
                    </div>
                    <p className="text-xs text-gray-500 mt-4">
                      A detailed look at the approving authorities and what type of approval they have given to the products.
                    </p>
                  </div>

                  {/* WHO prequalification */}
                  <div className="bg-white border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-bold text-black">WHO prequalification</h4>
                      <ChartMenu onDownloadCSV={() => {}} onDownloadPNG={() => {}} />
                    </div>
                    <DonutChart
                      data={whoPrequalData}
                      colors={['#fe7449', '#e3d6c1']}
                      height={180}
                      innerRadius={50}
                      outerRadius={80}
                      showLegend={true}
                      legendPosition="bottom"
                    />
                    <p className="text-xs text-gray-500 mt-4">
                      A comparison of approved products that have a WHO prequalification. The WHO prequalification is a "gold standard" for products intended for use in low and middle-income countries.
                    </p>
                  </div>
                </div>

                {/* Selected products section */}
                <div className="border border-gray-200">
                  {/* Title row */}
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <h4 className="text-xl font-bold text-black leading-none">Selected products</h4>
                      <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">240 candidates</span>
                    </div>
                    <div className="flex items-center gap-3 h-[36px]">
                      <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search item"
                          className="pl-10 pr-4 py-2 text-sm bg-gray-100 border-none w-64 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200">
                        <CloudDownloadIcon className="w-4 h-4" />
                        Download CSV
                      </button>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]">Name</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]">Disease</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]">Product</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]">Age specific</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]">Research status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]">WHO prequalification</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]"># of countries with approval</th>
                      </tr>
                    </thead>
                    <tbody>
                      {approvedProductsData.map((item, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div className="text-sm font-medium text-black max-w-[250px]">{item.name}</div>
                            <a href="#" className="text-sm text-orange-500 hover:underline">Explore →</a>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">{item.disease}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{item.product}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{item.ageSpecific}</td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-1 text-xs rounded ${getRdStageStyle(item.researchStatus)}`}>
                              {item.researchStatus}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-1 text-xs rounded ${item.whoPrequal === 'yes' ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-600'}`}>
                              {item.whoPrequal}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600 text-center">{item.countries}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-4">
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-400 hover:bg-gray-100 rounded">
                      <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    {[1, 2, 3, 4, 5].map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 text-sm rounded ${
                          currentPage === page
                            ? 'bg-orange-500 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <span className="text-gray-400">...</span>
                    <button className="w-8 h-8 text-sm text-gray-600 hover:bg-gray-100 rounded">10</button>
                    <button className="p-2 text-gray-400 hover:bg-gray-100 rounded">
                      <ChevronRightIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    Results per page:
                    <Dropdown
                      value={[]}
                      onChange={() => {}}
                      placeholder="6"
                      options={['6', '12', '24', '48']}
                      compact={true}
                      className="w-20"
                    />
                  </div>
                </div>
                </div>
              </>
            )}
            {portfolioTab === 'trials' && (
              <>
                {/* Two chart cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                  {/* Age groups in clinical trials */}
                  <div className="bg-white border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-bold text-black">Age groups in clinical trials</h4>
                      <ChartMenu onDownloadCSV={() => {}} onDownloadPNG={() => {}} />
                    </div>
                    <div className="border-t border-gray-100 pt-4">
                      <DonutChart
                        data={ageGroupsData}
                        colors={ageGroupColors}
                        height={280}
                        innerRadius={70}
                        outerRadius={120}
                        showLegend={true}
                        legendPosition="bottom"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-4">
                      An overview of the demographics currently represented in clinical research. Each segment represents a different age group.
                    </p>
                  </div>

                  {/* Clinical trial status */}
                  <div className="bg-white border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-bold text-black">Clinical trial status</h4>
                      <ChartMenu onDownloadCSV={() => {}} onDownloadPNG={() => {}} />
                    </div>
                    <div className="border-t border-gray-100 pt-4">
                      <BarChart data={trialStatusData} height={280} />
                    </div>
                    <p className="text-xs text-gray-500 mt-4">
                      The chart categorizes the clinical trials into six states: active, completed, terminated, suspended, withdrawn and unknown.
                    </p>
                  </div>
                </div>

                {/* Geographic distribution */}
                <div className="bg-white border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-lg font-bold text-black">Geographic distribution of clinical trials</h4>
                    <div className="flex items-center gap-2">
                      <Dropdown
                        value={[]}
                        onChange={() => {}}
                        placeholder="All"
                        options={['All', 'Active', 'Completed', 'Terminated']}
                        compact={true}
                        className="w-32"
                      />
                      <ChartMenu onDownloadCSV={() => {}} onDownloadPNG={() => {}} />
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mb-6">
                    The map shows the spatial distribution of where clinical trials are physically located across the globe. Darker shades indicate countries with a higher concentration of active trials, highlighting global research hubs and potential gaps in testing location.
                  </p>
                  <WorldMap data={clinicalTrialsMapData} height={400} showLegend={false} />
                </div>

                {/* Selected clinical trials section */}
                <div className="border border-gray-200 mt-6">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <h4 className="text-xl font-bold text-black leading-none">Selected clinical trials</h4>
                        <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">128 Trials</span>
                      </div>
                      <div className="flex items-center gap-3 h-[36px]">
                        <div className="relative">
                          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Search"
                            className="pl-10 pr-4 py-2 text-sm bg-gray-100 border-none w-64 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200">
                          <CloudDownloadIcon className="w-4 h-4" />
                          Download CSV
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">
                      Detailed information on all clinical trials currently meeting the filter criteria.
                    </p>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]">Name</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]">CT title</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]">Phase</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]">Candidate</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]">Disease</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]">Product</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]">Start date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clinicalTrialsTableData.map((item, index) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-4 px-4 text-sm text-gray-600">{item.name}</td>
                            <td className="py-4 px-4">
                              <div className="text-sm font-medium text-black max-w-[300px]">{item.title}</div>
                              <a href="#" className="text-sm text-orange-500 hover:underline">Explore →</a>
                            </td>
                            <td className="py-4 px-4">
                              <span className={`px-2 py-1 text-xs rounded ${getRdStageStyle(item.phase)}`}>
                                {item.phase}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-sm text-gray-600">{item.candidate}</td>
                            <td className="py-4 px-4 text-sm text-gray-600">{item.disease}</td>
                            <td className="py-4 px-4 text-sm text-gray-600">{item.product}</td>
                            <td className="py-4 px-4 text-sm text-gray-600">{item.startDate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-gray-400 hover:bg-gray-100 rounded">
                        <ChevronLeftIcon className="w-5 h-5" />
                      </button>
                      {[1, 2, 3, 4, 5].map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 text-sm rounded ${
                            currentPage === page
                              ? 'bg-orange-500 text-white'
                              : 'text-gray-600 hover:bg-gray-100'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                      <span className="text-gray-400">...</span>
                      <button className="w-8 h-8 text-sm text-gray-600 hover:bg-gray-100 rounded">10</button>
                      <button className="p-2 text-gray-400 hover:bg-gray-100 rounded">
                        <ChevronRightIcon className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      Results per page:
                      <Dropdown
                        value={[]}
                        onChange={() => {}}
                        placeholder="6"
                        options={['6', '12', '24', '48']}
                        compact={true}
                        className="w-20"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
            {portfolioTab === 'technology' && (
              <div className="border border-gray-200">
                {/* Header */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <h4 className="text-xl font-bold text-black leading-none">Technology types</h4>
                      <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">12 Products</span>
                    </div>
                    <div className="flex items-center gap-3 h-[36px]">
                      <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search item"
                          className="pl-10 pr-4 py-2 text-sm bg-gray-100 border-none w-64 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200">
                        <CloudDownloadIcon className="w-4 h-4" />
                        Download CSV
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    This matrix grid shows the technology types for which candidates are being developed against the R&D stages. It provides an overview of the portfolio's progress for each technology type. The numbers insight each cell indicate the total candidates matching the technology and the phase.
                  </p>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]">Name</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]">Discovery</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]">Pre-clinical</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]">Phase 1</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]">Phase 2</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]">Phase 3</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]">Approved</th>
                      </tr>
                    </thead>
                    <tbody>
                      {technologyTypesData.map((item, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-4 text-sm text-gray-800 max-w-[250px]">{item.name}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{item.discovery}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{item.preClinical}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{item.phase1}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{item.phase2}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{item.phase3}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{item.approved}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-4 py-4">
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-400 hover:bg-gray-100 rounded">
                      <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    {[1, 2, 3, 4, 5].map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 text-sm rounded ${
                          currentPage === page
                            ? 'bg-orange-500 text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <span className="text-gray-400">...</span>
                    <button className="w-8 h-8 text-sm text-gray-600 hover:bg-gray-100 rounded">10</button>
                    <button className="p-2 text-gray-400 hover:bg-gray-100 rounded">
                      <ChevronRightIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    Results per page:
                    <Dropdown
                      value={[]}
                      onChange={() => {}}
                      placeholder="6"
                      options={['6', '12', '24', '48']}
                      compact={true}
                      className="w-20"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
