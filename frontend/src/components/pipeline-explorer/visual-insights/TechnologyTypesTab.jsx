'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useGlobalFilters } from '@/components/global-filters';
import {
  useDiseaseSummaries,
  useProductDistribution,
  usePortfolioCandidates,
  useTechnologyTypeDistribution,
} from '@/graphql/hooks';
import { buildCandidateColumns } from '@/lib/exploreColumnConfig';
import { toColumnFilters, toColumnSort } from '@/lib/dataTableGraphQL';
import { downloadPNG } from '@/lib/png';
import { DataTable, ChartMenu } from '@/components/ui';
import { VECTOR_CONTROL_PRODUCT_NAMES, VECTOR_CONTROL_CONSOLIDATED_NAME } from '@/lib/filterGroups';
import {
  ITEMS_PER_PAGE,
  TECH_PHASES,
  GHA_COLORS,
  BarTooltip,
} from './shared/primitives';

// =========================================================
// Technology Types tab — Visual Insights
// =========================================================
//
// The Technology-types slice of the former Analytical Insights page, extracted
// into its own tab. It is the most intricate of the four: rather than the
// shared KPI header and Top-5 charts, it drives a drill-down flow —
// product-type cards → a stacked tech-type bar chart → a "Coverage across
// diseases" accordion → a candidates DataTable — where each level narrows the
// data passed to the next.
//
// The new behaviour relative to the original page is global-filter awareness.
// The source drove the tech hooks purely from the local card selection; here
// the shared product filter (`expandedProduct`) must ALSO apply. We intersect
// the two product scopes via `effectiveProductNames` below.

// When the user has both a global product filter and a card selection, the
// effective product scope is their intersection. When only one side is set,
// use that side. Empty global filter means "no global narrowing". If the two
// are disjoint, the card selection wins (so clicking a card always shows it).
export function effectiveProductNames(globalProducts, localProducts) {
  if (!localProducts || localProducts.length === 0) {
    return globalProducts && globalProducts.length > 0 ? globalProducts : undefined;
  }
  if (!globalProducts || globalProducts.length === 0) return localProducts;
  const set = new Set(globalProducts);
  const both = localProducts.filter((p) => set.has(p));
  return both.length > 0 ? both : localProducts;
}

export default function TechnologyTypesTab({ onExplore }) {
  const { healthArea, primary, secondary, expandedProduct, rdPhase } = useGlobalFilters();

  // Drill-down selection state. The flow is: pick a product-type card →
  // (optionally) a VCP sub-product → a tech-type bar → a disease bar. Each
  // selection resets the levels below it.
  const [selectedProductType, setSelectedProductType] = useState(null);
  const [selectedTechType, setSelectedTechType] = useState(null);
  const [coverageOpen, setCoverageOpen] = useState(false);
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [candidatesAccordionOpen, setCandidatesAccordionOpen] = useState(false);
  // VCP sub-category state: null = show sub-category cards, string = exploring a specific VCP sub-product
  const [vcpSubProduct, setVcpSubProduct] = useState(null);

  // Tech accordion DataTable state. Local React state (not URL-backed) keeps
  // each Visual Insights tab's pagination independent.
  const [techAccPage, setTechAccPage] = useState(1);
  const [techAccFilters, setTechAccFilters] = useState({});
  const [techAccSort, setTechAccSort] = useState(null);
  const [techAccVisibleCols, setTechAccVisibleCols] = useState([]);

  // PNG-capture refs and the accordion scroll anchor.
  const accordionRef = useRef(null);
  const techChartRef = useRef(null);

  // =========================================================
  // API hooks (threaded with the five global filters)
  // =========================================================

  // Product distribution feeds the product-type cards and VCP sub-categories.
  // The technology view groups by candidate counts, so it is scoped to
  // 'Candidate' as the original page did for this tab.
  const { chartData: productChartData } = useProductDistribution(
    healthArea, primary, secondary, expandedProduct, rdPhase, 'Candidate',
  );

  // Product-type cards: all technology types, globally filtered, no card selected.
  const {
    tableData: technologyTableDataAll,
    phases: technologyPhases,
    loading: technologyLoading,
  } = useTechnologyTypeDistribution(healthArea, primary, secondary, expandedProduct, rdPhase, undefined);

  // The actual product name(s) the card selection resolves to: for VCP, use the
  // sub-product when exploring, or all VCP names when at the sub-category view.
  const techFilterProductNames = useMemo(() => {
    if (!selectedProductType) return null;
    if (selectedProductType === VECTOR_CONTROL_CONSOLIDATED_NAME) {
      return vcpSubProduct ? [vcpSubProduct] : VECTOR_CONTROL_PRODUCT_NAMES;
    }
    return [selectedProductType];
  }, [selectedProductType, vcpSubProduct]);

  // The effective product scope for the drill-down chart and coverage bubbles
  // is the intersection of the global product filter and the card selection.
  const drillProducts = effectiveProductNames(expandedProduct, techFilterProductNames);

  // Technology type distribution for the selected product (drill-down chart).
  const {
    tableData: technologyTableDataFiltered,
    loading: technologyFilteredLoading,
  } = useTechnologyTypeDistribution(
    healthArea, primary, secondary, drillProducts, rdPhase, undefined,
  );

  // Disease summaries filtered by selected product + tech type (coverage accordion).
  const { bubbleData: techDiseaseBubble } = useDiseaseSummaries(null, {
    globalHealthAreas: healthArea,
    primaryDiseaseNames: primary,
    secondaryDiseaseNames: secondary,
    phaseNames: rdPhase,
    productNames: drillProducts,
    technologyTypes: selectedTechType ? [selectedTechType] : undefined,
    skip: !selectedTechType,
  });

  // =========================================================
  // Tech accordion table (server-side pagination)
  // =========================================================
  //
  // Candidates filtered by tech type + disease + product. Disease filtering
  // uses primaryDiseaseNames (which targets disease_filter) rather than a
  // column filter on disease_name (which targets disease_group_name), because
  // the coverage chart names come from disease_filter.
  const techAccColumnFilters = useMemo(() => {
    const base = toColumnFilters(techAccFilters) || [];
    const extra = [];
    if (selectedTechType) extra.push({ column: 'technology_type', kind: 'CATEGORY', values: [selectedTechType] });
    return [...base, ...extra].length > 0 ? [...base, ...extra] : undefined;
  }, [techAccFilters, selectedTechType]);
  const techAccSortVar = useMemo(() => toColumnSort(techAccSort), [techAccSort]);

  // Product names for the filter param (VCP-aware), intersected with the
  // global product filter.
  const techAccProductNames = useMemo(() => {
    if (vcpSubProduct) return [vcpSubProduct];
    if (selectedProductType === VECTOR_CONTROL_CONSOLIDATED_NAME) return VECTOR_CONTROL_PRODUCT_NAMES;
    if (selectedProductType) return [selectedProductType];
    return undefined;
  }, [vcpSubProduct, selectedProductType]);

  const techAccEffectiveProducts = effectiveProductNames(expandedProduct, techAccProductNames);

  // The local disease drill-down overrides the global primary filter; when no
  // disease is drilled into we fall back to the global primary filter so the
  // global disease filter still applies to the tech table.
  const { candidates: techAccData, totalCount: techAccTotalCount, hasNextPage: techAccHasNext, loading: techAccLoading } = usePortfolioCandidates(
    {
      columnFilters: techAccColumnFilters,
      productNames: techAccEffectiveProducts,
      primaryDiseaseNames: selectedDisease ? [selectedDisease] : (primary && primary.length > 0 ? primary : undefined),
      globalHealthAreas: healthArea,
      secondaryDiseaseNames: secondary,
      phaseNames: rdPhase,
    },
    ITEMS_PER_PAGE,
    (techAccPage - 1) * ITEMS_PER_PAGE,
    { sort: techAccSortVar, skip: (!selectedDisease && !selectedTechType) || !candidatesAccordionOpen },
  );

  // Approved products count for the disease-level header — same filters +
  // candidate_type='Product', limit 0 for count only.
  const { totalCount: techAccApprovedCount } = usePortfolioCandidates(
    {
      columnFilters: techAccColumnFilters,
      productNames: techAccEffectiveProducts,
      primaryDiseaseNames: selectedDisease ? [selectedDisease] : (primary && primary.length > 0 ? primary : undefined),
      globalHealthAreas: healthArea,
      secondaryDiseaseNames: secondary,
      phaseNames: rdPhase,
      candidateType: 'Product',
    },
    0,
    0,
    { skip: (!selectedDisease && !selectedTechType) || !candidatesAccordionOpen },
  );

  // Reset accordion table page/sort/filters when tech type / disease changes.
  useEffect(() => {
    setTechAccPage(1);
    setTechAccFilters({});
    setTechAccSort(null);
  }, [selectedTechType, selectedDisease]);

  const techAccColumns = useMemo(
    () => buildCandidateColumns({
      onExplore: (row) => {
        const type = row.candidate_type === 'Product' ? 'product' : 'candidate';
        onExplore(type, row.candidate_key);
      },
    }),
    [onExplore],
  );

  // =========================================================
  // Derivations
  // =========================================================

  // Build product type cards: consolidate VCP sub-types into one card.
  const productTypeCards = useMemo(() => {
    if (!productChartData?.length) return [];
    let vcpTotal = 0;
    let vcpTechTypes = 0;
    let vcpApproved = 0;
    const rest = [];
    for (const p of productChartData) {
      if (VECTOR_CONTROL_PRODUCT_NAMES.includes(p.name)) {
        vcpTotal += p.value;
        vcpTechTypes += p.techTypeCount || 0;
        vcpApproved += p.approvedProductCount || 0;
      } else {
        rest.push({ name: p.name, candidates: p.value, techTypes: p.techTypeCount || 0, approvedProducts: p.approvedProductCount || 0 });
      }
    }
    if (vcpTotal > 0) {
      rest.push({ name: VECTOR_CONTROL_CONSOLIDATED_NAME, candidates: vcpTotal, techTypes: vcpTechTypes, approvedProducts: vcpApproved });
    }
    return rest.sort((a, b) => b.candidates - a.candidates);
  }, [productChartData]);

  // VCP sub-category cards.
  const vcpSubCategories = useMemo(() => {
    if (!productChartData?.length) return [];
    return productChartData
      .filter((p) => VECTOR_CONTROL_PRODUCT_NAMES.includes(p.name))
      .map((p) => ({ name: p.name, candidates: p.value }))
      .sort((a, b) => b.candidates - a.candidates);
  }, [productChartData]);

  const isVcpSelected = selectedProductType === VECTOR_CONTROL_CONSOLIDATED_NAME;

  // Auto-select the first product type card when data loads.
  useEffect(() => {
    if (productTypeCards.length > 0 && !selectedProductType) {
      setSelectedProductType(productTypeCards[0].name);
    }
  }, [productTypeCards, selectedProductType]);

  // Tech data for the selected product (or all if none selected).
  const techChartData = useMemo(() => {
    const source = selectedProductType ? technologyTableDataFiltered : technologyTableDataAll;
    if (!source?.length) return [];
    return source;
  }, [selectedProductType, technologyTableDataFiltered, technologyTableDataAll]);

  // Level 1: candidate / approved totals for the selected product type.
  const selectedProductCandidateTotal = useMemo(() => {
    if (selectedProductType) {
      const card = productTypeCards.find((c) => c.name === selectedProductType);
      if (card) return card.candidates;
    }
    return 0;
  }, [selectedProductType, productTypeCards]);

  const selectedProductApprovedTotal = useMemo(() => {
    if (selectedProductType) {
      const card = productTypeCards.find((c) => c.name === selectedProductType);
      if (card) return card.approvedProducts;
    }
    return 0;
  }, [selectedProductType, productTypeCards]);

  // Level 2: approved products for the selected tech type (from the approved
  // phase key in the chart data).
  const selectedTechTypeApproved = useMemo(() => {
    if (!selectedTechType || !techChartData?.length) return 0;
    const row = techChartData.find((r) => r.technology_type === selectedTechType);
    return row?.approved || 0;
  }, [selectedTechType, techChartData]);

  const techPhases = useMemo(() => {
    if (technologyPhases?.length) return technologyPhases;
    return TECH_PHASES;
  }, [technologyPhases]);

  const techPhaseLabelMap = useMemo(() =>
    Object.fromEntries(techPhases.map((p) => [p.key, p.label])),
    [techPhases],
  );

  // Disease coverage for the selected tech type (filtered by product + tech type).
  const diseaseCoverageData = useMemo(() => {
    if (!selectedTechType || !techDiseaseBubble?.length) return [];
    return techDiseaseBubble
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .map((d) => ({ name: d.name, value: d.value, gha: d.group }));
  }, [selectedTechType, techDiseaseBubble]);

  // Filter context lets the DataTable resolve category-filter options against
  // the same scope and active column filters.
  const techAccFilterContext = useMemo(() => ({
    column_filters: techAccColumnFilters,
    product_names: techAccEffectiveProducts,
    primary_disease_names: selectedDisease ? [selectedDisease] : undefined,
  }), [techAccColumnFilters, techAccEffectiveProducts, selectedDisease]);

  return (
    <>
      <div className="bg-white border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-base sm:text-lg font-bold text-black">Product types and their technologies</h3>
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          This matrix grid shows the technology types for which candidates are being developed against the R&D stages. It provides an overview of the portfolio&apos;s progress for each technology type.
        </p>

        {/* Product type cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-6">
          {productTypeCards.map((pt) => {
            const isSelected = selectedProductType === pt.name;
            return (
              <button
                key={pt.name}
                onClick={() => {
                  setSelectedProductType(pt.name);
                  setVcpSubProduct(null);
                  setSelectedTechType(null);
                  setCoverageOpen(false);
                  setSelectedDisease(null);
                  setCandidatesAccordionOpen(false);
                }}
                className="p-4 text-left transition-colors cursor-pointer"
                style={{
                  borderRadius: 0,
                  border: '1px solid #26262629',
                  borderLeft: isSelected ? '3px solid #fe7449' : '1px solid #26262629',
                  background: isSelected ? '#FEF0EC' : '#fff',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-sm text-black">{pt.name}</span>
                  <span
                    className="flex items-center justify-center flex-shrink-0 rounded-full"
                    style={{
                      width: 20,
                      height: 20,
                      border: isSelected ? '2px solid #fe7449' : '2px solid #26262652',
                      background: isSelected ? '#fe7449' : 'transparent',
                    }}
                  >
                    {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                  </span>
                </div>
                <div className="text-[32px] font-extrabold text-black leading-tight" style={{ fontFamily: 'var(--font-align), system-ui, sans-serif' }}>
                  {pt.techTypes}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Technology types with {pt.candidates} candidates
                </p>
              </button>
            );
          })}
        </div>

        {/* Tech type stacked bar chart OR VCP sub-categories */}
        <div className="border-t border-gray-200 pt-4">
          {/* VCP sub-category cards (when VCP selected and no sub-product explored) */}
          {isVcpSelected && !vcpSubProduct ? (
            <>
              <div className="flex items-center gap-3 mb-2">
                <h4 className="text-base sm:text-lg font-bold text-black">Vector Control Products - Sub-categories</h4>
                <div className="flex-1" />
                <ChartMenu onDownloadPNG={() => downloadPNG(techChartRef, 'vcp-sub-categories')} />
              </div>
              <p className="text-sm text-gray-500 mb-4">Select a category to explore its technology breakdown</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {vcpSubCategories.map((sub) => (
                  <div key={sub.name} className="border border-gray-200 p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-sm text-black">{sub.name}</span>
                      <span className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 text-xs cursor-pointer">i</span>
                    </div>
                    <div className="text-[32px] font-extrabold text-black leading-tight" style={{ fontFamily: 'var(--font-align), system-ui, sans-serif' }}>
                      {sub.candidates}
                    </div>
                    <div className="mt-auto pt-3">
                      <button
                        onClick={() => {
                          setVcpSubProduct(sub.name);
                          setSelectedTechType(null);
                          setCoverageOpen(false);
                          setSelectedDisease(null);
                          setCandidatesAccordionOpen(false);
                        }}
                        className="w-full py-2 text-sm font-medium text-black border border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        Explore
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-2">
                <h4 className="text-base sm:text-lg font-bold text-black">
                  {isVcpSelected && vcpSubProduct
                    ? `Vector Control Products - ${vcpSubProduct}`
                    : selectedProductType || 'All'}
                </h4>
                {selectedProductType && (
                  <>
                    <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">
                      {selectedProductCandidateTotal} candidates
                    </span>
                    <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">
                      {selectedProductApprovedTotal} approved products
                    </span>
                  </>
                )}
                <div className="flex-1" />
                {isVcpSelected && vcpSubProduct && (
                  <button
                    onClick={() => {
                      setVcpSubProduct(null);
                      setSelectedTechType(null);
                      setCoverageOpen(false);
                      setSelectedDisease(null);
                      setCandidatesAccordionOpen(false);
                    }}
                    className="text-sm font-medium text-[#E76A42] hover:underline cursor-pointer"
                  >
                    Back to VCP
                  </button>
                )}
                <ChartMenu onDownloadPNG={() => downloadPNG(techChartRef, 'technology-types')} />
              </div>
              <p className="text-sm text-gray-500 mb-4">
                This visualization tracks the evolution of the global pipeline over time. It is showing how candidates have successfully progressed through clinical phases toward market readiness. In the make custom comparison page, it is possible to set up your own comparison of a pipeline over time, or between two or more diseases.
              </p>

              <div className="flex flex-wrap items-center gap-4 mb-4">
                {techPhases.map((p) => (
                  <label key={p.key} className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.color }} />
                    {p.label}
                  </label>
                ))}
              </div>

              <div ref={techChartRef}>
                {(technologyLoading || technologyFilteredLoading) ? (
                  <div className="h-[300px] flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading...</div></div>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(300, (techChartData?.length || 3) * 36)}>
                    <BarChart data={techChartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12 }} label={{ value: 'Number of candidates and approved products', position: 'insideBottom', offset: -10, fontSize: 12, fill: '#666' }} />
                      <YAxis type="category" dataKey="technology_type" width={200} tick={{ fontSize: 11 }} />
                      <Tooltip content={<BarTooltip labelMap={techPhaseLabelMap} />} />
                      {techPhases.map((p) => (
                        <Bar
                          key={p.key}
                          dataKey={p.key}
                          stackId="a"
                          fill={p.color}
                          barSize={18}
                          cursor="pointer"
                          onClick={(data) => {
                            const row = data?.payload || data;
                            setSelectedTechType(row?.technology_type || row?.name || null);
                            setCoverageOpen(true);
                            setCandidatesAccordionOpen(true);
                            setSelectedDisease(null);
                            setTimeout(() => accordionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                          }}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Accordions */}
      <div ref={accordionRef} className="mt-6 border border-gray-200 divide-y divide-gray-200 bg-white">
        {/* Coverage across diseases */}
        <div>
          <button
            onClick={() => setCoverageOpen(!coverageOpen)}
            className="w-full flex items-center justify-between px-6 py-5 transition-colors" style={{ backgroundColor: '#F9F9FA' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-base font-bold text-black">Coverage across diseases</span>
              {selectedTechType && <span className="text-sm font-medium text-[#E76A42]">{selectedTechType}</span>}
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${coverageOpen ? 'rotate-45' : ''}`}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          {coverageOpen && (
            <div className="px-6 pb-6 pt-4">
              {selectedTechType ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <h4 className="text-lg font-bold text-black">
                      {[vcpSubProduct || selectedProductType, selectedTechType].filter(Boolean).join(' | ')}
                    </h4>
                    <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">
                      {diseaseCoverageData.reduce((s, d) => s + d.value, 0)} candidates
                    </span>
                    <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">
                      {selectedTechTypeApproved} approved products
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    This visualization tracks the evolution of the global pipeline over time. It is showing how candidates have successfully progressed through clinical phases toward market readiness. In the make custom comparison page, it is possible to set up your own comparison of a pipeline over time, or between two or more diseases.
                  </p>
                  <ResponsiveContainer width="100%" height={Math.max(180, (diseaseCoverageData?.length || 3) * 44)}>
                    <BarChart data={diseaseCoverageData} layout="vertical" margin={{ left: 120, right: 20, top: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={120} />
                      <Tooltip />
                      <Bar dataKey="value" barSize={16} radius={[0, 4, 4, 0]} cursor="pointer"
                        onClick={(data) => {
                          const row = data?.payload || data;
                          setSelectedDisease(row?.name || null);
                          setCandidatesAccordionOpen(true);
                          setTimeout(() => {
                            const el = document.getElementById('vi-candidates-accordion');
                            el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }, 100);
                        }}
                      >
                        {diseaseCoverageData.map((entry) => (
                          <Cell key={entry.name} fill={GHA_COLORS[entry.gha] || '#B28FC9'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-4 mt-2">
                    {Object.entries(GHA_COLORS).map(([label, color]) => (
                      <div key={label} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                        {label}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-gray-400">
                  Select a technology type from the bar chart above to see disease coverage.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Candidates and approved products */}
        <div id="vi-candidates-accordion">
          <button
            onClick={() => setCandidatesAccordionOpen(!candidatesAccordionOpen)}
            className="w-full flex items-center justify-between px-6 py-5 transition-colors" style={{ backgroundColor: '#F9F9FA' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-base font-bold text-black">Candidates and approved products</span>
              {selectedDisease && <span className="text-sm font-medium text-[#E76A42]">{selectedDisease}</span>}
            </div>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${candidatesAccordionOpen ? 'rotate-45' : ''}`}>
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          {candidatesAccordionOpen && (
            <div className="px-6 pb-6 pt-4">
              {selectedTechType ? (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <h4 className="text-lg font-bold text-black">
                      {[vcpSubProduct || selectedProductType, selectedTechType, selectedDisease].filter(Boolean).join(' | ')}
                    </h4>
                    <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">
                      {techAccTotalCount} candidates
                    </span>
                    <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">
                      {techAccApprovedCount} approved products
                    </span>
                  </div>
                  <DataTable
                    tableId="vi-tech"
                    graphqlTable="PORTFOLIO_CANDIDATES"
                    filterContext={techAccFilterContext}
                    columns={techAccColumns}
                    data={techAccData || []}
                    rowKey="candidate_key"
                    page={techAccPage}
                    onPageChange={setTechAccPage}
                    totalCount={techAccTotalCount}
                    hasNextPage={techAccHasNext}
                    itemsPerPage={ITEMS_PER_PAGE}
                    loading={techAccLoading}
                    filters={techAccFilters}
                    onFiltersChange={(next) => { setTechAccFilters(next); setTechAccPage(1); }}
                    sort={techAccSort}
                    onSortChange={(next) => { setTechAccSort(next); setTechAccPage(1); }}
                    visibleColumns={techAccVisibleCols}
                    onVisibleColumnsChange={setTechAccVisibleCols}
                    emptyState={{ title: 'No candidates or approved products found', description: 'No rows match the selected filters.' }}
                  />
                </>
              ) : (
                <div className="py-8 text-center text-gray-400">
                  Select a technology type from the bar chart above to see candidates and approved products.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
