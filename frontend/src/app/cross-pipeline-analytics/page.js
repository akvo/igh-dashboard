'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { Dropdown, ChartMenu } from '@/components/ui';
import { UploadIcon, RefreshIcon, InfoIcon, MoreHorizontalIcon } from '@/components/icons';
import { StackedBarChart } from '@/components/charts';

export default function CrossPipelineAnalytics() {
  const [healthArea, setHealthArea] = useState('');
  const [disease, setDisease] = useState('');
  const [product, setProduct] = useState('');
  const [selectedPhases, setSelectedPhases] = useState(['discovery', 'preClinical', 'phase1', 'phase2', 'phase3', 'approved']);

  // Multi-variable section state
  const [compareDisease, setCompareDisease] = useState('');
  const [compareYear, setCompareYear] = useState('');
  const [compareSeveralDiseases, setCompareSeveralDiseases] = useState(false);
  const [selectedProductTab, setSelectedProductTab] = useState('all');
  const [comparedTo, setComparedTo] = useState('');

  // Options
  const healthAreaOptions = ['Neglected diseases', 'Emerging infectious disease', 'HIV/AIDS', 'Malaria', 'Tuberculosis'];
  const diseaseOptions = ['Malaria', 'HIV', 'Dengue', 'Tuberculosis', 'COVID-19', 'Zika'];
  const productOptions = ['Drugs', 'Vaccines', 'Diagnostics', 'Biologics', 'VCP'];
  const yearOptions = ['2019', '2022', '2023', '2024'];

  const phases = [
    { id: 'discovery', label: 'Discovery', color: '#8c4028' },
    { id: 'preClinical', label: 'Pre-clinical', color: '#fe7449' },
    { id: 'phase1', label: 'Phase 1', color: '#f9a78d' },
    { id: 'phase2', label: 'Phase 2', color: '#ddd6fe' },
    { id: 'phase3', label: 'Phase 3', color: '#a78bfa' },
    { id: 'approved', label: 'Approved', color: '#f0b456' },
  ];

  const productTabs = ['All', 'Vaccines', 'Devices', 'Drugs', 'Diagnostics', 'Biologics', 'Dietary supplements', 'VCP', 'Microbicides'];

  // Dummy data for cross-pipeline chart (years on Y-axis)
  const crossPipelineData = [
    { category: '2019', discovery: 40, preClinical: 55, phase1: 45, phase2: 50, phase3: 40, approved: 70 },
    { category: '2022', discovery: 25, preClinical: 30, phase1: 20, phase2: 25, phase3: 15, approved: 10 },
    { category: '2023', discovery: 50, preClinical: 65, phase1: 55, phase2: 60, phase3: 50, approved: 80 },
    { category: '2024', discovery: 30, preClinical: 40, phase1: 35, phase2: 30, phase3: 25, approved: 20 },
  ];

  const handlePhaseToggle = (phaseId) => {
    setSelectedPhases((prev) =>
      prev.includes(phaseId) ? prev.filter((id) => id !== phaseId) : [...prev, phaseId]
    );
  };

  const handleResetFilters = () => {
    setHealthArea('');
    setDisease('');
    setProduct('');
  };

  const handleClearCompare = () => {
    setCompareDisease('');
    setCompareYear('');
  };

  // Check if comparison is selected
  const hasCompareSelection = compareDisease && compareYear;

  // Dummy comparison data
  const comparisonData = [
    { disease: 'HIV', value: 3 },
    { disease: 'Malaria', value: 3 },
    { disease: 'Dengue', value: 0 },
  ];

  return (
    <div className="flex min-h-[calc(100vh-74px)] bg-cream-200">
      <Sidebar activeId="cross-pipeline-analytics" />

      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="p-4 sm:p-6 lg:p-8 lg:px-10">
          {/* Page Header */}
          <div className="flex flex-col gap-4 mb-8 bg-white p-4 sm:p-6 sm:px-10 -mx-4 sm:-mx-6 lg:-mx-10 -mt-4 sm:-mt-6 lg:-mt-8">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-black mb-2">
                  Cross-Pipeline Analytics
                </h1>
                <p className="text-sm text-gray-500 max-w-3xl">
                  The Cross-Pipeline Analytics page is designed to provide a high-level comparative view of research and development efforts over time and across different pipelines. It allows users to track how candidates progress through the R&D cycle and compare the maturity of different disease portfolios with each other.
                </p>
              </div>
              <button className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[#E76A42] bg-[#FE74491F] hover:bg-[#FE74492F] whitespace-nowrap">
                Share this view
                <UploadIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Cross-pipeline analytics section */}
          <div className="bg-white border border-gray-200 p-6 mb-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-black">Cross-pipeline analytics</h3>
              <div className="flex items-center gap-3">
                <ChartMenu onDownloadCSV={() => {}} onDownloadPNG={() => {}} />
                <button className="px-4 py-2 text-sm font-medium text-[#E76A42] border border-[#E76A42] hover:bg-orange-50">
                  Make custom comparison
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              The total volume of the R&D pipeline across the IGH measurement years. Use the filter to zoom into how the pipeline of one disease changed over time and see if the total number of candidates and approved products is increasing year-over-year.
            </p>

            {/* Filters */}
            <div className="flex items-end gap-4 pb-6 border-b border-gray-200">
              <div className="min-w-[180px]">
                <Dropdown
                  label="Global health area"
                  value={healthArea}
                  onChange={setHealthArea}
                  placeholder="All"
                  options={healthAreaOptions}
                  compact={true}
                />
              </div>
              <div className="min-w-[180px]">
                <Dropdown
                  label="Diseases"
                  value={disease}
                  onChange={setDisease}
                  placeholder="All"
                  options={diseaseOptions}
                  compact={true}
                />
              </div>
              <div className="min-w-[180px]">
                <Dropdown
                  label="Product"
                  value={product}
                  onChange={setProduct}
                  placeholder="All"
                  options={productOptions}
                  compact={true}
                />
              </div>
              <div className="flex-1" />
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-2 text-sm text-gray-400 border border-gray-200 px-4 hover:bg-gray-50 h-[36px]"
              >
                Reset filters
              </button>
            </div>

            {/* Phase checkboxes */}
            <div className="flex items-center gap-6 py-4">
              {phases.map((phase) => (
                <label key={phase.id} className="flex items-center gap-2 cursor-pointer">
                  <span
                    onClick={() => handlePhaseToggle(phase.id)}
                    className={`w-5 h-5 border rounded flex items-center justify-center shrink-0 cursor-pointer ${
                      selectedPhases.includes(phase.id)
                        ? 'border-transparent'
                        : 'border-gray-300 bg-white'
                    }`}
                    style={{
                      backgroundColor: selectedPhases.includes(phase.id) ? phase.color : undefined,
                    }}
                  >
                    {selectedPhases.includes(phase.id) && (
                      <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                        <path d="M1 5L4 8L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  <span className="text-sm text-gray-700">{phase.label}</span>
                </label>
              ))}
            </div>

            {/* Chart */}
            <div className="mt-4">
              <StackedBarChart
                data={crossPipelineData}
                phases={phases.filter((p) => selectedPhases.includes(p.id)).map((p) => ({ key: p.id, label: p.label, color: p.color }))}
                layout="vertical"
                height={280}
                xAxisLabel="Amount"
                yAxisLabel="Years"
                showFilters={false}
              />
            </div>

            {/* Last data update footer */}
            <div className="mt-6 bg-orange-50 px-4 py-3 flex items-center justify-center gap-2">
              <InfoIcon className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-gray-700">Last data update: <strong>12 Jan 2025</strong></span>
            </div>
          </div>

          {/* Multi-variable temporal overview section */}
          <div className="bg-white border border-gray-200 p-6 mb-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-black">Multi-variable temporal overview</h3>
              <ChartMenu onDownloadCSV={() => {}} onDownloadPNG={() => {}} />
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Analyze the pipeline its progression by selecting a single disease to track phase-to-phase shifts over time. Alternatively, select multiple diseases to compare pipeline growth and maturity across different disease areas.
            </p>

            {/* Filters row */}
            <div className="flex items-end gap-4 pb-6 border-b border-gray-200">
              <div className="min-w-[180px]">
                <Dropdown
                  label="Diseases"
                  value={compareDisease}
                  onChange={setCompareDisease}
                  placeholder="All"
                  options={diseaseOptions}
                  compact={true}
                />
              </div>
              <div className="min-w-[180px]">
                <Dropdown
                  label="Year"
                  value={compareYear}
                  onChange={setCompareYear}
                  placeholder="All"
                  options={yearOptions}
                  compact={true}
                />
              </div>
              <div className="flex items-center gap-3 ml-4">
                <button
                  onClick={() => setCompareSeveralDiseases(!compareSeveralDiseases)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    compareSeveralDiseases ? 'bg-orange-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      compareSeveralDiseases ? 'left-7' : 'left-1'
                    }`}
                  />
                </button>
                <div>
                  <div className="text-sm text-gray-700">Compare several diseases</div>
                  <div className="text-xs text-gray-400">Select if</div>
                </div>
              </div>
              <div className="flex-1" />
              <button
                onClick={handleClearCompare}
                className="flex items-center gap-2 text-sm text-gray-400 border border-gray-200 px-4 hover:bg-gray-50 h-[36px]"
              >
                Clear
                <RefreshIcon className="w-4 h-4" />
              </button>
              <button className="px-4 h-[36px] text-sm text-gray-400 bg-gray-100 border-none">
                Apply
              </button>
            </div>

            {/* Product tabs and Compared to */}
            <div className="flex items-center gap-4 py-4 border-b border-gray-200">
              <div className="flex items-center bg-gray-100 p-1">
                {productTabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedProductTab(tab.toLowerCase())}
                    className={`px-3 py-1.5 text-sm transition-colors cursor-pointer ${
                      selectedProductTab === tab.toLowerCase()
                        ? 'bg-white text-black font-medium shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-gray-600">Compared to</span>
                <Dropdown
                  value={comparedTo}
                  onChange={setComparedTo}
                  placeholder="All"
                  options={yearOptions}
                  compact={true}
                  className="w-32"
                />
              </div>
            </div>

            {/* Content area */}
            {!hasCompareSelection ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                  <InfoIcon className="w-6 h-6 text-orange-500" />
                </div>
                <h4 className="text-lg font-bold text-black mb-2">Nothing selected</h4>
                <p className="text-sm text-gray-500 text-center max-w-xs">
                  Select one or up to three diseases and one year you'd like to compare
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-6">
                {comparisonData.map((item) => (
                  <div key={item.disease} className="border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-base font-medium text-black">{item.disease}</h4>
                      <InfoIcon className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="text-4xl font-bold text-black">{item.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* G-FINDER promotional section */}
          <div className="relative bg-gray-900 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/90 to-transparent z-10" />
            <div className="absolute inset-0 opacity-50">
              <div className="w-full h-full bg-gradient-to-br from-orange-600/20 to-purple-600/20" />
            </div>
            <div className="relative z-20 p-8 md:p-12 max-w-2xl">
              <p className="text-sm text-gray-400 mb-2">12/12/24</p>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                Tracking global health investments: discover G-FINDER's impact
              </h2>
              <p className="text-sm text-gray-300 mb-6">
                G-FINDER is the gold-standard tracker of R&D funding for new products and technologies for global health. Updated annually, this is the evidence base informing all global health advocacy, investment and policy change.
              </p>
              <div className="space-y-2 mb-6">
                <p className="text-sm text-gray-300">
                  <strong className="text-white">The case for change:</strong> Explore funding trends over time, where there is innovation and where there are gaps.
                </p>
                <p className="text-sm text-gray-300">
                  <strong className="text-white">Drivers of impact:</strong> Understand which initiatives are gaining strength and where there are weaknesses in global health R&D impact.
                </p>
              </div>
              <button className="px-6 py-3 bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors">
                Explore G-finder data →
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
