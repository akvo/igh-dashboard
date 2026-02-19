'use client';

import { useState, useMemo } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { StatCard, Dropdown, TabSwitcher, ChartMenu } from '@/components/ui';
import { UploadIcon, RefreshIcon, DownloadIcon, InfoIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon, CloudDownloadIcon, BoltIcon, ListIcon, ChartIcon, FilterIcon } from '@/components/icons';
import { StackedBarChart, DonutChart, BarChart, WorldMap } from '@/components/charts';
import { usePortfolioKPIs, useGlobalHealthAreaSummaries, useProducts, useDiseases, usePhases, useProductPhaseDistribution, useProductDistribution, useRegulatoryDistribution, useClinicalTrialStats, useClinicalTrials, usePortfolioCandidates, useGeographicDistribution } from '@/graphql/hooks';
import { SIMPLIFIED_PHASE_NAMES } from '@/lib/transformations/constants';

export default function PortfolioAnalysis() {
  const [activeTab, setActiveTab] = useState('explore');
  const [healthArea, setHealthArea] = useState([]);
  const [disease, setDisease] = useState([]);
  const [product, setProduct] = useState([]);
  const [productTypeFilter, setProductTypeFilter] = useState([]);
  const [portfolioTab, setPortfolioTab] = useState('candidates');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [trialsPage, setTrialsPage] = useState(1);
  const [candidatesPage, setCandidatesPage] = useState(1);
  const [approvedPage, setApprovedPage] = useState(1);
  const [extractPage, setExtractPage] = useState(1);
  const [extractTab, setExtractTab] = useState('candidates-approved');
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [columnSearchQuery, setColumnSearchQuery] = useState('');
  const [extractSearchQuery, setExtractSearchQuery] = useState('');
  const [extractHealthArea, setExtractHealthArea] = useState('');
  const [extractDisease, setExtractDisease] = useState('');
  const [extractProduct, setExtractProduct] = useState('');
  const [extractRdStage, setExtractRdStage] = useState('');

  // Fetch data from API
  const { kpis, loading: kpisLoading } = usePortfolioKPIs(healthArea, disease, product);
  const { bubbleData: healthAreas, loading: healthAreasLoading } = useGlobalHealthAreaSummaries();
  const { products: productsList, loading: productsLoading } = useProducts();
  const { diseases: diseasesList, loading: diseasesLoading } = useDiseases();
  const { phases, loading: phasesLoading } = usePhases();
  const { chartData: pipelineData, phases: pipelinePhases, loading: pipelineLoading } = useProductPhaseDistribution(healthArea, disease, product);
  const candidateTypeForApi = productTypeFilter.length === 1 ? productTypeFilter[0] : undefined;
  const { chartData: productTypesData, loading: productTypesLoading } = useProductDistribution(healthArea, disease, product, candidateTypeForApi);
  const { approvalStatus: approvalStatusData, whoPrequalification: whoPrequalData, approvingAuthorities: approvingAuthoritiesData, loading: regulatoryLoading } = useRegulatoryDistribution(healthArea, disease, product);

  const approvingAuthoritiesPhases = [
    { key: 'who_prequalified', label: 'WHO prequalified', color: '#fe7449' },
    { key: 'no_who_listing', label: 'No formal WHO listing', color: '#f9a78d' },
  ];
  const { totalTrials: ongoingTrials, statusDistribution: trialStatusData, ageGroupDistribution: ageGroupsData, loading: trialsLoading } = useClinicalTrialStats(healthArea, disease, product);
  const itemsPerPage = 10;
  const globalFilter = { globalHealthAreas: healthArea, diseaseNames: disease, productNames: product };
  const { candidates: candidatesData, totalCount: candidatesTotalCount, hasNextPage: candidatesHasNext, loading: candidatesLoading } = usePortfolioCandidates(
    { ...globalFilter, candidateType: 'Candidate', search: searchQuery || undefined }, itemsPerPage, (candidatesPage - 1) * itemsPerPage,
  );
  const { candidates: approvedProductsData, totalCount: approvedTotalCount, hasNextPage: approvedHasNext, loading: approvedLoading } = usePortfolioCandidates(
    { ...globalFilter, candidateType: 'Product' }, itemsPerPage, (approvedPage - 1) * itemsPerPage,
  );
  const extractFilter = {
    globalHealthAreas: extractHealthArea ? [extractHealthArea] : undefined,
    diseaseNames: extractDisease ? [extractDisease] : undefined,
    productNames: extractProduct ? [extractProduct] : undefined,
    phaseNames: extractRdStage ? [extractRdStage] : undefined,
    search: extractSearchQuery || undefined,
  };
  const { candidates: extractTableData, totalCount: extractTotalCount, hasNextPage: extractHasNext, loading: extractLoading } = usePortfolioCandidates(
    extractFilter, itemsPerPage, (extractPage - 1) * itemsPerPage,
  );
  const trialsPerPage = 10;
  const { trials: clinicalTrialsTableData, totalCount: trialsTotalCount, hasNextPage: trialsHasNextPage, loading: trialsListLoading } = useClinicalTrials(
    { globalHealthAreas: healthArea, diseaseNames: disease, productNames: product },
    trialsPerPage,
    (trialsPage - 1) * trialsPerPage,
  );
  const { mapData: clinicalTrialsMapData, loading: geoLoading } = useGeographicDistribution('Trial Location');

  // Health area options from API
  const healthAreaOptions = useMemo(() =>
    (healthAreas || []).map(item => ({ value: item.originalName, label: item.name })),
    [healthAreas]
  );

  // Product options from API
  const productOptions = useMemo(() =>
    (productsList || []).map(p => p.product_name),
    [productsList]
  );

  // Disease options from API (deduplicated)
  const diseaseOptions = useMemo(() =>
    [...new Set((diseasesList || []).map(d => d.name).filter(Boolean))],
    [diseasesList]
  );

  const handleClearFilters = () => {
    setHealthArea([]);
    setDisease([]);
    setProduct([]);
  };

  const hasFilters = healthArea.length > 0 || disease.length > 0 || product.length > 0;

  // Get KPI values
  const activeCandidates = kpis?.find(k => k.id === 'candidates')?.value || 0;
  const approvedProducts = kpis?.find(k => k.id === 'approved')?.value || 0;


  // Donut chart colors (enough for typical product count)
  const productTypeColors = [
    '#fe7449', '#a78bfa', '#f9a78d', '#ddd6fe',
    '#f0b456', '#54a5c4', '#8c4028', '#e3d6c1',
  ];

  // Dummy data for candidates table

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



  const ageGroupColors = ['#f9a78d', '#54a5c4', '#fe7449', '#ddd6fe', '#f0b456', '#a78bfa'];


  // Available columns for Extract custom details
  const availableColumns = [
    { id: 'gha', label: 'Global health area', accessor: 'global_health_area' },
    { id: 'disease', label: 'Disease', accessor: 'disease_name' },
    { id: 'secondaryDisease', label: 'Secondary disease', accessor: 'secondary_disease_name' },
    { id: 'product', label: 'Product', accessor: 'product_name' },
    { id: 'rdStage', label: 'R&D Stage', accessor: 'current_rd_stage' },
    { id: 'developers', label: 'Developers', accessor: 'developers_agg' },
    { id: 'indication', label: 'Indication', accessor: 'indication' },
    { id: 'indicationType', label: 'Indication type', accessor: 'indication_type' },
    { id: 'facilityLevel', label: 'Health care facility level', accessor: 'healthcare_facility_level' },
    { id: 'target', label: 'Target', accessor: 'target' },
    { id: 'moa', label: 'Mechanism of action', accessor: 'mechanism_of_action' },
    { id: 'techType', label: 'Technology type', accessor: 'technology_type' },
    { id: 'testFormat', label: 'Test format', accessor: 'test_format' },
    { id: 'preclinicalStatus', label: 'Preclinical results status', accessor: 'preclinical_results_status' },
    { id: 'preclinicalType', label: 'Type of preclinical results', accessor: 'type_of_preclinical_results' },
    { id: 'preclinicalSource', label: 'Preclinical results source', accessor: 'preclinical_results_source' },
    { id: 'keyFeatures', label: 'Key features & challenges', accessor: 'key_features' },
    { id: 'recentUpdates', label: 'Recent updates', accessor: 'recent_updates' },
  ];

  // Columns currently active based on user selection
  const activeExtractColumns = availableColumns.filter((col) => selectedColumns.includes(col.id));

  const filteredColumns = availableColumns.filter((col) =>
    col.label.toLowerCase().includes(columnSearchQuery.toLowerCase())
  );

  const handleSelectAllColumns = () => {
    setSelectedColumns(availableColumns.map((col) => col.id));
  };

  const handleClearColumns = () => {
    setSelectedColumns([]);
  };

  const handleToggleColumn = (colId) => {
    setSelectedColumns((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId]
    );
  };

  const handleResetExtractFilters = () => {
    setExtractHealthArea('');
    setExtractDisease('');
    setExtractProduct('');
    setExtractRdStage('');
    setExtractSearchQuery('');
    setExtractPage(1);
  };


  // R&D stage options from DB phases
  const rdStageOptions = useMemo(() =>
    phases.map(p => ({
      label: SIMPLIFIED_PHASE_NAMES[p.name] || p.name,
      value: p.name,
    })),
    [phases]
  );

  // Dummy data for technology types table
  const technologyTypesData = [
    { name: 'Immunoglobulin products - animal plasma/serum derived', discovery: 1, preClinical: 132, phase1: 1, phase2: 4, phase3: 1, approved: 0 },
    { name: 'Therapeutic - synthetic', discovery: 12, preClinical: 37, phase1: 1, phase2: 1, phase3: 0, approved: 0 },
    { name: 'Non-immunoglobulin products - animal/naturally derived; recombinant', discovery: 2, preClinical: 8, phase1: 0, phase2: 0, phase3: 0, approved: 0 },
    { name: 'Immunoglobulin products - recombinant', discovery: 6, preClinical: 24, phase1: 0, phase2: 0, phase3: 0, approved: 0 },
    { name: 'Therapeutic - natural/botanical', discovery: 12, preClinical: 42, phase1: 0, phase2: 0, phase3: 0, approved: 0 },
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
                  { value: 'explore', label: 'Explore visual insights', icon: ChartIcon },
                  { value: 'extract', label: 'Extract custom details', icon: ListIcon },
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
              />
            </div>

            {/* Filters for Explore tab */}
            {activeTab === 'explore' && (
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
                    label="Disease"
                    value={disease}
                    onChange={setDisease}
                    placeholder="All"
                    options={diseaseOptions}
                    multiSelect={true}
                    loading={diseasesLoading}
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
            )}

            {/* Sub-tabs for Extract tab */}
            {activeTab === 'extract' && (
              <div className="flex gap-6 border-b border-gray-200">
                {[
                  { value: 'candidates-approved', label: 'Candidates & Approved Products' },
                  { value: 'rd-priorities', label: 'R&D Priorities & Candidates' },
                  { value: 'clinical-trials', label: 'Clinical Trials & Candidates' },
                  { value: 'rd-only', label: 'R&D Priorities' },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setExtractTab(tab.value)}
                    className={`pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                      extractTab === tab.value
                        ? 'text-black border-orange-500'
                        : 'text-gray-400 border-transparent hover:text-gray-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Content based on active tab */}
          {activeTab === 'explore' ? (
            <>
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

              {/* Charts Grid */}
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
               A global overview of the R&D pipeline by product type and development stage. Each horizontal bar represents a product type, with colour‑coded segments showing how many candidates and approved products sit at each stage of the R&D lifecycle, from discovery and pre‑clinical through clinical phases to approval. Use the filters above to narrow the view by global health area, disease, or product type, and click items in the legend to toggle individual stages on or off and compare where activity is concentrated across the pipeline.
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
                      options={[
                        { label: 'Candidates', value: 'Candidate' },
                        { label: 'Products', value: 'Product' },
                      ]}
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
                  A snapshot of how the R&D pipeline is distributed across product types. Click on the drop-down to toggle between candidates, approved products or both.
                </p>

                <DonutChart
                  data={productTypesData}
                  colors={productTypeColors}
                  height={350}
                  innerRadius={55}
                  outerRadius={140}
                  showLegend={true}
                  legendPosition="top"
                />
              </div>
            </div>
            </>
          ) : (
            <div>
              {/* Main content card */}
              <div className="bg-white border border-gray-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="text-xl font-bold text-black mb-1">Candidates & Approved Products</h3>
                      <p className="text-sm text-gray-500">Select the columns you would like to include in the overview and click on apply.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search item"
                          value={extractSearchQuery}
                          onChange={(e) => setExtractSearchQuery(e.target.value)}
                          className="pl-10 pr-4 py-2 text-sm bg-gray-100 border-none w-64 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <button
                        className={`flex items-center gap-2 px-4 py-2 text-sm border ${
                          selectedColumns.length > 0
                            ? 'text-gray-600 border-gray-300 hover:bg-gray-50'
                            : 'text-gray-400 border-gray-200 cursor-not-allowed'
                        }`}
                        disabled={selectedColumns.length === 0}
                      >
                        <CloudDownloadIcon className="w-4 h-4" />
                        Download CSV
                      </button>
                    </div>
                  </div>

                  {/* Filters row */}
                  <div className="flex items-end gap-4 mt-4">
                    <div className="min-w-[180px]">
                      <Dropdown
                        label="Global health area"
                        value={extractHealthArea}
                        onChange={(v) => { setExtractHealthArea(v); setExtractPage(1); }}
                        placeholder="All"
                        options={healthAreaOptions}
                        compact={true}
                      />
                    </div>
                    <div className="min-w-[180px]">
                      <Dropdown
                        label="Disease"
                        value={extractDisease}
                        onChange={(v) => { setExtractDisease(v); setExtractPage(1); }}
                        placeholder="All"
                        options={diseaseOptions}
                        compact={true}
                      />
                    </div>
                    <div className="min-w-[180px]">
                      <Dropdown
                        label="Product"
                        value={extractProduct}
                        onChange={(v) => { setExtractProduct(v); setExtractPage(1); }}
                        placeholder="All"
                        options={productOptions}
                        compact={true}
                      />
                    </div>
                    <div className="min-w-[180px]">
                      <Dropdown
                        label="R&D stage"
                        value={extractRdStage}
                        onChange={(v) => { setExtractRdStage(v); setExtractPage(1); }}
                        placeholder="All"
                        options={rdStageOptions}
                        compact={true}
                      />
                    </div>
                    <div className="flex-1" />
                    <button
                      onClick={handleResetExtractFilters}
                      className="flex items-center gap-2 text-sm text-gray-500 border border-gray-200 px-4 hover:bg-gray-50 h-[36px]"
                    >
                      Reset filters
                      <RefreshIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Two column layout */}
                <div className="flex">
                  {/* Left: Available columns */}
                  <div className="w-[280px] border-r border-gray-200 p-4">
                    <h4 className="text-base font-bold text-black mb-4">Available columns</h4>
                    <div className="relative mb-4">
                      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search item"
                        value={columnSearchQuery}
                        onChange={(e) => setColumnSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100 border-none focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>

                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-600">Select columns</span>
                      <button
                        onClick={handleSelectAllColumns}
                        className="text-sm text-orange-500 hover:underline cursor-pointer border-none bg-transparent"
                      >
                        Select all
                      </button>
                    </div>

                    <div className="space-y-1 max-h-[400px] overflow-y-auto">
                      {filteredColumns.map((col) => (
                        <div
                          key={col.id}
                          className="flex items-center justify-between py-2 px-2 hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleToggleColumn(col.id)}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-4 h-4 border rounded flex items-center justify-center shrink-0 ${
                                selectedColumns.includes(col.id)
                                  ? 'border-orange-500 bg-orange-500'
                                  : 'border-gray-300 bg-white'
                              }`}
                            >
                              {selectedColumns.includes(col.id) && (
                                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </span>
                            <span className="text-sm text-gray-700">{col.label}</span>
                          </div>
                          <FilterIcon className="w-4 h-4 text-gray-400" />
                        </div>
                      ))}
                    </div>

                    {/* Apply / Clear buttons */}
                    <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
                      <button className="flex-1 px-4 py-2 text-sm font-medium text-orange-500 bg-transparent border border-orange-500 hover:bg-orange-50">
                        Apply
                      </button>
                      <button
                        onClick={handleClearColumns}
                        className="flex-1 px-4 py-2 text-sm text-gray-500 bg-gray-100 border-none hover:bg-gray-200"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Right: Data table or empty state */}
                  <div className="flex-1">
                    {selectedColumns.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-32">
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                          <InfoIcon className="w-6 h-6 text-orange-500" />
                        </div>
                        <h4 className="text-lg font-bold text-black mb-2">No columns selected</h4>
                        <p className="text-sm text-gray-500 text-center max-w-xs">
                          Select table columns you'd like to include in the overview
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]">Name</th>
                                {activeExtractColumns.map((col) => (
                                  <th key={col.id} className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE]">{col.label}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {extractTableData.map((item) => (
                                <tr key={item.candidate_key} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="py-4 px-4">
                                    <div className="text-sm font-medium text-black max-w-[300px]">{item.candidate_name || item.alternative_names}</div>
                                    <a href="#" className="text-sm text-orange-500 hover:underline">Explore →</a>
                                  </td>
                                  {activeExtractColumns.map((col) => (
                                    <td key={col.id} className="py-4 px-4 text-sm text-gray-600">{item[col.accessor]}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination */}
                        {(() => {
                          const totalPages = Math.ceil(extractTotalCount / itemsPerPage);
                          const maxVisible = 5;
                          const pages = Array.from({ length: Math.min(maxVisible, totalPages) }, (_, i) => i + 1);
                          return (
                            <div className="flex items-center justify-between px-4 py-4 border-t border-gray-200">
                              <div className="flex items-center gap-2">
                                <button className="p-2 text-gray-400 hover:bg-gray-100 rounded disabled:opacity-50" disabled={extractPage <= 1} onClick={() => setExtractPage(p => Math.max(1, p - 1))}><ChevronLeftIcon className="w-5 h-5" /></button>
                                {pages.map((page) => (
                                  <button key={page} onClick={() => setExtractPage(page)} className={`w-8 h-8 text-sm rounded ${extractPage === page ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{page}</button>
                                ))}
                                {totalPages > maxVisible && (<><span className="text-gray-400">...</span><button onClick={() => setExtractPage(totalPages)} className={`w-8 h-8 text-sm rounded ${extractPage === totalPages ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{totalPages}</button></>)}
                                <button className="p-2 text-gray-400 hover:bg-gray-100 rounded disabled:opacity-50" disabled={!extractHasNext} onClick={() => setExtractPage(p => p + 1)}><ChevronRightIcon className="w-5 h-5" /></button>
                              </div>
                              <span className="text-sm text-gray-500">{extractTotalCount} results</span>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Aggregated portfolio section - only in explore tab */}
          {activeTab === 'explore' && (
          <div className="bg-white border border-gray-200 p-6 mt-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-black">Aggregated portfolio</h3>
              <button className="p-2 text-gray-500 hover:bg-gray-100">
                <MoreHorizontalIcon className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              The aggregated portfolio lets you deepdive into four key views of the pipeline: active candidates, approved products, clinical trials and technology types. They can be accessed via the tabs below. All views reflect the pagelevel filters.
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
                    <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">{candidatesTotalCount} candidates</span>
                  </div>
                  <div className="flex items-center gap-3 h-[36px]">
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search item"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCandidatesPage(1); }}
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
                  This matrix grid shows candidates in development on your current page filter, with a text search option to quickly find specific records. It provides candidate level details such as name, R&D stage, developer, indication and additional attributes to support deeper portfolio analysis.
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
                      {candidatesData.map((candidate) => (
                        <tr key={candidate.candidate_key} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div className="text-sm font-medium text-black">{candidate.candidate_name}</div>
                            <a href="#" className="text-sm text-orange-500 hover:underline">Explore →</a>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">{candidate.global_health_area}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{candidate.disease_name}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{candidate.product_name}</td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-1 text-xs rounded ${getRdStageStyle(candidate.current_rd_stage)}`}>
                              {candidate.current_rd_stage}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">{candidate.alternative_names}</td>
                          <td className="py-4 px-4 text-sm text-gray-500 max-w-[200px] truncate">{candidate.countries_approved_agg}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {(() => {
                  const totalPages = Math.ceil(candidatesTotalCount / itemsPerPage);
                  const maxVisible = 5;
                  const pages = Array.from({ length: Math.min(maxVisible, totalPages) }, (_, i) => i + 1);
                  return (
                    <div className="flex items-center justify-between mt-6">
                      <div className="flex items-center gap-2">
                        <button className="p-2 text-gray-400 hover:bg-gray-100 rounded disabled:opacity-50" disabled={candidatesPage <= 1} onClick={() => setCandidatesPage(p => Math.max(1, p - 1))}><ChevronLeftIcon className="w-5 h-5" /></button>
                        {pages.map((page) => (
                          <button key={page} onClick={() => setCandidatesPage(page)} className={`w-8 h-8 text-sm rounded ${candidatesPage === page ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{page}</button>
                        ))}
                        {totalPages > maxVisible && (<><span className="text-gray-400">...</span><button onClick={() => setCandidatesPage(totalPages)} className={`w-8 h-8 text-sm rounded ${candidatesPage === totalPages ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{totalPages}</button></>)}
                        <button className="p-2 text-gray-400 hover:bg-gray-100 rounded disabled:opacity-50" disabled={!candidatesHasNext} onClick={() => setCandidatesPage(p => p + 1)}><ChevronRightIcon className="w-5 h-5" /></button>
                      </div>
                      <span className="text-sm text-gray-500">{candidatesTotalCount} results</span>
                    </div>
                  );
                })()}
              </>
            )}

            {/* Approved Product Tab Content */}
            {portfolioTab === 'approved' && (
              <>
                <p className="text-sm text-gray-500 mb-6">
                  This view includes summary charts showing approval status, approving authorities, and WHO prequalification, alongside a searchable table of approved products based on current filters. The table provides product‑level details such as name, indication, approval status, approving authorities, WHO prequalification status, and other key attributes.
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
                      This chart shows the total number of approved products by approval status. Each bar represents a specific approval status, enabling quick comparison across statuses.
                    </p>
                  </div>

                  {/* Approving Authorities */}
                  <div className="bg-white border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-bold text-black">Approving Authorities</h4>
                      <ChartMenu onDownloadCSV={() => {}} onDownloadPNG={() => {}} />
                    </div>
                    <StackedBarChart
                      data={approvingAuthoritiesData}
                      phases={approvingAuthoritiesPhases}
                      categoryKey="category"
                      layout="horizontal"
                      height={200}
                      showFilters={true}
                      barRadius={4}
                    />
                    <p className="text-xs text-gray-500 mt-4">
                      The chart compares the number of approved products by approving authorities, and the quantum of products with WHO prequalification for each authority.
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
                      A comparison of approved products that have a WHO prequalification. The WHO prequalification is a 'gold standard' for products intended for use in low and middle-income countries.
                    </p>
                  </div>
                </div>

                {/* Selected products section */}
                <div className="border border-gray-200">
                  {/* Title row */}
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <h4 className="text-xl font-bold text-black leading-none">Selected products</h4>
                      <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">{approvedTotalCount} products</span>
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
                      {approvedProductsData.map((item) => (
                        <tr key={item.candidate_key} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div className="text-sm font-medium text-black max-w-[250px]">{item.candidate_name}</div>
                            <a href="#" className="text-sm text-orange-500 hover:underline">Explore →</a>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600">{item.disease_name}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{item.product_name}</td>
                          <td className="py-4 px-4 text-sm text-gray-600">{item.current_rd_stage}</td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-1 text-xs rounded ${getRdStageStyle(item.approval_status)}`}>
                              {item.approval_status}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-1 text-xs rounded ${item.who_prequalification === 'Yes' ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-600'}`}>
                              {item.who_prequalification}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-600 text-center">{item.countries_approved_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {(() => {
                  const totalPages = Math.ceil(approvedTotalCount / itemsPerPage);
                  const maxVisible = 5;
                  const pages = Array.from({ length: Math.min(maxVisible, totalPages) }, (_, i) => i + 1);
                  return (
                    <div className="flex items-center justify-between px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-2 text-gray-400 hover:bg-gray-100 rounded disabled:opacity-50" disabled={approvedPage <= 1} onClick={() => setApprovedPage(p => Math.max(1, p - 1))}><ChevronLeftIcon className="w-5 h-5" /></button>
                        {pages.map((page) => (
                          <button key={page} onClick={() => setApprovedPage(page)} className={`w-8 h-8 text-sm rounded ${approvedPage === page ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{page}</button>
                        ))}
                        {totalPages > maxVisible && (<><span className="text-gray-400">...</span><button onClick={() => setApprovedPage(totalPages)} className={`w-8 h-8 text-sm rounded ${approvedPage === totalPages ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>{totalPages}</button></>)}
                        <button className="p-2 text-gray-400 hover:bg-gray-100 rounded disabled:opacity-50" disabled={!approvedHasNext} onClick={() => setApprovedPage(p => p + 1)}><ChevronRightIcon className="w-5 h-5" /></button>
                      </div>
                      <span className="text-sm text-gray-500">{approvedTotalCount} results</span>
                    </div>
                  );
                })()}
                </div>
              </>
            )}
            {portfolioTab === 'trials' && (
              <>
              <p className="text-sm text-gray-500 mb-6">
                  High-level overview of studies through an age group chart and a clinical trial status chart, helping users quickly understand patient demographics and trial progression. A global map and detailed table complement these visuals by showing geographic distribution and key trial attributes for deeper exploration and comparison.
                </p>
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
                      Proportion of clinical trial participants in each age bracket, highlighting which age groups are most and least represented across the portfolio.
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
                      The clinical trial status chart shows the number of studies at each stage, from ongoing to completed, providing a quick view of overall trial progress across the portfolio.
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
                    The spatial heat map shows the country-level distribution of clinical trials, with darker shade  indicating countries with higher number of studies, and can be filtered by clinical trial status.
                  </p>
                  <WorldMap data={clinicalTrialsMapData} height={400} showLegend={false} />
                </div>

                {/* Selected clinical trials section */}
                <div className="border border-gray-200 mt-6">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <h4 className="text-xl font-bold text-black leading-none">Selected clinical trials</h4>
                        <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">{trialsTotalCount} Trials</span>
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
                      The clinical trial table is a matrix of individual studies, providing granular details such as title, clinical trial status, location, start date, URL and more. The table can be searched using a text search box and (filtered results) can be exported as a .csv file.
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
                        {clinicalTrialsTableData.map((item) => (
                          <tr key={item.trial_id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-4 px-4 text-sm text-gray-600">{item.trial_name || item.clinicaltrialid}</td>
                            <td className="py-4 px-4">
                              <div className="text-sm font-medium text-black max-w-[300px]">{item.trial_title}</div>
                              <a href="#" className="text-sm text-orange-500 hover:underline">Explore →</a>
                            </td>
                            <td className="py-4 px-4">
                              <span className={`px-2 py-1 text-xs rounded ${getRdStageStyle(item.trial_phase)}`}>
                                {item.trial_phase}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-sm text-gray-600">{item.candidate_name}</td>
                            <td className="py-4 px-4 text-sm text-gray-600">{item.disease_name}</td>
                            <td className="py-4 px-4 text-sm text-gray-600">{item.product_name}</td>
                            <td className="py-4 px-4 text-sm text-gray-600">{item.start_date}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {(() => {
                    const totalPages = Math.ceil(trialsTotalCount / trialsPerPage);
                    const maxVisible = 5;
                    const pages = Array.from({ length: Math.min(maxVisible, totalPages) }, (_, i) => i + 1);
                    return (
                      <div className="flex items-center justify-between px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            className="p-2 text-gray-400 hover:bg-gray-100 rounded disabled:opacity-50"
                            disabled={trialsPage <= 1}
                            onClick={() => setTrialsPage(p => Math.max(1, p - 1))}
                          >
                            <ChevronLeftIcon className="w-5 h-5" />
                          </button>
                          {pages.map((page) => (
                            <button
                              key={page}
                              onClick={() => setTrialsPage(page)}
                              className={`w-8 h-8 text-sm rounded ${
                                trialsPage === page
                                  ? 'bg-orange-500 text-white'
                                  : 'text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                          {totalPages > maxVisible && (
                            <>
                              <span className="text-gray-400">...</span>
                              <button
                                onClick={() => setTrialsPage(totalPages)}
                                className={`w-8 h-8 text-sm rounded ${trialsPage === totalPages ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                              >
                                {totalPages}
                              </button>
                            </>
                          )}
                          <button
                            className="p-2 text-gray-400 hover:bg-gray-100 rounded disabled:opacity-50"
                            disabled={!trialsHasNextPage}
                            onClick={() => setTrialsPage(p => p + 1)}
                          >
                            <ChevronRightIcon className="w-5 h-5" />
                          </button>
                        </div>
                        <span className="text-sm text-gray-500">{trialsTotalCount} results</span>
                      </div>
                    );
                  })()}
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
                    The technology type table is a matrix showing each technology category by stage of development, including approved products. This highlights how technologies are distributed across the R&D lifecycle. The table can be searched using the a text search box to quicly locate specific technologies and (filtered results) can be exported as a .csv file.
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
          )}
        </div>
      </main>
    </div>
  );
}
