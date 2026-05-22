'use client';

// =========================================================
// <AggregatedSection/> — four-tab aggregated portfolio view
// =========================================================
//
// The bottom half of the combined `/portfolio-analysis` page,
// anchored at `#aggregated`. Owns its own URL state for the
// four sub-tabs (Candidates / Approved products / Clinical
// trials / Technology types), the per-table filters/sort/
// visible-columns/pagination, the geographic trial-status
// filter, and the slide-in panel state.
//
// Does NOT own a page header or the global filter bar — those
// are rendered once at the page level. The section's own
// heading is an inline <h3> inside the white content card,
// matching the pre-split single-page design.

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useUrlState } from '@/lib/useUrlState';
import { arraySerializer, numberSerializer, stringSerializer } from '@/lib/url-serializers';
import {
  encodeFilters,
  decodeFilters,
  encodeSort,
  decodeSort,
  hydrateFiltersFromUrl,
} from '@/lib/dataTableUrl';
import { toColumnFilters, toColumnSort } from '@/lib/dataTableGraphQL';
import { Dropdown, ChartMenu, DataTable } from '@/components/ui';
import { CloudDownloadIcon } from '@/components/icons';
import {
  StackedBarChart,
  DonutChart,
  BarChart,
  WorldMap,
  ChartEmptyState,
} from '@/components/charts';
import {
  useRegulatoryDistribution,
  useClinicalTrialStats,
  useClinicalTrials,
  usePortfolioCandidates,
  useGeographicDistribution,
  useTechnologyTypeDistribution,
  useProductDistribution,
} from '@/graphql/hooks';
import { VECTOR_CONTROL_PRODUCT_NAMES, VECTOR_CONTROL_CONSOLIDATED_NAME } from '@/lib/filterGroups';
import { fetchAllCandidates } from '@/lib/fetchAllCandidates';
import { fetchAllTrials } from '@/lib/fetchAllTrials';
import { buildCSV, downloadCSV } from '@/lib/csv';
import { downloadPNG } from '@/lib/png';
import { createHeatmapScale } from '@/lib/heatmap';
import {
  buildCandidateColumns,
  buildApprovedProductColumns,
  buildClinicalTrialColumns,
  toCSVColumns,
  CANDIDATE_COLUMNS,
  APPROVED_PRODUCT_COLUMNS,
  CLINICAL_TRIAL_COLUMNS,
} from '@/lib/exploreColumnConfig';
import {
  CandidateSlideIn,
  ProductSlideIn,
  TrialSlideIn,
} from '@/components/slideins';
import { useGlobalFilters } from './useGlobalFilters';

const ageGroupColors = ['#f9a78d', '#54a5c4', '#fe7449', '#ddd6fe', '#f0b456', '#a78bfa'];

const approvingAuthoritiesPhases = [
  { key: 'who_prequalified', label: 'WHO prequalified', color: '#fe7449' },
  { key: 'no_who_listing', label: 'No formal WHO listing', color: '#f9a78d' },
];

export default function AggregatedSection() {
  const {
    healthArea,
    primary,
    secondary,
    product,
    rdPhase,
    expandedProduct,
  } = useGlobalFilters();

  // =========================================================
  // URL-backed aggregated-page state
  // =========================================================

  const [portfolioTab, setPortfolioTab] = useUrlState('view', 'candidates', { ...stringSerializer, historyMode: 'push' });
  // Per-column DataTable filter / sort / visible-columns state for the
  // Candidates tab. Encoded compactly so the URL reads
  // `?f.candidates=indication:tb&s.candidates=current_rd_stage:asc&cols.candidates=...`
  const candidatesFilterSerializer = useMemo(
    () => ({
      serialize: encodeFilters,
      // Hydrate against the static column config so TEXT vs CATEGORY
      // is recovered on URL load (decoder alone returns
      // category-shape).
      deserialize: (s) => hydrateFiltersFromUrl(decodeFilters(s), CANDIDATE_COLUMNS),
      debounceMs: 500,
    }),
    [],
  );
  const approvedFilterSerializer = useMemo(
    () => ({
      serialize: encodeFilters,
      deserialize: (s) => hydrateFiltersFromUrl(decodeFilters(s), APPROVED_PRODUCT_COLUMNS),
      debounceMs: 500,
    }),
    [],
  );
  const trialsFilterSerializer = useMemo(
    () => ({
      serialize: encodeFilters,
      deserialize: (s) => hydrateFiltersFromUrl(decodeFilters(s), CLINICAL_TRIAL_COLUMNS),
      debounceMs: 500,
    }),
    [],
  );
  const sortSerializer = useMemo(
    () => ({ serialize: encodeSort, deserialize: decodeSort }),
    [],
  );
  const [candidatesFilters, setCandidatesFilters] = useUrlState('f.candidates', {}, candidatesFilterSerializer);
  const [candidatesSort, setCandidatesSort] = useUrlState('s.candidates', null, sortSerializer);
  const [candidatesVisibleCols, setCandidatesVisibleCols] = useUrlState('cols.candidates', [], arraySerializer);
  const [approvedFilters, setApprovedFilters] = useUrlState('f.approved', {}, approvedFilterSerializer);
  const [approvedSort, setApprovedSort] = useUrlState('s.approved', null, sortSerializer);
  const [approvedVisibleCols, setApprovedVisibleCols] = useUrlState('cols.approved', [], arraySerializer);
  const [trialsFilters, setTrialsFilters] = useUrlState('f.trials', {}, trialsFilterSerializer);
  const [trialsSort, setTrialsSort] = useUrlState('s.trials', null, sortSerializer);
  const [trialsVisibleCols, setTrialsVisibleCols] = useUrlState('cols.trials', [], arraySerializer);
  // Technology types runs DataTable in client-side mode against a
  // fully-loaded dataset, so filters / sort / visible cols all live in
  // the URL the same way the server-side tables do.
  const technologyFilterSerializer = useMemo(
    () => ({
      // Hydration runs without the dynamic phase columns since they
      // depend on backend data, but the only filterable column here is
      // technology_type (TEXT) which is statically known. Decoder
      // returns category-shape entries by default; coerce
      // `technology_type` back to TEXT explicitly.
      serialize: encodeFilters,
      deserialize: (s) => {
        const decoded = decodeFilters(s);
        const out = {};
        for (const [accessor, entry] of Object.entries(decoded ?? {})) {
          if (accessor === 'technology_type' && entry?.values?.[0] != null) {
            out[accessor] = { kind: 'text', text: String(entry.values[0]) };
          } else {
            out[accessor] = entry;
          }
        }
        return out;
      },
      debounceMs: 500,
    }),
    [],
  );
  const [technologyFilters, setTechnologyFilters] = useUrlState('f.technology', {}, technologyFilterSerializer);
  const [technologySort, setTechnologySort] = useUrlState('s.technology', null, sortSerializer);
  const [technologyVisibleCols, setTechnologyVisibleCols] = useUrlState('cols.technology', [], arraySerializer);
  const [candidatesPage, setCandidatesPage] = useUrlState('cPage', 1, numberSerializer);
  const [approvedPage, setApprovedPage] = useUrlState('aPage', 1, numberSerializer);
  const [trialsPage, setTrialsPage] = useUrlState('tPage', 1, numberSerializer);
  const [currentPage, setCurrentPage] = useUrlState('techPage', 1, numberSerializer);
  const [authHiddenPhases, setAuthHiddenPhases] = useUrlState('ahide', [], arraySerializer);
  const [approvalHiddenItems, setApprovalHiddenItems] = useUrlState('apphide', [], arraySerializer);
  const [trialStatusHiddenItems, setTrialStatusHiddenItems] = useUrlState('tshide', [], arraySerializer);
  const [geoTrialStatus, setGeoTrialStatus] = useUrlState('trialStatus', [], arraySerializer);
  const [slideInOpen, setSlideInOpen] = useUrlState('slide', null, stringSerializer);
  const [slideInKey, setSlideInKey] = useUrlState('slideKey', null, numberSerializer);

  const closeSlideIn = useCallback(() => {
    setSlideInOpen(null);
    setSlideInKey(null);
  }, [setSlideInOpen, setSlideInKey]);

  // =========================================================
  // Local-only state
  // =========================================================

  const [candidatesDownloading, setCandidatesDownloading] = useState(false);
  const [approvedDownloading, setApprovedDownloading] = useState(false);
  const [trialsDownloading, setTrialsDownloading] = useState(false);
  const [technologyDownloading, setTechnologyDownloading] = useState(false);
  const [selectedProductType, setSelectedProductType] = useState(null);
  const [vcpSubProduct, setVcpSubProduct] = useState(null);

  // Skip the first search-triggered page reset — during hydration
  // the search queries transition from '' to their URL value,
  // which would otherwise wipe out the page param from a shared
  // URL.
  const apolloClient = useApolloClient();
  const itemsPerPage = 10;
  const trialsPerPage = 10;
  const techItemsPerPage = 10;

  const globalFilter = {
    globalHealthAreas: healthArea,
    primaryDiseaseNames: primary,
    secondaryDiseaseNames: secondary,
    productNames: expandedProduct,
    phaseNames: rdPhase,
  };

  // =========================================================
  // Per-tab column definitions with Explore handlers
  // =========================================================
  //
  // Each factory injects an `onExplore` callback that sets the
  // URL-backed slide-in type + key, opening the appropriate panel.

  const candidateColumns = useMemo(
    () =>
      buildCandidateColumns({
        onExplore: (row) => {
          setSlideInOpen('candidate');
          setSlideInKey(row.candidate_key);
        },
      }),
    [setSlideInOpen, setSlideInKey],
  );

  const approvedColumns = useMemo(
    () =>
      buildApprovedProductColumns({
        onExplore: (row) => {
          setSlideInOpen('product');
          setSlideInKey(row.candidate_key);
        },
      }),
    [setSlideInOpen, setSlideInKey],
  );

  const trialColumns = useMemo(
    () =>
      buildClinicalTrialColumns({
        onExplore: (row) => {
          setSlideInOpen('trial');
          setSlideInKey(row.trial_id);
        },
      }),
    [setSlideInOpen, setSlideInKey],
  );

  // =========================================================
  // Data hooks
  // =========================================================

  const candidatesColumnFilters = useMemo(
    () => toColumnFilters(candidatesFilters),
    [candidatesFilters],
  );
  const candidatesSortVar = useMemo(
    () => toColumnSort(candidatesSort),
    [candidatesSort],
  );
  // Filter context handed to DataTable so its CategoryFilter dropdowns
  // (powered by the `distinctValues` GraphQL query) honour the page-level
  // filters — GHA, primary/secondary disease, product, R&D phase — plus
  // every other active per-column filter. Without this the dropdowns
  // would show every value in the table regardless of the user's wider
  // filter selection. Shape matches the GraphQL `ColumnFilterContext`
  // input (snake_case).
  const candidatesFilterContext = useMemo(
    () => ({
      global_health_areas: healthArea?.length > 0 ? healthArea : undefined,
      primary_disease_names: primary?.length > 0 ? primary : undefined,
      secondary_disease_names: secondary?.length > 0 ? secondary : undefined,
      product_names: expandedProduct?.length > 0 ? expandedProduct : undefined,
      candidate_type: 'Candidate',
      phase_names: rdPhase?.length > 0 ? rdPhase : undefined,
      column_filters: candidatesColumnFilters,
    }),
    [healthArea, primary, secondary, expandedProduct, rdPhase, candidatesColumnFilters],
  );
  const { candidates: candidatesData, totalCount: candidatesTotalCount, hasNextPage: candidatesHasNext, loading: candidatesLoading } = usePortfolioCandidates(
    {
      ...globalFilter,
      candidateType: 'Candidate',
      columnFilters: candidatesColumnFilters,
    },
    itemsPerPage,
    (candidatesPage - 1) * itemsPerPage,
    { sort: candidatesSortVar },
  );
  const approvedColumnFilters = useMemo(
    () => toColumnFilters(approvedFilters),
    [approvedFilters],
  );
  const approvedSortVar = useMemo(
    () => toColumnSort(approvedSort),
    [approvedSort],
  );
  const approvedFilterContext = useMemo(
    () => ({
      global_health_areas: healthArea?.length > 0 ? healthArea : undefined,
      primary_disease_names: primary?.length > 0 ? primary : undefined,
      secondary_disease_names: secondary?.length > 0 ? secondary : undefined,
      product_names: expandedProduct?.length > 0 ? expandedProduct : undefined,
      candidate_type: 'Product',
      phase_names: rdPhase?.length > 0 ? rdPhase : undefined,
      column_filters: approvedColumnFilters,
    }),
    [healthArea, primary, secondary, expandedProduct, rdPhase, approvedColumnFilters],
  );
  const { candidates: approvedProductsData, totalCount: approvedTotalCount, hasNextPage: approvedHasNext, loading: approvedLoading } = usePortfolioCandidates(
    {
      ...globalFilter,
      candidateType: 'Product',
      columnFilters: approvedColumnFilters,
    },
    itemsPerPage,
    (approvedPage - 1) * itemsPerPage,
    { sort: approvedSortVar },
  );
  const {
    approvalStatus: approvalStatusData,
    whoPrequalification: whoPrequalData,
    approvingAuthorities: approvingAuthoritiesData,
    loading: regulatoryLoading,
  } = useRegulatoryDistribution(healthArea, primary, secondary, expandedProduct, rdPhase);
  const {
    statusDistribution: trialStatusData,
    ageGroupDistribution: ageGroupsData,
    loading: trialsLoading,
  } = useClinicalTrialStats(healthArea, primary, secondary, expandedProduct, rdPhase);
  const trialsColumnFilters = useMemo(
    () => toColumnFilters(trialsFilters),
    [trialsFilters],
  );
  const trialsSortVar = useMemo(
    () => toColumnSort(trialsSort),
    [trialsSort],
  );
  const trialsFilterContext = useMemo(
    () => ({
      global_health_areas: healthArea?.length > 0 ? healthArea : undefined,
      primary_disease_names: primary?.length > 0 ? primary : undefined,
      secondary_disease_names: secondary?.length > 0 ? secondary : undefined,
      product_names: expandedProduct?.length > 0 ? expandedProduct : undefined,
      statuses: geoTrialStatus?.length > 0 ? geoTrialStatus : undefined,
      column_filters: trialsColumnFilters,
    }),
    [healthArea, primary, secondary, expandedProduct, geoTrialStatus, trialsColumnFilters],
  );
  const { trials: clinicalTrialsTableData, totalCount: trialsTotalCount, hasNextPage: trialsHasNextPage, loading: trialsListLoading } = useClinicalTrials(
    {
      globalHealthAreas: healthArea,
      primaryDiseaseNames: primary,
      secondaryDiseaseNames: secondary,
      productNames: expandedProduct,
      statuses: geoTrialStatus,
      columnFilters: trialsColumnFilters,
    },
    trialsPerPage,
    (trialsPage - 1) * trialsPerPage,
    { sort: trialsSortVar },
  );
  const { mapData: clinicalTrialsMapData, distributionList: clinicalTrialsDistribution, loading: geoLoading } = useGeographicDistribution(
    'Trial Location', geoTrialStatus, healthArea, primary, secondary, expandedProduct, rdPhase,
  );
  const {
    tableData: technologyTableData,
    phases: technologyPhases,
    loading: technologyLoading,
  } = useTechnologyTypeDistribution(healthArea, primary, secondary, expandedProduct, rdPhase);

  // Product distribution (for tech tab product type cards)
  const { chartData: productDistData, loading: productDistLoading } = useProductDistribution(
    healthArea, primary, secondary, expandedProduct, rdPhase,
  );

  // Product type cards: consolidate VCP sub-types into one card
  const techProductTypeCards = useMemo(() => {
    if (!productDistData?.length) return [];
    let vcpTotal = 0;
    const rest = [];
    for (const p of productDistData) {
      if (VECTOR_CONTROL_PRODUCT_NAMES.includes(p.name)) {
        vcpTotal += p.value;
      } else {
        rest.push({ name: p.name, candidates: p.value });
      }
    }
    if (vcpTotal > 0) {
      rest.push({ name: VECTOR_CONTROL_CONSOLIDATED_NAME, candidates: vcpTotal });
    }
    return rest.sort((a, b) => b.candidates - a.candidates);
  }, [productDistData]);

  // VCP sub-category cards
  const vcpSubCategories = useMemo(() => {
    if (!productDistData?.length) return [];
    return productDistData
      .filter((p) => VECTOR_CONTROL_PRODUCT_NAMES.includes(p.name))
      .map((p) => ({ name: p.name, candidates: p.value }))
      .sort((a, b) => b.candidates - a.candidates);
  }, [productDistData]);

  const isVcpSelected = selectedProductType === VECTOR_CONTROL_CONSOLIDATED_NAME;

  // Auto-select first product type card when data loads
  useEffect(() => {
    if (techProductTypeCards.length > 0 && !selectedProductType) {
      setSelectedProductType(techProductTypeCards[0].name);
    }
  }, [techProductTypeCards, selectedProductType]);

  // Product names to send to the filtered tech distribution API
  const techFilterProductNames = useMemo(() => {
    if (!selectedProductType) return null;
    if (selectedProductType === VECTOR_CONTROL_CONSOLIDATED_NAME) {
      return vcpSubProduct ? [vcpSubProduct] : VECTOR_CONTROL_PRODUCT_NAMES;
    }
    return [selectedProductType];
  }, [selectedProductType, vcpSubProduct]);

  // Technology type distribution filtered by selected product (for chart)
  const {
    tableData: technologyTableDataFiltered,
    loading: technologyFilteredLoading,
  } = useTechnologyTypeDistribution(
    healthArea, primary, secondary,
    techFilterProductNames || expandedProduct,
    rdPhase,
  );

  // Chart data for the selected product
  const techChartData = useMemo(() => {
    const source = selectedProductType ? technologyTableDataFiltered : technologyTableData;
    if (!source?.length) return [];
    return source;
  }, [selectedProductType, technologyTableDataFiltered, technologyTableData]);

  const selectedProductCandidateTotal = useMemo(() => {
    if (selectedProductType) {
      const card = techProductTypeCards.find((c) => c.name === selectedProductType);
      if (card) return card.candidates;
    }
    return 0;
  }, [selectedProductType, techProductTypeCards]);

  const techChartRef = useRef(null);

  // =========================================================
  // Chart visibility (legend toggles synced to URL)
  // =========================================================

  const authVisiblePhases = useMemo(
    () => approvingAuthoritiesPhases.reduce(
      (acc, p) => ({ ...acc, [p.key]: !authHiddenPhases.includes(p.key) }),
      {},
    ),
    [authHiddenPhases],
  );
  const handleAuthVisiblePhasesChange = useCallback((next) => {
    setAuthHiddenPhases(Object.keys(next).filter((k) => !next[k]));
  }, [setAuthHiddenPhases]);

  const approvalVisibleItems = useMemo(
    () => (approvalStatusData || []).reduce(
      (acc, d) => ({ ...acc, [d.name]: !approvalHiddenItems.includes(d.name) }),
      {},
    ),
    [approvalStatusData, approvalHiddenItems],
  );
  const handleApprovalVisibleItemsChange = useCallback((next) => {
    setApprovalHiddenItems(Object.keys(next).filter((k) => !next[k]));
  }, [setApprovalHiddenItems]);

  const trialStatusVisibleItems = useMemo(
    () => (trialStatusData || []).reduce(
      (acc, d) => ({ ...acc, [d.name]: !trialStatusHiddenItems.includes(d.name) }),
      {},
    ),
    [trialStatusData, trialStatusHiddenItems],
  );
  const handleTrialStatusVisibleItemsChange = useCallback((next) => {
    setTrialStatusHiddenItems(Object.keys(next).filter((k) => !next[k]));
  }, [setTrialStatusHiddenItems]);

  // =========================================================
  // Refs for PNG download capture targets
  // =========================================================

  const approvalStatusChartRef = useRef(null);
  const approvingAuthoritiesChartRef = useRef(null);
  const whoPrequalChartRef = useRef(null);
  const ageGroupsChartRef = useRef(null);
  const trialStatusChartRef = useRef(null);
  const geoDistributionChartRef = useRef(null);

  // =========================================================
  // Technology types: heatmap colour scale
  // =========================================================
  //
  // The heatmap colour scale is derived from the full dataset (not
  // the current page) so colours stay stable across pages and
  // filter changes. DataTable in `serverSide={false}` mode handles
  // filter / sort / pagination internally — no slicing needed here.

  const phaseAccessors = technologyPhases.map((p) => p.key);
  const getHeatmapStyle = useMemo(
    () => createHeatmapScale(technologyTableData, phaseAccessors),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [technologyTableData, technologyPhases],
  );
  // Materialise `_total` on each row so DataTable's number filter and
  // sort can read it — render alone isn't enough; client-side filtering
  // reads `row[accessor]` directly.
  const technologyRowsWithTotal = useMemo(
    () =>
      technologyTableData.map((row) => ({
        ...row,
        _total: phaseAccessors.reduce((s, key) => s + (row[key] || 0), 0),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [technologyTableData, technologyPhases],
  );

  // =========================================================
  // CSV download handlers
  // =========================================================

  const handleCandidatesDownloadCSV = useCallback(async () => {
    setCandidatesDownloading(true);
    try {
      const allRows = await fetchAllCandidates(apolloClient, {
        ...globalFilter,
        candidateType: 'Candidate',
        columnFilters: candidatesColumnFilters,
      });
      const csv = buildCSV(toCSVColumns(CANDIDATE_COLUMNS), allRows);
      downloadCSV(csv, 'selected-candidates');
    } catch (err) {
      console.error('Candidates CSV download failed:', err);
    } finally {
      setCandidatesDownloading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apolloClient, healthArea, primary, secondary, product, candidatesColumnFilters]);

  const handleApprovedDownloadCSV = useCallback(async () => {
    setApprovedDownloading(true);
    try {
      const allRows = await fetchAllCandidates(apolloClient, {
        ...globalFilter,
        candidateType: 'Product',
        columnFilters: approvedColumnFilters,
      });
      const csv = buildCSV(toCSVColumns(APPROVED_PRODUCT_COLUMNS), allRows);
      downloadCSV(csv, 'selected-products');
    } catch (err) {
      console.error('Approved products CSV download failed:', err);
    } finally {
      setApprovedDownloading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apolloClient, healthArea, primary, secondary, product, approvedColumnFilters]);

  const handleTrialsDownloadCSV = useCallback(async () => {
    setTrialsDownloading(true);
    try {
      const allRows = await fetchAllTrials(apolloClient, {
        globalHealthAreas: healthArea,
        primaryDiseaseNames: primary,
        secondaryDiseaseNames: secondary,
        productNames: expandedProduct,
        statuses: geoTrialStatus,
        columnFilters: trialsColumnFilters,
      });
      const csv = buildCSV(toCSVColumns(CLINICAL_TRIAL_COLUMNS), allRows);
      downloadCSV(csv, 'selected-clinical-trials');
    } catch (err) {
      console.error('Clinical trials CSV download failed:', err);
    } finally {
      setTrialsDownloading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apolloClient, healthArea, primary, secondary, product, geoTrialStatus, trialsColumnFilters]);

  const handleTechnologyDownloadCSV = useCallback(() => {
    setTechnologyDownloading(true);
    try {
      const columns = [
        { label: 'Name', accessor: 'technology_type' },
        ...technologyPhases.map((phase) => ({
          label: phase.label,
          accessor: phase.key,
        })),
        {
          label: 'Total',
          accessor: (row) => {
            const keys = technologyPhases.map((p) => p.key);
            return keys.reduce((sum, key) => sum + (row[key] || 0), 0);
          },
        },
      ];
      const csv = buildCSV(columns, technologyTableData);
      downloadCSV(csv, 'technology-types');
    } catch (err) {
      console.error('Technology types CSV download failed:', err);
    } finally {
      setTechnologyDownloading(false);
    }
  }, [technologyTableData, technologyPhases]);

  return (
    <>
      <div className="bg-white border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-black">Aggregated portfolio</h3>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          The aggregated portfolio lets you deep dive into four key views of the pipeline: active candidates, approved products, clinical trials and technology types. They can be accessed via the tabs below. All views reflect the page level filters.
        </p>
        <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />

        {/* Sub-tabs */}
        <div className="flex gap-6 border-b border-gray-200">
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
              {tab === 'approved' && 'Approved products'}
              {tab === 'trials' && 'Clinical trials'}
              {tab === 'technology' && 'Technology types'}
            </button>
          ))}
        </div>

        {/* Candidates */}
        {portfolioTab === 'candidates' && (
          <div className="border border-gray-200 border-t-0">
            <div className="flex items-center justify-between p-4 pb-0 mb-4">
              <div className="flex items-center gap-3">
                <h4 className="text-xl font-bold text-black leading-none">Selected candidates</h4>
                <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">{candidatesTotalCount} candidates</span>
              </div>
              <div className="flex items-center gap-3 h-[36px]">
                <button
                  onClick={handleCandidatesDownloadCSV}
                  disabled={candidatesDownloading}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-black bg-white border border-black-24 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <CloudDownloadIcon className="w-4 h-4" />
                  {candidatesDownloading ? 'Downloading...' : 'Download CSV'}
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-4 px-4">
              This matrix grid shows candidates in development on your current page filter, with per-column filters beneath each header for narrowing the dataset. It provides candidate-level details such as name, R&D stage, developer, indication and additional attributes to support deeper portfolio analysis.
            </p>
            <DataTable
              tableId="candidates"
              graphqlTable="PORTFOLIO_CANDIDATES"
              filterContext={candidatesFilterContext}
              columns={candidateColumns}
              data={candidatesData}
              rowKey="candidate_key"
              page={candidatesPage}
              onPageChange={setCandidatesPage}
              totalCount={candidatesTotalCount}
              hasNextPage={candidatesHasNext}
              itemsPerPage={itemsPerPage}
              loading={candidatesLoading}
              filters={candidatesFilters}
              onFiltersChange={(next) => {
                setCandidatesFilters(next);
                setCandidatesPage(1);
              }}
              sort={candidatesSort}
              onSortChange={(next) => {
                setCandidatesSort(next);
                setCandidatesPage(1);
              }}
              visibleColumns={candidatesVisibleCols}
              onVisibleColumnsChange={setCandidatesVisibleCols}
              emptyState={
                Object.keys(candidatesFilters).length > 0
                  ? {
                      title: 'No candidates found',
                      description: 'No rows match the active filters. Clear them to see more.',
                    }
                  : { title: 'No candidates available' }
              }
            />
          </div>
        )}

        {/* Approved products */}
        {portfolioTab === 'approved' && (
          <>
            <p className="text-sm text-gray-500 my-4">
              This view includes summary charts showing approval status, approving authorities, and WHO prequalification, alongside a searchable table of approved products based on current filters. The table provides product‑level details such as name, indication, approval status, approving authorities, WHO prequalification status, and other key attributes.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
              {/* Approval status */}
              <div className="bg-white border border-gray-200 p-4 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-bold text-black">Approval status</h4>
                  <ChartMenu
                    onDownloadCSV={() => {
                      const columns = [
                        { label: 'Approval status', accessor: 'name' },
                        { label: 'Count', accessor: 'value' },
                      ];
                      const csv = buildCSV(columns, approvalStatusData);
                      downloadCSV(csv, 'approval-status');
                    }}
                    onDownloadPNG={() => downloadPNG(approvalStatusChartRef, 'approval-status')}
                  />
                </div>
                <div ref={approvalStatusChartRef} className="flex-1">
                  {regulatoryLoading ? (
                    <div className="h-[280px] flex items-center justify-center">
                      <div className="animate-pulse text-gray-400">Loading...</div>
                    </div>
                  ) : !approvalStatusData || approvalStatusData.length === 0 ? (
                    <ChartEmptyState variant="bar" height={280} />
                  ) : (
                    <div className="overflow-x-auto">
                      <div style={{ minWidth: Math.max(400, (approvalStatusData?.length || 0) * 120) }}>
                        <BarChart
                          data={approvalStatusData}
                          height={280}
                          maxTickChars={999}
                          xAxisLabel="Approval status"
                          yAxisLabel="Number of products"
                          visibleItems={approvalVisibleItems}
                          onVisibleItemsChange={handleApprovalVisibleItemsChange}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  This chart shows the total number of approved products by approval status. Each bar represents a specific approval status, enabling quick comparison across statuses.
                </p>
              </div>

              {/* Approving authorities */}
              <div className="bg-white border border-gray-200 p-4 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-bold text-black">Approving authorities</h4>
                  <ChartMenu
                    onDownloadCSV={() => {
                      const columns = [
                        { label: 'Authority type', accessor: (row) => row.category.replace(/\n/g, ' ') },
                        { label: 'WHO prequalified', accessor: 'who_prequalified' },
                        { label: 'No formal WHO listing', accessor: 'no_who_listing' },
                      ];
                      const csv = buildCSV(columns, approvingAuthoritiesData);
                      downloadCSV(csv, 'approving-authorities');
                    }}
                    onDownloadPNG={() => downloadPNG(approvingAuthoritiesChartRef, 'approving-authorities')}
                  />
                </div>
                <div ref={approvingAuthoritiesChartRef} className="flex-1">
                  {regulatoryLoading ? (
                    <div className="h-[200px] flex items-center justify-center">
                      <div className="animate-pulse text-gray-400">Loading...</div>
                    </div>
                  ) : !approvingAuthoritiesData || approvingAuthoritiesData.length === 0 ? (
                    <ChartEmptyState variant="stackedBar" height={200} />
                  ) : (
                    <div className="overflow-x-auto">
                      <div style={{ minWidth: Math.max(400, (approvingAuthoritiesData?.length || 0) * 140) }}>
                        <StackedBarChart
                          data={approvingAuthoritiesData}
                          phases={approvingAuthoritiesPhases}
                          categoryKey="category"
                          layout="horizontal"
                          height={280}
                          maxTickChars={999}
                          xAxisLabel="Authority type"
                          yAxisLabel="Number of products"
                          showFilters={true}
                          barRadius={0}
                          visiblePhases={authVisiblePhases}
                          onVisiblePhasesChange={handleAuthVisiblePhasesChange}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  The chart compares the number of approved products by approving authorities, and the quantum of products with WHO prequalification for each authority.
                </p>
              </div>

              {/* WHO prequalification */}
              <div className="bg-white border border-gray-200 p-4 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-bold text-black">WHO prequalification</h4>
                  <ChartMenu
                    onDownloadCSV={() => {
                      const columns = [
                        { label: 'WHO prequalification', accessor: 'name' },
                        { label: 'Count', accessor: 'value' },
                      ];
                      const csv = buildCSV(columns, whoPrequalData);
                      downloadCSV(csv, 'who-prequalification');
                    }}
                    onDownloadPNG={() => downloadPNG(whoPrequalChartRef, 'who-prequalification')}
                  />
                </div>
                <div ref={whoPrequalChartRef} className="flex-1">
                  {regulatoryLoading ? (
                    <div className="h-[180px] flex items-center justify-center">
                      <div className="animate-pulse text-gray-400">Loading...</div>
                    </div>
                  ) : (
                    <DonutChart
                      data={whoPrequalData}
                      colors={['#e3d6c1', '#fe7449', '#cbafde']}
                      height={180}
                      innerRadius={50}
                      outerRadius={80}
                      showLegend={true}
                      legendPosition="bottom"
                    />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  A comparison of approved products that have a WHO prequalification. The WHO prequalification is a 'gold standard' for products intended for use in low- and middle-income countries.
                </p>
              </div>
            </div>

            {/* Selected products section */}
            <div className="border border-gray-200">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <h4 className="text-xl font-bold text-black leading-none">Selected approved products</h4>
                  <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">{approvedTotalCount} products</span>
                </div>
                <div className="flex items-center gap-3 h-[36px]">
                  <button
                    onClick={handleApprovedDownloadCSV}
                    disabled={approvedDownloading}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-black bg-white border border-black-24 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    <CloudDownloadIcon className="w-4 h-4" />
                    {approvedDownloading ? 'Downloading...' : 'Download CSV'}
                  </button>
                </div>
              </div>

              <DataTable
                tableId="approved"
                graphqlTable="PORTFOLIO_CANDIDATES"
                filterContext={approvedFilterContext}
                columns={approvedColumns}
                data={approvedProductsData}
                rowKey="candidate_key"
                page={approvedPage}
                onPageChange={setApprovedPage}
                totalCount={approvedTotalCount}
                hasNextPage={approvedHasNext}
                itemsPerPage={itemsPerPage}
                loading={approvedLoading}
                filters={approvedFilters}
                onFiltersChange={(next) => {
                  setApprovedFilters(next);
                  setApprovedPage(1);
                }}
                sort={approvedSort}
                onSortChange={(next) => {
                  setApprovedSort(next);
                  setApprovedPage(1);
                }}
                visibleColumns={approvedVisibleCols}
                onVisibleColumnsChange={setApprovedVisibleCols}
                emptyState={
                  Object.keys(approvedFilters).length > 0
                    ? {
                        title: 'No approved products found',
                        description: 'No rows match the active filters. Clear them to see more.',
                      }
                    : { title: 'No approved products available' }
                }
              />
            </div>
          </>
        )}

        {/* Clinical trials */}
        {portfolioTab === 'trials' && (
          <>
            <p className="text-sm text-gray-500 my-4">
              This provides a high-level overview of studies through an age group chart and a clinical trial status chart, helping users quickly understand patient demographics and trial progression. A global map and detailed table complement these visuals by showing geographic distribution and key trial attributes for deeper exploration and comparison.
            </p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* Age groups */}
              <div className="bg-white border border-gray-200 p-4 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-bold text-black">Age groups in clinical trials</h4>
                  <ChartMenu
                    onDownloadCSV={() => {
                      const columns = [
                        { label: 'Age group', accessor: 'name' },
                        { label: 'Count', accessor: 'value' },
                      ];
                      const csv = buildCSV(columns, ageGroupsData);
                      downloadCSV(csv, 'age-groups-in-clinical-trials');
                    }}
                    onDownloadPNG={() => downloadPNG(ageGroupsChartRef, 'age-groups-in-clinical-trials')}
                  />
                </div>
                <div ref={ageGroupsChartRef} className="flex-1 border-t border-gray-100 pt-4">
                  {trialsLoading ? (
                    <div className="h-[280px] flex items-center justify-center">
                      <div className="animate-pulse text-gray-400">Loading...</div>
                    </div>
                  ) : !ageGroupsData || ageGroupsData.length === 0 ? (
                    <ChartEmptyState variant="donut" height={280} />
                  ) : (
                    <DonutChart
                      data={ageGroupsData}
                      colors={ageGroupColors}
                      height={280}
                      innerRadius={70}
                      outerRadius={120}
                      showLegend={true}
                      legendPosition="bottom"
                    />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Proportion of clinical trial participants in each age bracket, highlighting which age groups are most and least represented across the portfolio.
                </p>
              </div>

              {/* Trial status */}
              <div className="bg-white border border-gray-200 p-4 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-bold text-black">Clinical trial status</h4>
                  <ChartMenu
                    onDownloadCSV={() => {
                      const columns = [
                        { label: 'Trial status', accessor: 'name' },
                        { label: 'Count', accessor: 'value' },
                      ];
                      const csv = buildCSV(columns, trialStatusData);
                      downloadCSV(csv, 'clinical-trial-status');
                    }}
                    onDownloadPNG={() => downloadPNG(trialStatusChartRef, 'clinical-trial-status')}
                  />
                </div>
                <div ref={trialStatusChartRef} className="flex-1 border-t border-gray-100 pt-4">
                  {trialsLoading ? (
                    <div className="h-[340px] flex items-center justify-center">
                      <div className="animate-pulse text-gray-400">Loading...</div>
                    </div>
                  ) : !trialStatusData || trialStatusData.length === 0 ? (
                    <ChartEmptyState variant="bar" height={340} />
                  ) : (
                    <div className="overflow-x-auto">
                      <div style={{ minWidth: Math.max(400, (trialStatusData?.length || 0) * 120) }}>
                        <BarChart
                          data={trialStatusData}
                          height={340}
                          maxTickChars={999}
                          xAxisLabel="Trial status"
                          yAxisLabel="Number of trials"
                          visibleItems={trialStatusVisibleItems}
                          onVisibleItemsChange={handleTrialStatusVisibleItemsChange}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  The clinical trial status chart shows the number of studies at each stage, from ongoing to completed, providing a quick view of overall trial progress across the portfolio.
                </p>
              </div>
            </div>

            {/* Geographic distribution */}
            <div className="bg-white border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-lg font-bold text-black">Geographic distribution of clinical trials</h4>
                <div className="flex items-center gap-2">
                  <Dropdown
                    value={geoTrialStatus}
                    onChange={setGeoTrialStatus}
                    placeholder="All"
                    options={['Active', 'Completed', 'Terminated']}
                    multiSelect={true}
                    compact={true}
                    className="w-32"
                    variant="outlined"
                  />
                  <ChartMenu
                    onDownloadCSV={() => {
                      const columns = [
                        { label: 'Country', accessor: 'country_name' },
                        { label: 'ISO code', accessor: 'iso_code' },
                        { label: 'Count', accessor: 'candidateCount' },
                      ];
                      const csv = buildCSV(columns, clinicalTrialsDistribution);
                      downloadCSV(csv, 'geographic-distribution-clinical-trials');
                    }}
                    onDownloadPNG={() => downloadPNG(geoDistributionChartRef, 'geographic-distribution-clinical-trials')}
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                The global heat map shows the country-level distribution of clinical trials, with darker shades indicating countries with higher numbers of studies, and can be filtered by clinical trial status.
              </p>
              <div ref={geoDistributionChartRef}>
                {geoLoading ? (
                  <div className="h-[400px] flex items-center justify-center">
                    <div className="animate-pulse text-gray-400">Loading map...</div>
                  </div>
                ) : (
                  <WorldMap data={clinicalTrialsMapData} height={400} showLegend={false} />
                )}
              </div>
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
                    <button
                      onClick={handleTrialsDownloadCSV}
                      disabled={trialsDownloading}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-black bg-white border border-black-24 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      <CloudDownloadIcon className="w-4 h-4" />
                      {trialsDownloading ? 'Downloading...' : 'Download CSV'}
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  The clinical trial table is a matrix of individual studies, providing granular details such as title, clinical trial status, location, start date, URL and more. Use the per-column filters below each header to narrow results, then export the matching rows to .csv.
                </p>
              </div>

              <DataTable
                tableId="trials"
                graphqlTable="CLINICAL_TRIALS"
                filterContext={trialsFilterContext}
                columns={trialColumns}
                data={clinicalTrialsTableData}
                rowKey="trial_id"
                page={trialsPage}
                onPageChange={setTrialsPage}
                totalCount={trialsTotalCount}
                hasNextPage={trialsHasNextPage}
                itemsPerPage={trialsPerPage}
                loading={trialsListLoading}
                filters={trialsFilters}
                onFiltersChange={(next) => {
                  setTrialsFilters(next);
                  setTrialsPage(1);
                }}
                sort={trialsSort}
                onSortChange={(next) => {
                  setTrialsSort(next);
                  setTrialsPage(1);
                }}
                visibleColumns={trialsVisibleCols}
                onVisibleColumnsChange={setTrialsVisibleCols}
                emptyState={
                  Object.keys(trialsFilters).length > 0
                    ? {
                        title: 'No clinical trials found',
                        description: 'No rows match the active filters. Clear them to see more.',
                      }
                    : { title: 'No clinical trials available' }
                }
              />
            </div>
          </>
        )}

        {/* Technology types */}
        {portfolioTab === 'technology' && (
          <>
            {/* Product type cards + stacked bar chart */}
            <div className="border border-gray-200 p-4 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <h4 className="text-xl font-bold text-black leading-none">Product types and their technologies</h4>
                  <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">
                    {selectedProductCandidateTotal} candidates
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                This matrix grid shows the technology types for which candidates are being developed against the R&D stages. It provides an overview of the portfolio&apos;s progress for each technology type.
              </p>

              {/* Product type cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-6">
                {techProductTypeCards.map((pt) => {
                  const isSelected = selectedProductType === pt.name;
                  return (
                    <button
                      key={pt.name}
                      onClick={() => {
                        setSelectedProductType(pt.name);
                        setVcpSubProduct(null);
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
                        {pt.candidates}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Candidates</p>
                    </button>
                  );
                })}
              </div>

              {/* VCP sub-categories or stacked bar chart */}
              <div className="border-t border-gray-200 pt-4">
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
                          </div>
                          <div className="text-[32px] font-extrabold text-black leading-tight" style={{ fontFamily: 'var(--font-align), system-ui, sans-serif' }}>
                            {sub.candidates}
                          </div>
                          <div className="mt-auto pt-3">
                            <button
                              onClick={() => setVcpSubProduct(sub.name)}
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
                        <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">
                          {selectedProductCandidateTotal} candidates
                        </span>
                      )}
                      <div className="flex-1" />
                      {isVcpSelected && vcpSubProduct && (
                        <button
                          onClick={() => setVcpSubProduct(null)}
                          className="text-sm font-medium text-[#E76A42] hover:underline cursor-pointer"
                        >
                          Back to VCP
                        </button>
                      )}
                      <ChartMenu onDownloadPNG={() => downloadPNG(techChartRef, 'technology-types')} />
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                      This visualization shows how candidates have progressed through clinical phases toward market readiness for the selected product type.
                    </p>

                    <div ref={techChartRef}>
                      {(technologyLoading || technologyFilteredLoading || productDistLoading) ? (
                        <div className="h-[300px] flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading...</div></div>
                      ) : (
                        <StackedBarChart
                          data={techChartData}
                          phases={technologyPhases}
                          categoryKey="technology_type"
                          layout="vertical"
                          height={Math.max(300, (techChartData?.length || 3) * 36)}
                          xAxisLabel="Number of candidates and approved products"
                          showFilters={false}
                        />
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Technology types matrix table */}
            <div className="border border-gray-200">
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <h4 className="text-xl font-bold text-black leading-none">Technology types</h4>
                    <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">{technologyTableData.length} types</span>
                  </div>
                  <div className="flex items-center gap-3 h-[36px]">
                    <button
                      onClick={handleTechnologyDownloadCSV}
                      disabled={technologyDownloading}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-black bg-white border border-black-24 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                      <CloudDownloadIcon className="w-4 h-4" />
                      {technologyDownloading ? 'Downloading...' : 'Download CSV'}
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  The technology type table is a matrix showing each technology category by stage of development, including approved products. Use the per-column filters below each header to narrow results, then export the matching rows to .csv.
                </p>
              </div>

              <DataTable
                tableId="technology"
                serverSide={false}
                columns={[
                  {
                    header: 'Name',
                    accessor: 'technology_type',
                    filter: { kind: 'text' },
                    sortable: true,
                    hideable: false,
                  },
                  ...technologyPhases.map((phase) => ({
                    header: phase.label,
                    accessor: phase.key,
                    type: 'number',
                    filter: { kind: 'number' },
                    sortable: true,
                    hideable: true,
                    cellStyle: (value) => getHeatmapStyle(value),
                    render: (value) => (
                      <span className="tabular-nums text-center block">{value || 0}</span>
                    ),
                  })),
                  {
                    header: 'Total',
                    accessor: '_total',
                    type: 'number',
                    filter: { kind: 'number' },
                    sortable: true,
                    hideable: true,
                    render: (value) => (
                      <span className="tabular-nums text-center block font-semibold">{value || 0}</span>
                    ),
                  },
                ]}
                data={technologyRowsWithTotal}
                rowKey="technology_type"
                page={currentPage}
                onPageChange={setCurrentPage}
                itemsPerPage={techItemsPerPage}
                loading={technologyLoading}
                filters={technologyFilters}
                onFiltersChange={(next) => {
                  setTechnologyFilters(next);
                  setCurrentPage(1);
                }}
                sort={technologySort}
                onSortChange={(next) => {
                  setTechnologySort(next);
                  setCurrentPage(1);
                }}
                visibleColumns={technologyVisibleCols}
                onVisibleColumnsChange={setTechnologyVisibleCols}
                emptyState={
                  Object.keys(technologyFilters).length > 0
                    ? {
                        title: 'No technology types found',
                        description: 'No rows match the active filters. Clear them to see more.',
                      }
                    : { title: 'No technology types available' }
                }
              />
            </div>
          </>
        )}
      </div>
      {slideInOpen === 'candidate' && slideInKey != null && (
        <CandidateSlideIn candidateKey={slideInKey} onClose={closeSlideIn} />
      )}
      {slideInOpen === 'product' && slideInKey != null && (
        <ProductSlideIn candidateKey={slideInKey} onClose={closeSlideIn} />
      )}
      {slideInOpen === 'trial' && slideInKey != null && (
        <TrialSlideIn trialId={slideInKey} onClose={closeSlideIn} />
      )}
    </>
  );
}
