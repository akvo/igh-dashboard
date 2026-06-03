'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useUrlState } from '@/lib/useUrlState';
import { arraySerializer, stringSerializer } from '@/lib/url-serializers';
import { createBubbleColorScale, createGhaGroupColorScale } from '@/lib/bubbleColorScale';
import { buildCSV, downloadCSV as downloadCSVFile } from '@/lib/csv';
import { downloadPNG } from '@/lib/png';
import { chartColors, colors } from '@/lib/theme';
import Sidebar from '@/components/layout/Sidebar';
import { StatCard, Dropdown, TabSwitcher, TabNav, ChartMenu, DataTable, DiseaseListPanel, PriorityShareCard, PriorityTotalCard } from '@/components/ui';
import HierarchicalDiseaseFilter from '@/components/filters/HierarchicalDiseaseFilter';
import HierarchicalProductFilter from '@/components/filters/HierarchicalProductFilter';
import ReportsAndInsights from '@/components/ReportsAndInsights';
import {
  BubbleChart,
  StackedBarChart,
  WorldMap,
  ChartEmptyState,
  DonutChart,
} from '@/components/charts';
import {
  PieChartIcon,
  ListIcon,
  ClockIcon,
} from '@/components/icons';

import {
  usePortfolioKPIs,
  useGlobalHealthAreaSummaries,
  useGhaProductTypeSummaries,
  usePriorityAlignment,
  useDiseaseSummaries,
  useDiseaseProductTypeSummaries,
  useCandidateTypeDistribution,
  useGeographicDistribution,
  useTemporalSnapshots,
  useProducts,
  useAvailableYears,
  useLastSyncDate,
  usePhases,
  useDiseases,
  useSecondaryDiseases,
  useDiseaseHierarchy,
  usePipelineFilterPairs,
  useActivePipelineFilterPairs,
} from '@/graphql/hooks';
import { SIMPLIFIED_PHASE_NAMES, displayHealthArea } from '@/lib/transformations/constants';
import { vcpMemberKeys } from '@/lib/filterGroups';
import { useCrossFilteredOptions } from '@/lib/useCrossFilteredOptions';
import { useGlobalFilters } from '@/components/portfolio-analysis';

// Candidate type options for bubble chart filter
const candidateTypeOptions = [
  { label: 'Candidates', value: 'Candidate' },
  { label: 'Approved products', value: 'Product' },
];

// Bubble chart view tabs — each slices the same pipeline data along a
// different axis. Table columns, color ramp, and fetcher all key off this.
const bubbleViewTabs = [
  { value: 'gha', label: 'GHA' },
  { value: 'ghaType', label: 'GHA and product types' },
  { value: 'disease', label: 'Diseases' },
  { value: 'diseaseType', label: 'Disease and product types' },
];

// WHO Priority Alignment ring accents — keyed by the raw DB GHA strings
// returned by `priorityAlignmentOverview.byArea`. Sourced from
// `chartColors.primary` so the rings stay in sync with the rest of the
// data-viz palette and matches the screenshot mock: ND uses the light
// purple accent, EID and WH share the green accent. (Diseases without a
// GHA never reach a ring, so this map is exhaustive for what `byArea`
// can return.)
const WHO_RING_COLORS = {
  'Neglected disease': chartColors.primary[1],          // #CBAFDE Light Purple
  'Emerging infectious disease': chartColors.primary[7], // #6AB085 Green
  'Womens Health': chartColors.primary[7],              // #6AB085 Green
};

// Product types donut palette for the WHO Priority Alignment section.
// `DonutChart` consumes the array positionally — wedge[i] takes
// palette[i % palette.length] — and `productTypeBreakdown` is sorted by
// candidate count descending. The screenshot has the largest wedge
// (Vaccines) in brand orange, the second (Drugs) in light purple, and
// the rest stepping through the brandbook palette. We deliberately
// override DonutChart's default palette (which leads with Gold) for
// this section only; other donuts on the page keep their defaults.
const WHO_PRODUCT_TYPE_COLORS = [
  colors.orange[500],     // #fe7449 — Vaccines (largest wedge in the screenshot)
  chartColors.primary[1], // #CBAFDE Light Purple — Drugs
  chartColors.primary[2], // #B08888 Mauve — Diagnostics
  chartColors.primary[3], // #E3D6C1 Beige — Biologics
  chartColors.primary[4], // #F9A78D Peach — VCP
  chartColors.primary[5], // #FFDCD1 Light Pink — Dietary supplements
  chartColors.primary[0], // #F0B456 Gold — Microbicides
  chartColors.primary[6], // #CC9949 Dark Gold — Microbial interventions
  chartColors.primary[7], // #6AB085 Green — overflow for any extra product type
];

// Yes / NA / No palette for the women-or-children donut, matching the
// brand designer's screenshot: Yes in the section's light purple
// accent, NA in beige to read as "unclassified", and No in brand
// orange. Keyed by slice name so the mapping stays correct even when
// a filter zeroes a slice out and the hook trims it from the array.
const WHO_W_OR_C_COLORS = {
  Yes: chartColors.primary[1], // #CBAFDE Light Purple
  NA: chartColors.primary[3],  // #E3D6C1 Beige
  No: colors.orange[500],      // #fe7449
};


export default function Home() {
  // Global filters from sidebar filter box (shared across all pages).
  const globalFilters = useGlobalFilters();

  const [product, setProduct] = useUrlState('hProduct', [], arraySerializer);
  const [rdStage, setRdStage] = useUrlState('hRdStage', [], arraySerializer);
  const [bubbleCandidateTypes, setBubbleCandidateTypes] = useUrlState('bubbleType', ['Candidate', 'Product'], arraySerializer);
  const [bubbleView, setBubbleView] = useUrlState('bubbleView', 'gha', stringSerializer);
  const [mapTab, setMapTab] = useUrlState('mapTab', 'trials', { ...stringSerializer, historyMode: 'push' });
  const [chartViewTab, setChartViewTab] = useUrlState('chartView', 'visual', stringSerializer);
  const [crossGlobalHealthArea, setCrossGlobalHealthArea] = useUrlState('crossGha', [], arraySerializer);
  const [crossProduct, setCrossProduct] = useUrlState('crossProduct', [], arraySerializer);
  // Hidden phase keys for the two StackedBarCharts. Storing hidden
  // (not visible) keeps the URL short when most phases are shown.
  const [portfolioHiddenPhases, setPortfolioHiddenPhases] = useUrlState('phide', [], arraySerializer);
  const [crossHiddenPhases, setCrossHiddenPhases] = useUrlState('cphide', [], arraySerializer);
  const [diseasePanelOpen, setDiseasePanelOpen] = useState(false);
  // Page number for the bubble-chart drill-down DataTable. Lives in
  // the parent because DataTable's pagination is controlled. Reset to
  // 1 on view change in the effect below — the `key={bubbleView}`
  // remount on the table only resets DataTable's own internal state
  // (column widths, sticky measurements), not this parent-owned page.
  const [bubblePage, setBubblePage] = useState(1);
  // Sort + visible-column state for the drill-down table. Reset when
  // the bubble view tab changes — each view has a different column
  // set, so carrying accessors across would leave the table empty
  // (DataTable's reconciliation drops unknown accessors).
  const [bubbleSort, setBubbleSort] = useState(null);
  const [bubbleVisibleColumns, setBubbleVisibleColumns] = useState([]);
  useEffect(() => {
    setBubbleSort(null);
    setBubbleVisibleColumns([]);
    setBubblePage(1);
  }, [bubbleView]);

  const bubbleChartRef = useRef(null);
  const worldMapRef = useRef(null);
  const productTypesChartRef = useRef(null);
  const womenChildrenChartRef = useRef(null);

  const { lastSyncDate, loading: syncDateLoading } = useLastSyncDate();
  const { kpis, loading: kpisLoading } = usePortfolioKPIs();
  // The GHA-only summary feeds both the bubble chart (gha view) and the
  // cross-pipeline dropdown down-page, so it always fetches. The three
  // expanded views only fetch when their tab is active.
  const bubbleCandidateArg =
    bubbleCandidateTypes.length === candidateTypeOptions.length ? null : bubbleCandidateTypes;
  const { bubbleData: gqlBubbleData, loading: bubbleLoading } = useGlobalHealthAreaSummaries(bubbleCandidateArg);
  const { bubbleData: ghaTypeBubbleData, loading: ghaTypeLoading } = useGhaProductTypeSummaries(
    bubbleCandidateArg,
    { skip: bubbleView !== 'ghaType' },
  );
  const { bubbleData: diseaseBubbleData, loading: diseaseBubbleLoading } = useDiseaseSummaries(
    bubbleCandidateArg,
    { skip: bubbleView !== 'disease' },
  );
  const { bubbleData: diseaseTypeBubbleData, loading: diseaseTypeLoading } = useDiseaseProductTypeSummaries(
    bubbleCandidateArg,
    { skip: bubbleView !== 'diseaseType' },
  );

  // Active-view data + loading switch. Each view owns its column set and
  // color ramp; the BubbleChart component itself stays view-agnostic.
  const activeBubbleData = useMemo(() => {
    switch (bubbleView) {
      case 'ghaType': return ghaTypeBubbleData;
      case 'disease': return diseaseBubbleData;
      case 'diseaseType': return diseaseTypeBubbleData;
      default: return gqlBubbleData;
    }
  }, [bubbleView, gqlBubbleData, ghaTypeBubbleData, diseaseBubbleData, diseaseTypeBubbleData]);

  const activeBubbleLoading =
    bubbleView === 'gha' ? bubbleLoading
    : bubbleView === 'ghaType' ? ghaTypeLoading
    : bubbleView === 'disease' ? diseaseBubbleLoading
    : diseaseTypeLoading;

  // Per-view bubble color scale. GHA tab uses a single ramp (rank-based);
  // sub-tabs colour each bubble by its parent GHA's gradient.
  const bubbleColorScale = useMemo(() => {
    if (bubbleView === 'gha') {
      const palette = chartColors.bubbleRamps.gha;
      return createBubbleColorScale(palette);
    }
    return createGhaGroupColorScale(
      chartColors.ghaGradients,
      chartColors.bubbleRamps.gha,
    );
  }, [bubbleView]);

  const renderBubbleTooltip = useCallback((d) => {
    const showCands = bubbleCandidateTypes.includes('Candidate');
    const showProds = bubbleCandidateTypes.includes('Product');
    // Hide a row only when exactly one type is selected. Both/neither
    // selected restores the original two-row tooltip.
    const isFiltered = showCands !== showProds;
    const tooltipShowCands = !isFiltered || showCands;
    const tooltipShowProds = !isFiltered || showProds;
    return (
      <div>
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{d?.label || d?.name}</div>
        {tooltipShowCands && (
          <div>{(d?.candidateCount ?? 0).toLocaleString()} candidates</div>
        )}
        {tooltipShowProds && (
          <div>{(d?.productCount ?? 0).toLocaleString()} approved products</div>
        )}
      </div>
    );
  }, [bubbleCandidateTypes]);

  // Per-view table column spec, consumed by <Table> (which wants
  // `header`/`accessor`/`type`) and mapped for CSV export below. The
  // `share` column's render function reads the pre-computed percentage
  // baked onto each row in `activeBubbleTableRows`.
  const bubbleTableColumns = useMemo(() => {
    const TOTAL = { header: 'Total', accessor: 'value', type: 'number' };
    const CANDS = { header: 'Candidates in development', accessor: 'candidateCount', type: 'number' };
    const PRODS = { header: 'Approved products', accessor: 'productCount', type: 'number' };
    const SHARE = {
      header: 'Share',
      accessor: 'share',
      render: (value) => <span className="tabular-nums">{value}</span>,
    };

    // When exactly one type is selected, drop the unselected count column
    // AND the Total column (which would otherwise duplicate the lone count).
    // Both/neither selected restores the original [Total, Candidates, Products]
    // triple. Same XOR rule used by `renderBubbleTooltip`.
    const showCands = bubbleCandidateTypes.includes('Candidate');
    const showProds = bubbleCandidateTypes.includes('Product');
    const isFiltered = showCands !== showProds;
    const countCols = isFiltered
      ? (showCands ? [CANDS] : [PRODS])
      : [TOTAL, CANDS, PRODS];

    switch (bubbleView) {
      case 'ghaType':
        return [
          { header: 'Health area', accessor: 'group' },
          { header: 'Product type', accessor: 'productType' },
          ...countCols,
        ];
      case 'disease':
        return [
          { header: 'Health area', accessor: 'group' },
          { header: 'Disease', accessor: 'name' },
          ...countCols,
        ];
      case 'diseaseType':
        return [
          { header: 'Health area', accessor: 'group' },
          { header: 'Disease', accessor: 'disease' },
          { header: 'Product type', accessor: 'productType' },
          ...countCols,
        ];
      default: // gha
        return [
          { header: 'Health area', accessor: 'name' },
          ...countCols,
          SHARE,
        ];
    }
  }, [bubbleView, bubbleCandidateTypes]);

  // Bake the `share` percentage onto each row so the Table's render
  // function doesn't need access to the dataset total. Also gives the
  // CSV export a ready-to-serialize string.
  const activeBubbleTableRows = useMemo(() => {
    const total = activeBubbleData.reduce((sum, d) => sum + (d.value || 0), 0);
    return activeBubbleData.map((row) => ({
      ...row,
      share: total > 0 ? `${((row.value / total) * 100).toFixed(1)}%` : '0%',
      id: row.key || row.name,
    }));
  }, [activeBubbleData]);
  const { products, loading: productsLoading } = useProducts();
  const { phases, loading: phasesLoading } = usePhases();
  const { raw: diseasesRaw, loading: diseasesLoading } = useDiseases();
  const { raw: secondaryDiseasesRaw } = useSecondaryDiseases();
  const { hierarchy: diseaseHierarchy } = useDiseaseHierarchy();
  // Two pair sources, one per section: Portfolio Overview pulls from the
  // active-only set so its dropdowns never offer empty-chart combinations;
  // Cross-pipeline keeps the broader set because its temporal chart
  // legitimately spans retired snapshots.
  const { pairs: activePairs, loading: activePairsLoading } = useActivePipelineFilterPairs();
  const { pairs, loading: pairsLoading } = usePipelineFilterPairs();
  const { years: availableYears, loading: yearsLoading } = useAvailableYears();
  const { mapData: gqlMapData, distributionList: gqlMapDistribution, loading: mapLoading } = useGeographicDistribution(
    mapTab === 'trials' ? 'Trial Location' : 'Developer Location'
  );
  const expandedCrossProduct = crossProduct;
  const { chartData: temporalChartData, phases: temporalPhases, loading: temporalLoading } = useTemporalSnapshots(
    availableYears,
    crossGlobalHealthArea.length > 0 ? crossGlobalHealthArea : null,
    expandedCrossProduct.length > 0 ? expandedCrossProduct.map(v => parseInt(v, 10)) : null,
  );

  // WHO Priority Alignment data — single consolidated query feeds the
  // three GHA cards plus both donut charts. All four filter axes are
  // sourced from the sidebar's global filters so this section stays in
  // lockstep with every other page rather than maintaining its own
  // disconnected dropdown state.
  const {
    totalPriorities: whoTotalPriorities,
    byArea: whoByArea,
    candidatesWithPriorityTotal: whoCandidatesWithPriority,
    productTypeChartData: whoProductTypeChartData,
    womenOrChildrenChartData: whoWomenChildrenChartData,
    loading: whoLoading,
  } = usePriorityAlignment(
    globalFilters.healthArea,
    globalFilters.primary,
    globalFilters.secondary,
    globalFilters.expandedProduct,
  );

  // Build the /who-priority-alignment link with the four shared URL
  // keys so navigation preserves the active selection. A plain
  // <a href="/who-priority-alignment"> drops the query string, which
  // is why the destination page used to boot unfiltered. The WHO
  // page's useWhoPageFilters reads `gha`, `primary`, `secondary`,
  // `product` — same encoding (comma-joined arrays via
  // arraySerializer) — so we encode each non-empty axis below and
  // skip empties to keep the URL short.
  const exploreHref = useMemo(() => {
    const params = new URLSearchParams();
    if (globalFilters.healthArea.length > 0) params.set('gha', globalFilters.healthArea.join(','));
    if (globalFilters.primary.length > 0) params.set('primary', globalFilters.primary.join(','));
    if (globalFilters.secondary.length > 0) params.set('secondary', globalFilters.secondary.join(','));
    if (globalFilters.product.length > 0) params.set('product', globalFilters.product.join(','));
    const qs = params.toString();
    return qs ? `/who-priority-alignment?${qs}` : '/who-priority-alignment';
  }, [
    globalFilters.healthArea,
    globalFilters.primary,
    globalFilters.secondary,
    globalFilters.product,
  ]);

  // Candidate type distribution with filters
  // Product keys are strings in state (URL-safe), convert to integers for the API.
  const expandedProduct = product;
  const { chartData: portfolioChartData, segments: portfolioSegments, loading: portfolioLoading } = useCandidateTypeDistribution(
    expandedProduct.length > 0 ? expandedProduct.map(v => parseInt(v, 10)) : expandedProduct,
    rdStage.length > 0 ? rdStage : null,
  );

  // Product options for dropdown (from API).
  // Values are strings to stay consistent with URL serialization.
  const allProductOptions = useMemo(
    () => products.map((p) => ({ label: p.product_name, value: String(p.product_key) })),
    [products],
  );

  // VCP child option values (product keys) for the hierarchical filter.
  const productGroupMembers = useMemo(() => vcpMemberKeys(products), [products]);

  // Phase options shaped to feed `useCrossFilteredOptions`.
  // Values are the canonical phase names (matching what the URL stores in
  // `rdStage`); labels apply the simplified-name override when present.
  const allPhaseOptions = useMemo(
    () => phases.map(p => ({
      label: SIMPLIFIED_PHASE_NAMES[p.name] || p.name,
      value: p.name,
    })),
    [phases]
  );

  // Portfolio section: cross-filter Product type ↔ R&D stage via the hook.
  // No GHA/disease filters are exposed here — pass empty arrays. Pruning of
  // stale selections is handled inside the hook.
  const {
    productOptions,
    rdPhaseOptions: rdStageOptions,
  } = useCrossFilteredOptions({
    data: {
      healthAreas: [],
      diseasesRaw,
      pairs: activePairs,
      allProductOptions,
      allPhaseOptions,
    },
    selections: {
      healthArea: [],
      disease: [],
      product,
      rdPhase: rdStage,
    },
    setters: {},
    loading: {
      healthAreas: false,
      diseases: diseasesLoading,
      products: productsLoading,
      pairs: activePairsLoading,
    },
    mode: 'by-key',
  });

  // Cross-pipeline section: cross-filter GHA ↔ product via the hook
  const {
    healthAreaOptions: crossHealthAreaOptions,
    productOptions: crossProductFilteredOptions,
  } = useCrossFilteredOptions({
    data: { healthAreas: gqlBubbleData, diseasesRaw, pairs, allProductOptions },
    selections: { healthArea: crossGlobalHealthArea, disease: [], product: crossProduct },
    setters: {},
    loading: { healthAreas: bubbleLoading, diseases: diseasesLoading, products: productsLoading, pairs: pairsLoading },
    mode: 'by-key',
  });

  // Local pruning: clear stale homepage-local selections when options narrow.
  useEffect(() => {
    if (product.length === 0 || productOptions.length === 0) return;
    const validValues = new Set(productOptions.map((o) => o.value));
    const valid = product.filter((v) => validValues.has(v));
    if (valid.length !== product.length) setProduct(valid);
  }, [productOptions, product, setProduct]);

  useEffect(() => {
    if (rdStage.length === 0 || rdStageOptions.length === 0) return;
    const validValues = new Set(rdStageOptions.map((o) => o.value));
    const valid = rdStage.filter((v) => validValues.has(v));
    if (valid.length !== rdStage.length) setRdStage(valid);
  }, [rdStageOptions, rdStage, setRdStage]);

  useEffect(() => {
    if (crossGlobalHealthArea.length === 0 || crossHealthAreaOptions.length === 0) return;
    const validValues = new Set(crossHealthAreaOptions.map((o) => o.value));
    const valid = crossGlobalHealthArea.filter((v) => validValues.has(v));
    if (valid.length !== crossGlobalHealthArea.length) setCrossGlobalHealthArea(valid);
  }, [crossHealthAreaOptions, crossGlobalHealthArea, setCrossGlobalHealthArea]);

  useEffect(() => {
    if (crossProduct.length === 0 || crossProductFilteredOptions.length === 0) return;
    const validValues = new Set(crossProductFilteredOptions.map((o) => o.value));
    const valid = crossProduct.filter((v) => validValues.has(v));
    if (valid.length !== crossProduct.length) setCrossProduct(valid);
  }, [crossProductFilteredOptions, crossProduct, setCrossProduct]);

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
              {/* Title + controls share a single row; description drops
                  beneath both so it can't push the controls to a new row. */}
              <div className="flex items-start justify-between gap-3 mb-1">
                <h3 className="text-base sm:text-lg font-bold text-black min-w-0">
                  Scale of R&D by global health area
                </h3>
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
                      const csvColumns = bubbleTableColumns.map((c) => ({
                        label: c.header,
                        accessor: c.accessor,
                      }));
                      const csv = buildCSV(csvColumns, activeBubbleTableRows);
                      downloadCSVFile(csv, `scale-of-rd-${bubbleView}`);
                    }}
                    onDownloadPNG={() => downloadPNG(bubbleChartRef, `scale-of-rd-${bubbleView}`)}
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
              <p className="text-sm text-gray-500 mb-3">
                Switch between candidates in development and approved products through the dropdown above.
              </p>
              <TabNav
                tabs={bubbleViewTabs}
                activeTab={bubbleView}
                onChange={setBubbleView}
                className="mb-4"
              />
              <div ref={bubbleChartRef} className="flex-1">
              {activeBubbleLoading ? (
                <div className="h-[320px] flex items-center justify-center">
                  <div className="animate-pulse text-gray-400">Loading chart...</div>
                </div>
              ) : !activeBubbleData || activeBubbleData.length === 0 ? (
                <ChartEmptyState variant="bubble" height={320} />
              ) : chartViewTab === 'visual' ? (
                <BubbleChart
                  data={activeBubbleData}
                  height={380}
                  colorScale={bubbleColorScale}
                  tooltip={renderBubbleTooltip}
                />
              ) : (
                <DataTable
                  // Remount on tab change so DataTable's internal
                  // state (column widths, sticky measurements) resets
                  // cleanly. Parent-owned `bubblePage` resets to 1 in
                  // the view-change effect above, so each tab opens on
                  // page 1 regardless of where the previous tab left
                  // off.
                  key={bubbleView}
                  tableId={`bubble-drill-${bubbleView}`}
                  serverSide={false}
                  columns={bubbleTableColumns}
                  data={activeBubbleTableRows}
                  page={bubblePage}
                  onPageChange={setBubblePage}
                  itemsPerPage={6}
                  sort={bubbleSort}
                  onSortChange={setBubbleSort}
                  visibleColumns={bubbleVisibleColumns}
                  onVisibleColumnsChange={setBubbleVisibleColumns}
                />
              )}
              </div>
              <p className="text-sm text-gray-500 mt-4 pt-4 border-t border-gray-200">
                This bubble chart shows the relative scale of the product development landscape across global health areas. Each bubble represents a global health area, with its size indicating the number of products in scope. Use the toggle to switch between candidates in development and approved products to compare where R&D activity and market-ready solutions are most concentrated.
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
                <HierarchicalProductFilter
                  label="Product type"
                  selected={product}
                  onChange={setProduct}
                  placeholder="All"
                  options={productOptions}
                  groupMembers={productGroupMembers}
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
                <HierarchicalProductFilter
                  label="Product type"
                  selected={crossProduct}
                  onChange={setCrossProduct}
                  placeholder="All"
                  options={crossProductFilteredOptions}
                  groupMembers={productGroupMembers}
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

          {/* WHO Priority Alignment */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-black">
                  Priority Alignment
                </h3>
                <p className="text-sm text-gray-500">
                  Compare WHO priorities with pipeline
                </p>
              </div>
              {/* In-section disease dropdown is bound to the same
                  primary/secondary URL params as the sidebar's Disease
                  filter, so picking a disease here updates the sidebar
                  too (and vice versa). The neighbouring button flips
                  from white/border "View all" to the orange "Explore
                  selected" CTA as soon as any global filter axis is
                  active — pairing them visually so the state change
                  is obvious without making users hunt for the sidebar.
                  Destination page reads the same URL keys via
                  `useWhoPageFilters`, so the selection carries over. */}
              <div className="flex items-center gap-2">
                <div className="w-[240px]">
                  <HierarchicalDiseaseFilter
                    hierarchy={globalFilters.narrowedHierarchy}
                    primarySelected={globalFilters.primary}
                    secondarySelected={globalFilters.secondary}
                    onChange={({ primarySelected, secondarySelected }) => {
                      globalFilters.setPrimary(primarySelected);
                      globalFilters.setSecondary(secondarySelected);
                    }}
                    placeholder="Select disease"
                  />
                </div>
                {globalFilters.hasFilters ? (
                  <a
                    href={exploreHref}
                    className="inline-flex items-center bg-orange-500 text-black px-4 py-2.5 text-sm font-medium no-underline cursor-pointer hover:bg-black hover:text-white transition-colors"
                  >
                    Explore selected
                  </a>
                ) : (
                  <a
                    href={exploreHref}
                    className="inline-flex items-center bg-white text-black border border-gray-300 px-4 py-2.5 text-sm font-medium no-underline cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    View all
                  </a>
                )}
              </div>
            </div>
            <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />

            <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_1fr] gap-4">
              {/* Column 1: 4 stacked cards */}
              <div className="flex flex-col gap-4">
                {whoLoading ? (
                  <>
                    <PriorityTotalCard loading />
                    {[0, 1, 2].map((i) => (
                      <PriorityShareCard key={i} loading />
                    ))}
                  </>
                ) : (
                  <>
                    <PriorityTotalCard total={whoTotalPriorities} />
                    {whoByArea.map((area) => (
                      <PriorityShareCard
                        key={area.global_health_area}
                        title={displayHealthArea(area.global_health_area)}
                        description="Pipeline aligned with a WHO priority."
                        candidatesWithPriority={area.candidatesWithPriority}
                        totalCandidates={area.totalCandidates}
                        accentColor={WHO_RING_COLORS[area.global_health_area]}
                      />
                    ))}
                  </>
                )}
              </div>

              {/* Column 2: Product types donut */}
              <div ref={productTypesChartRef} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="text-base font-bold text-black">Product types</h4>
                  <ChartMenu
                    onDownloadCSV={() => {
                      const csv = buildCSV(
                        [
                          { label: 'Product type', accessor: 'name' },
                          { label: 'Candidates', accessor: 'value' },
                        ],
                        whoProductTypeChartData,
                      );
                      downloadCSVFile(csv, 'priority-alignment-product-types');
                    }}
                    onDownloadPNG={() => downloadPNG(productTypesChartRef, 'priority-alignment-product-types')}
                  />
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  Distribution of R&D pipeline across product types.
                </p>
                <div className="flex-1 flex items-center justify-center">
                  {whoLoading ? (
                    <div className="h-[280px] flex items-center justify-center">
                      <div className="animate-pulse text-gray-400">Loading chart...</div>
                    </div>
                  ) : whoProductTypeChartData.length === 0 || whoCandidatesWithPriority === 0 ? (
                    <ChartEmptyState variant="donut" height={280} />
                  ) : (
                    <div className="w-full">
                      <DonutChart
                        data={whoProductTypeChartData}
                        colors={WHO_PRODUCT_TYPE_COLORS}
                        height={280}
                        legendPosition="top"
                        innerRadius={50}
                        outerRadius={90}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Column 3: Women / children donut.
                  Fed by dim_priority.dedicated_to_women_or_children, the
                  "Yes"/"No"/null Two-Options field projected from
                  Dataverse's crc8b_dedicatedtowomenorchildren. */}
              <div ref={womenChildrenChartRef} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 className="text-base font-bold text-black">
                    Share of priorities dedicated to women or children
                  </h4>
                  <ChartMenu
                    onDownloadCSV={() => {
                      const csv = buildCSV(
                        [
                          { label: 'Category', accessor: 'name' },
                          { label: 'Count', accessor: 'value' },
                        ],
                        whoWomenChildrenChartData,
                      );
                      downloadCSVFile(csv, 'priority-alignment-women-or-children');
                    }}
                    onDownloadPNG={() => downloadPNG(womenChildrenChartRef, 'priority-alignment-women-or-children')}
                  />
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  Yes / No split with priorities still awaiting classification shown as NA.
                </p>
                <div className="flex-1 flex items-center justify-center">
                  {whoLoading ? (
                    <div className="h-[280px] flex items-center justify-center">
                      <div className="animate-pulse text-gray-400">Loading chart...</div>
                    </div>
                  ) : whoWomenChildrenChartData.length === 0 || whoCandidatesWithPriority === 0 ? (
                    <ChartEmptyState variant="donut" height={280} />
                  ) : (
                    <div className="w-full">
                      <DonutChart
                        data={whoWomenChildrenChartData}
                        colors={whoWomenChildrenChartData.map((slice) => WHO_W_OR_C_COLORS[slice.name])}
                        height={280}
                        legendPosition="bottom"
                        innerRadius={50}
                        outerRadius={90}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <ReportsAndInsights />
        </div>
      </main>

      <DiseaseListPanel
        isOpen={diseasePanelOpen}
        onClose={() => setDiseasePanelOpen(false)}
        hierarchy={diseaseHierarchy}
      />
    </div>
  );
}
