'use client';

import { useState, useMemo, useEffect } from 'react';
import { useUrlState } from '@/lib/useUrlState';
import { arraySerializer } from '@/lib/url-serializers';
import Sidebar from '@/components/layout/Sidebar';
import { Dropdown, ChartMenu } from '@/components/ui';
import { UploadIcon, RefreshIcon } from '@/components/icons';
import { StackedBarChart } from '@/components/charts';
import {
  useTemporalSnapshots,
  useAvailableYears,
  useGlobalHealthAreaSummaries,
  useProducts,
  useDiseases,
  usePipelineFilterPairs,
} from '@/graphql/hooks';
import {
  addMalariaOption,
  expandDiseaseSelection,
  consolidateProductOptionsByKey,
  expandProductKeySelection,
  MALARIA_GROUP,
} from '@/lib/filterGroups';
import TemporalTrendsSection from './TemporalTrendsSection';

export default function CrossPipelineAnalytics() {
  const [selectedHealthArea, setSelectedHealthArea] = useUrlState('gha', [], arraySerializer);
  const [selectedDisease, setSelectedDisease] = useUrlState('disease', [], arraySerializer);
  const [selectedProduct, setSelectedProduct] = useUrlState('product', [], arraySerializer);

  // Fetch filter options first
  const { years: availableYears, loading: yearsLoading } = useAvailableYears();
  const { bubbleData: healthAreas, loading: healthAreasLoading } = useGlobalHealthAreaSummaries();
  const { products: productsList, loading: productsLoading } = useProducts();
  const { raw: diseasesRaw, loading: diseasesLoading } = useDiseases();
  const { pairs, loading: pairsLoading } = usePipelineFilterPairs();

  // Build filter arrays for API
  const selectedHealthAreas = selectedHealthArea.length > 0 ? selectedHealthArea : null;
  const expandedProductKeys = expandProductKeySelection(selectedProduct);
  const selectedProductKeys = expandedProductKeys.length > 0 ? expandedProductKeys.map(v => parseInt(v)) : null;
  const expandedDiseases = expandDiseaseSelection(selectedDisease);
  const selectedDiseaseGroupNames = expandedDiseases.length > 0 ? expandedDiseases : null;

  // Fetch chart data with filters
  const { chartData, phases: apiPhases, loading: temporalLoading } = useTemporalSnapshots(null, selectedHealthAreas, selectedProductKeys, selectedDiseaseGroupNames);

  // Only unselected/hidden phase keys are stored in the URL so that
  // the default state (all visible) produces a clean URL.
  const [hiddenPhases, setHiddenPhases] = useUrlState('phide', [], arraySerializer);

  const isPhaseVisible = (key) => !hiddenPhases.includes(key);

  const [shareCopied, setShareCopied] = useState(false);

  // Build options from API data, narrowed by disease + product selections
  const healthAreaOptions = useMemo(() => {
    const all = (healthAreas || []).map(item => ({ value: item.originalName, label: item.name }));
    const hasDis = selectedDisease.length > 0;
    const hasProd = selectedProduct.length > 0;
    if (!hasDis && !hasProd) return all;

    const disGHAs = hasDis
      ? new Set((diseasesRaw || [])
          .filter(d => expandDiseaseSelection(selectedDisease).includes(d.disease_group_name))
          .map(d => d.global_health_area))
      : null;

    let prodGHAs = null;
    if (hasProd) {
      const pkeys = new Set(expandProductKeySelection(selectedProduct));
      const validDiseases = new Set(
        pairs.filter(p => pkeys.has(String(p.product_key))).map(p => p.disease_group_name)
      );
      prodGHAs = new Set((diseasesRaw || [])
        .filter(d => validDiseases.has(d.disease_group_name))
        .map(d => d.global_health_area));
    }

    return all.filter(o => {
      if (disGHAs && !disGHAs.has(o.value)) return false;
      if (prodGHAs && !prodGHAs.has(o.value)) return false;
      return true;
    });
  }, [healthAreas, selectedDisease, selectedProduct, diseasesRaw, pairs]);

  // Disease options from API, narrowed to the selected GHA(s) when present
  const ghaDiseaseOptions = useMemo(() => {
    const source = diseasesRaw || [];
    const filtered = selectedHealthArea.length > 0
      ? source.filter(d => selectedHealthArea.includes(d.global_health_area))
      : source;
    const names = [...new Set(filtered.map(d => d.disease_group_name).filter(Boolean))];
    return addMalariaOption(names);
  }, [diseasesRaw, selectedHealthArea]);

  // All product options (before cross-filtering), with VC consolidation
  const allProductOptions = useMemo(() => {
    const raw = (productsList || []).map(p => ({ value: String(p.product_key), label: p.product_name }));
    return consolidateProductOptionsByKey(raw);
  }, [productsList]);

  // Disease↔product cross-filtering via pipeline pairs
  // (product options may have pipe-separated keys from VC consolidation)
  const diseaseOptions = useMemo(() => {
    if (selectedProduct.length === 0) return ghaDiseaseOptions;
    const pkeys = new Set(expandProductKeySelection(selectedProduct));
    const validNames = new Set(
      pairs.filter(p => pkeys.has(String(p.product_key)))
           .map(p => p.disease_group_name)
    );
    return ghaDiseaseOptions.filter(d => {
      if (validNames.has(d)) return true;
      if (d === MALARIA_GROUP.label) {
        return MALARIA_GROUP.members.some(m => validNames.has(m));
      }
      return false;
    });
  }, [selectedProduct, pairs, ghaDiseaseOptions]);

  // Products filtered by GHA (via diseases in selected GHA)
  const ghaProductOptions = useMemo(() => {
    if (selectedHealthArea.length === 0) return allProductOptions;
    const ghaDiseases = new Set(
      (diseasesRaw || [])
        .filter(d => selectedHealthArea.includes(d.global_health_area))
        .map(d => d.disease_group_name)
    );
    const validKeys = new Set(
      pairs.filter(p => ghaDiseases.has(p.disease_group_name)).map(p => String(p.product_key))
    );
    return allProductOptions.filter(o => o.value.split('|').some(k => validKeys.has(k)));
  }, [selectedHealthArea, diseasesRaw, pairs, allProductOptions]);

  const productOptions = useMemo(() => {
    if (selectedDisease.length === 0) return ghaProductOptions;
    const expandedDisease = expandDiseaseSelection(selectedDisease);
    const validKeys = new Set(
      pairs.filter(p => expandedDisease.includes(p.disease_group_name))
           .map(p => String(p.product_key))
    );
    return ghaProductOptions.filter(o => o.value.split('|').some(k => validKeys.has(k)));
  }, [selectedDisease, pairs, ghaProductOptions]);

  // When GHA or product narrows the disease list, remove invalid selections.
  // Skip while data is still loading to avoid wiping URL-restored selections.
  useEffect(() => {
    if (diseasesLoading || pairsLoading) return;
    if (selectedDisease.length > 0) {
      const valid = selectedDisease.filter(d => diseaseOptions.includes(d));
      if (valid.length !== selectedDisease.length) setSelectedDisease(valid);
    }
  }, [diseaseOptions, diseasesLoading, pairsLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // When disease narrows the product list, remove invalid selections.
  // Skip while data is still loading to avoid wiping URL-restored selections.
  useEffect(() => {
    if (productsLoading || pairsLoading) return;
    if (selectedProduct.length > 0) {
      const validValues = new Set(productOptions.map(o => o.value));
      const valid = selectedProduct.filter(p => validValues.has(p));
      if (valid.length !== selectedProduct.length) setSelectedProduct(valid);
    }
  }, [productOptions, productsLoading, pairsLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // When disease/product narrows the GHA list, remove invalid selections.
  useEffect(() => {
    if (healthAreasLoading || diseasesLoading || pairsLoading) return;
    if (selectedHealthArea.length > 0) {
      const validValues = new Set(healthAreaOptions.map(o => o.value));
      const valid = selectedHealthArea.filter(h => validValues.has(h));
      if (valid.length !== selectedHealthArea.length) setSelectedHealthArea(valid);
    }
  }, [healthAreaOptions, healthAreasLoading, diseasesLoading, pairsLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Use API phases with consistent colors, enforcing lifecycle ordering
  // via sortOrder so the chart and legend always read
  // Discovery → … → Approved.
  const phases = useMemo(() => {
    const source = apiPhases.length > 0
      ? apiPhases
      : [
          { key: 'discovery', label: 'Discovery', color: '#AD5133', sortOrder: 10 },
          { key: 'pre_clinical', label: 'Pre-clinical', color: '#FE7449', sortOrder: 25 },
          { key: 'phase_1', label: 'Phase 1', color: '#F9A78D', sortOrder: 40 },
          { key: 'phase_2', label: 'Phase 2', color: '#B28FC9', sortOrder: 50 },
          { key: 'phase_3', label: 'Phase 3', color: '#CBAFDE', sortOrder: 60 },
          { key: 'approved', label: 'Approved', color: '#F0B456', sortOrder: 90 },
        ];
    return [...source].sort((a, b) => (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity));
  }, [apiPhases]);

  const handlePhaseToggle = (phaseKey) => {
    setHiddenPhases((prev) =>
      prev.includes(phaseKey) ? prev.filter((key) => key !== phaseKey) : [...prev, phaseKey]
    );
  };

  const hasCrossFilters = selectedHealthArea.length > 0 || selectedDisease.length > 0 || selectedProduct.length > 0 || hiddenPhases.length > 0;

  const handleResetFilters = () => {
    setSelectedHealthArea([]);
    setSelectedDisease([]);
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
                <p className="text-sm text-gray-500 max-w-3xl">
                  The Cross-pipeline analytics page is designed to provide a high-level comparative view of research and development efforts over time and across different pipelines. It allows users to track how candidates progress through the R&D cycle and compare the maturity of different disease portfolios with each other.
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
                <ChartMenu onDownloadCSV={() => {}} onDownloadPNG={() => {}} />
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              The total volume of the R&D pipeline across the IGH measurement years. Use the filter to zoom into how the pipeline of one disease changed over time and see if the total number of candidates and approved products is increasing year-over-year.
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
                  <Dropdown
                    label="Disease"
                    value={selectedDisease}
                    onChange={setSelectedDisease}
                    placeholder="All"
                    options={diseaseOptions}
                    multiSelect={true}

                    loading={diseasesLoading}
                  />
                </div>
                <div className="min-w-[220px]">
                  <Dropdown
                    label="Product"
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
              <div className="flex items-center gap-6 py-4 flex-wrap">
                {phases.map((phase) => (
                  <label key={phase.key} className="flex items-center gap-2 cursor-pointer">
                    <span
                      onClick={() => handlePhaseToggle(phase.key)}
                      className={`w-5 h-5 border rounded flex items-center justify-center shrink-0 cursor-pointer ${
                        isPhaseVisible(phase.key)
                          ? 'border-transparent'
                          : 'border-gray-300 bg-white'
                      }`}
                      style={{
                        backgroundColor: isPhaseVisible(phase.key) ? phase.color : undefined,
                      }}
                    >
                      {isPhaseVisible(phase.key) && (
                        <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                          <path d="M1 5L4 8L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                    <span className="text-sm text-gray-700">{phase.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div className="mt-4">
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
                  xAxisLabel="Amount"
                  yAxisLabel="Years"
                  showFilters={false}
                  visiblePhases={phases.reduce((acc, p) => ({ ...acc, [p.key]: isPhaseVisible(p.key) }), {})}
                />
              )}
            </div>

          </div>

          {/* Temporal trends & portfolio comparison */}
          <TemporalTrendsSection
            diseaseOptions={diseaseOptions}
            productOptions={productOptions}
            availableYears={availableYears}
          />

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
              <a href="https://gfinderdata.impactglobalhealth.org/" target="_blank" rel="noopener noreferrer" className="inline-block px-6 py-3 bg-orange-500 text-black text-sm font-medium hover:bg-black hover:text-white transition-colors">
                Explore G-finder data →
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
