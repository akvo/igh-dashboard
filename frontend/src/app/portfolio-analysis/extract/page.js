'use client';

// =========================================================
// Extract custom details page
// =========================================================
//
// Lifted from the legacy single-page Extract tab. Renders a
// four-up sub-tab navigation (Candidates & approved products,
// R&D priorities & candidates, Clinical trials & candidates,
// R&D priorities), a column picker, a server-paginated table,
// and a CSV export. Filters live inline inside the table card —
// the visible set varies per sub-tab (see the conditional
// dropdowns below). The shared filter URL keys (gha, primary,
// secondary, product) are still owned by useGlobalFilters so a
// user navigating between Portfolio Analysis sibling pages keeps
// their filter selections; the sidebar's sibling-aware query
// forwarding does the carry-over for free.

import { useState, useMemo, useCallback, useEffect } from 'react';
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
import Sidebar from '@/components/layout/Sidebar';
import { Dropdown, DataTable } from '@/components/ui';
import {
  CloudDownloadIcon,
  RefreshIcon,
} from '@/components/icons';
import HierarchicalDiseaseFilter from '@/components/filters/HierarchicalDiseaseFilter';
import {
  usePortfolioCandidates,
  useClinicalTrials,
  useRdPrioritiesWithCandidates,
  useRdPriorities,
} from '@/graphql/hooks';
import { fetchAllCandidates } from '@/lib/fetchAllCandidates';
import { fetchAllTrials } from '@/lib/fetchAllTrials';
import { fetchAllPrioritiesWithCandidates, fetchAllPriorities } from '@/lib/fetchAllPriorities';
import { buildCSV, downloadCSV } from '@/lib/csv';
import {
  EXTRACT_TAB_COLUMNS,
  EXTRACT_ROW_KEY,
} from '@/lib/extractColumnConfig';
import { useGlobalFilters } from '@/components/portfolio-analysis';
import PageHeader from '@/components/layout/PageHeader';

export default function ExtractCustomDetailsPage() {
  const {
    healthArea,
    primary,
    secondary,
    product,
    rdPhase,
    expandedProduct,
    setHealthArea,
    setPrimary,
    setSecondary,
    setProduct,
    healthAreaOptions,
    narrowedHierarchy,
    productOptions,
    rdPhaseOptions,
  } = useGlobalFilters();

  // =========================================================
  // URL-backed extract page state
  // =========================================================

  const [extractTab, setExtractTab] = useUrlState('extTab', 'candidates-approved', { ...stringSerializer, historyMode: 'push' });
  const [extractPageCandidates, setExtractPageCandidates] = useUrlState('extP1', 1, numberSerializer);
  const [extractPageRdPriorities, setExtractPageRdPriorities] = useUrlState('extP2', 1, numberSerializer);
  const [extractPageTrials, setExtractPageTrials] = useUrlState('extP3', 1, numberSerializer);
  const [extractPageRdOnly, setExtractPageRdOnly] = useUrlState('extP4', 1, numberSerializer);
  // Visible-columns URL state, one slot per sub-tab. Default `[]`,
  // not a seeded identifier column: `arraySerializer.serialize([])`
  // returns `null` so the URL key is elided, and useUrlState
  // re-applies the default on the next read. With `[]` the
  // DataTable falls back to all non-`defaultHidden` columns
  // (DataTable.jsx:80-88), which is what the user sees on first
  // load — no empty state, no manual column-pick required.
  const [colsCandidates, setColsCandidates] = useUrlState('cols1', [], arraySerializer);
  const [colsRdPriorities, setColsRdPriorities] = useUrlState('cols2', [], arraySerializer);
  const [colsClinicalTrials, setColsClinicalTrials] = useUrlState('cols3', [], arraySerializer);
  const [colsRdOnly, setColsRdOnly] = useUrlState('cols4', [], arraySerializer);
  const [extractRdStage, setExtractRdStage] = useUrlState('extRdStage', [], arraySerializer);

  // Per-sub-tab DataTable filter / sort URL state. Each filter
  // serializer hydrates against its own EXTRACT_TAB_COLUMNS slice so
  // TEXT vs CATEGORY is recovered correctly on URL load.
  const sortSerializer = useMemo(
    () => ({ serialize: encodeSort, deserialize: decodeSort }),
    [],
  );
  const makeFilterSerializer = useCallback(
    (tabKey) => ({
      serialize: encodeFilters,
      deserialize: (s) =>
        hydrateFiltersFromUrl(decodeFilters(s), EXTRACT_TAB_COLUMNS[tabKey] || []),
      debounceMs: 500,
    }),
    [],
  );
  const ext1FilterSerializer = useMemo(
    () => makeFilterSerializer('candidates-approved'),
    [makeFilterSerializer],
  );
  const ext2FilterSerializer = useMemo(
    () => makeFilterSerializer('rd-priorities'),
    [makeFilterSerializer],
  );
  const ext3FilterSerializer = useMemo(
    () => makeFilterSerializer('clinical-trials'),
    [makeFilterSerializer],
  );
  const ext4FilterSerializer = useMemo(
    () => makeFilterSerializer('rd-only'),
    [makeFilterSerializer],
  );
  const [ext1Filters, setExt1Filters] = useUrlState('f.ext1', {}, ext1FilterSerializer);
  const [ext2Filters, setExt2Filters] = useUrlState('f.ext2', {}, ext2FilterSerializer);
  const [ext3Filters, setExt3Filters] = useUrlState('f.ext3', {}, ext3FilterSerializer);
  const [ext4Filters, setExt4Filters] = useUrlState('f.ext4', {}, ext4FilterSerializer);
  const [ext1Sort, setExt1Sort] = useUrlState('s.ext1', null, sortSerializer);
  const [ext2Sort, setExt2Sort] = useUrlState('s.ext2', null, sortSerializer);
  const [ext3Sort, setExt3Sort] = useUrlState('s.ext3', null, sortSerializer);
  const [ext4Sort, setExt4Sort] = useUrlState('s.ext4', null, sortSerializer);

  // =========================================================
  // Local-only state (download flag)
  // =========================================================

  const [extractDownloading, setExtractDownloading] = useState(false);

  // Applied columns come straight from URL state — the single source
  // of truth driving the visible table. DataTable's column popover
  // mutates these via `onVisibleColumnsChange`, which the wrapper
  // round-trips through the accessor↔id translation in
  // `handleVisibleColumnsChange`. An empty array is treated as
  // "default view" (all non-`defaultHidden` columns) by both the
  // on-screen table and the CSV export.
  const appliedColumnsMap = {
    'candidates-approved': colsCandidates,
    'rd-priorities': colsRdPriorities,
    'clinical-trials': colsClinicalTrials,
    'rd-only': colsRdOnly,
  };
  const appliedColumns = appliedColumnsMap[extractTab] || [];
  const colsSetterByTab = {
    'candidates-approved': setColsCandidates,
    'rd-priorities': setColsRdPriorities,
    'clinical-trials': setColsClinicalTrials,
    'rd-only': setColsRdOnly,
  };
  const setActiveCols = colsSetterByTab[extractTab] || (() => {});

  const extractPageMap = {
    'candidates-approved': extractPageCandidates,
    'rd-priorities': extractPageRdPriorities,
    'clinical-trials': extractPageTrials,
    'rd-only': extractPageRdOnly,
  };
  const setExtractPageMap = {
    'candidates-approved': setExtractPageCandidates,
    'rd-priorities': setExtractPageRdPriorities,
    'clinical-trials': setExtractPageTrials,
    'rd-only': setExtractPageRdOnly,
  };
  const extractPage = extractPageMap[extractTab] || 1;
  const setExtractPage = setExtractPageMap[extractTab] || (() => {});

  const availableColumns = EXTRACT_TAB_COLUMNS[extractTab] || [];

  // =========================================================
  // Per-tab filtering and data fetching
  // =========================================================
  //
  // The extract-specific R&D Stage dropdown narrows further within
  // the global phase selection: if the user picked a stage here,
  // it overrides; otherwise the global rdPhase wins.

  const itemsPerPage = 10;
  const apolloClient = useApolloClient();

  const effectiveExtractPhases = extractRdStage.length > 0
    ? extractRdStage
    : rdPhase.length > 0 ? rdPhase : undefined;

  // Per-sub-tab column-filters (UI → GraphQL) + sort.
  const ext1ColumnFilters = useMemo(() => toColumnFilters(ext1Filters), [ext1Filters]);
  const ext2ColumnFilters = useMemo(() => toColumnFilters(ext2Filters), [ext2Filters]);
  const ext3ColumnFilters = useMemo(() => toColumnFilters(ext3Filters), [ext3Filters]);
  const ext4ColumnFilters = useMemo(() => toColumnFilters(ext4Filters), [ext4Filters]);
  const ext1SortVar = useMemo(() => toColumnSort(ext1Sort), [ext1Sort]);
  const ext2SortVar = useMemo(() => toColumnSort(ext2Sort), [ext2Sort]);
  const ext3SortVar = useMemo(() => toColumnSort(ext3Sort), [ext3Sort]);
  const ext4SortVar = useMemo(() => toColumnSort(ext4Sort), [ext4Sort]);

  const extractCandidatesFilter = {
    globalHealthAreas: healthArea.length > 0 ? healthArea : undefined,
    primaryDiseaseNames: primary.length > 0 ? primary : undefined,
    secondaryDiseaseNames: secondary.length > 0 ? secondary : undefined,
    productNames: expandedProduct.length > 0 ? expandedProduct : undefined,
    phaseNames: effectiveExtractPhases,
    columnFilters: ext1ColumnFilters,
  };

  // Priority and trial tabs share GHA + Disease filters but not
  // Product or R&D Stage (those fields don't exist on priorities).
  const extractPriorityFilter = {
    globalHealthAreas: healthArea.length > 0 ? healthArea : undefined,
    primaryDiseaseNames: primary.length > 0 ? primary : undefined,
    secondaryDiseaseNames: secondary.length > 0 ? secondary : undefined,
  };

  const extractTrialFilter = {
    globalHealthAreas: healthArea.length > 0 ? healthArea : undefined,
    primaryDiseaseNames: primary.length > 0 ? primary : undefined,
    secondaryDiseaseNames: secondary.length > 0 ? secondary : undefined,
    productNames: expandedProduct.length > 0 ? expandedProduct : undefined,
    columnFilters: ext3ColumnFilters,
  };

  // Per-sub-tab `ColumnFilterContext` for DataTable's CategoryFilter
  // dropdowns (drives the `distinctValues` GraphQL resolver). Snake-case
  // to match the GraphQL input shape, with empty arrays omitted.
  const ext1FilterContext = useMemo(
    () => ({
      global_health_areas: healthArea?.length > 0 ? healthArea : undefined,
      primary_disease_names: primary?.length > 0 ? primary : undefined,
      secondary_disease_names: secondary?.length > 0 ? secondary : undefined,
      product_names: expandedProduct?.length > 0 ? expandedProduct : undefined,
      phase_names: effectiveExtractPhases,
      column_filters: ext1ColumnFilters,
    }),
    [healthArea, primary, secondary, expandedProduct, effectiveExtractPhases, ext1ColumnFilters],
  );
  const ext2FilterContext = useMemo(
    () => ({
      global_health_areas: healthArea?.length > 0 ? healthArea : undefined,
      primary_disease_names: primary?.length > 0 ? primary : undefined,
      secondary_disease_names: secondary?.length > 0 ? secondary : undefined,
      column_filters: ext2ColumnFilters,
    }),
    [healthArea, primary, secondary, ext2ColumnFilters],
  );
  const ext3FilterContext = useMemo(
    () => ({
      global_health_areas: healthArea?.length > 0 ? healthArea : undefined,
      primary_disease_names: primary?.length > 0 ? primary : undefined,
      secondary_disease_names: secondary?.length > 0 ? secondary : undefined,
      product_names: expandedProduct?.length > 0 ? expandedProduct : undefined,
      column_filters: ext3ColumnFilters,
    }),
    [healthArea, primary, secondary, expandedProduct, ext3ColumnFilters],
  );
  const ext4FilterContext = useMemo(
    () => ({
      global_health_areas: healthArea?.length > 0 ? healthArea : undefined,
      primary_disease_names: primary?.length > 0 ? primary : undefined,
      secondary_disease_names: secondary?.length > 0 ? secondary : undefined,
      column_filters: ext4ColumnFilters,
    }),
    [healthArea, primary, secondary, ext4ColumnFilters],
  );

  // Only fire the hook for the active extract tab to prevent
  // cross-tab data bleed — inactive hooks would refetch with
  // stale offsets during tab switches, causing R&D priority rows
  // to briefly appear in other tabs' tables.
  const { candidates: extractCandidatesData, totalCount: extractCandidatesTotalCount, hasNextPage: extractCandidatesHasNext, loading: extractCandidatesLoading } = usePortfolioCandidates(
    extractCandidatesFilter, itemsPerPage, (extractPage - 1) * itemsPerPage,
    { skip: extractTab !== 'candidates-approved', sort: ext1SortVar },
  );
  const { priorities: extractRdPrioritiesData, totalCount: extractRdPrioritiesTotalCount, hasNextPage: extractRdPrioritiesHasNext, loading: extractRdPrioritiesLoading } = useRdPrioritiesWithCandidates(
    { ...extractPriorityFilter, columnFilters: ext2ColumnFilters }, itemsPerPage, (extractPage - 1) * itemsPerPage,
    { skip: extractTab !== 'rd-priorities', sort: ext2SortVar },
  );
  const { trials: extractTrialsData, totalCount: extractTrialsTotalCount, hasNextPage: extractTrialsHasNext, loading: extractTrialsLoading } = useClinicalTrials(
    extractTrialFilter, itemsPerPage, (extractPage - 1) * itemsPerPage,
    { skip: extractTab !== 'clinical-trials', sort: ext3SortVar },
  );
  const { priorities: extractRdOnlyData, totalCount: extractRdOnlyTotalCount, hasNextPage: extractRdOnlyHasNext, loading: extractRdOnlyLoading } = useRdPriorities(
    { ...extractPriorityFilter, columnFilters: ext4ColumnFilters }, itemsPerPage, (extractPage - 1) * itemsPerPage,
    { skip: extractTab !== 'rd-only', sort: ext4SortVar },
  );

  const extractDataMap = {
    'candidates-approved': { data: extractCandidatesData, totalCount: extractCandidatesTotalCount, hasNextPage: extractCandidatesHasNext, loading: extractCandidatesLoading },
    'rd-priorities': { data: extractRdPrioritiesData, totalCount: extractRdPrioritiesTotalCount, hasNextPage: extractRdPrioritiesHasNext, loading: extractRdPrioritiesLoading },
    'clinical-trials': { data: extractTrialsData, totalCount: extractTrialsTotalCount, hasNextPage: extractTrialsHasNext, loading: extractTrialsLoading },
    'rd-only': { data: extractRdOnlyData, totalCount: extractRdOnlyTotalCount, hasNextPage: extractRdOnlyHasNext, loading: extractRdOnlyLoading },
  };
  const activeExtractData = extractDataMap[extractTab] || extractDataMap['candidates-approved'];
  const extractTableData = activeExtractData.data;
  const extractTotalCount = activeExtractData.totalCount;
  const extractHasNext = activeExtractData.hasNextPage;
  const extractLoading = activeExtractData.loading;

  // Mirror DataTable.jsx:80-88: an empty `appliedColumns` means the
  // user is on the default view, which DataTable renders as every
  // non-`defaultHidden` column in config order. The CSV needs the same
  // fallback so a default-view download exports what's on screen, not
  // an empty table. No column in EXTRACT_TAB_COLUMNS sets
  // `defaultHidden` today, so the filter is a no-op in practice — kept
  // so that adding a `defaultHidden: true` to the column config later
  // also hides the column from the default CSV without further wiring.
  const activeExtractColumns = appliedColumns.length === 0
    ? availableColumns.filter((c) => !c.defaultHidden)
    : appliedColumns
        .map((id) => availableColumns.find((col) => col.id === id))
        .filter(Boolean);

  // R&D stage options for the candidates-approved tab. Uses the
  // cross-filtered rdPhaseOptions so that only phases reachable
  // under the current product / disease / GHA selections appear.
  const rdStageOptions = rdPhaseOptions;

  // Prune stale extractRdStage selections when cross-filtering
  // removes a previously valid phase (mirrors the global rdPhase
  // pruning in useCrossFilteredOptions).
  useEffect(() => {
    if (extractRdStage.length === 0 || rdStageOptions.length === 0) return;
    const validValues = new Set(rdStageOptions.map((o) => o.value));
    const valid = extractRdStage.filter((v) => validValues.has(v));
    if (valid.length !== extractRdStage.length) setExtractRdStage(valid);
  }, [rdStageOptions, extractRdStage, setExtractRdStage]);

  // Reset clears the filter values the user can see on the
  // current sub-tab — the global GHA / disease / product
  // dropdowns plus the in-page R&D-stage dropdown — and resets the
  // active sub-tab's page to 1. We deliberately leave `rdPhase`
  // alone: it's the global R&D phase URL key (only directly
  // editable from the Explore page), and clearing it here would
  // wipe a filter the user did not set from this page. Per-column
  // filters live in `f.ext1`-`f.ext4` and are cleared via the
  // table's own "Clear all filters" link, not this button.
  const hasExtractFilters =
    healthArea.length > 0 ||
    primary.length > 0 ||
    secondary.length > 0 ||
    product.length > 0 ||
    extractRdStage.length > 0;

  const handleResetExtractFilters = () => {
    setHealthArea([]);
    setPrimary([]);
    setSecondary([]);
    setProduct([]);
    setExtractRdStage([]);
    setExtractPage(1);
  };

  // Fetch all filtered rows for the active extract tab and
  // download as CSV. Batches through the paginated API (max 100
  // per request) so the export includes every matching row, not
  // just the current page.
  const handleExtractDownloadCSV = useCallback(async () => {
    setExtractDownloading(true);
    try {
      let allRows;
      if (extractTab === 'candidates-approved') {
        allRows = await fetchAllCandidates(apolloClient, extractCandidatesFilter);
      } else if (extractTab === 'clinical-trials') {
        allRows = await fetchAllTrials(apolloClient, extractTrialFilter);
      } else if (extractTab === 'rd-priorities') {
        allRows = await fetchAllPrioritiesWithCandidates(apolloClient, {
          ...extractPriorityFilter,
          columnFilters: ext2ColumnFilters,
        });
      } else {
        allRows = await fetchAllPriorities(apolloClient, {
          ...extractPriorityFilter,
          columnFilters: ext4ColumnFilters,
        });
      }

      const columns = activeExtractColumns.map((col) => ({
        label: col.label,
        accessor: col.csvAccessor || col.accessor || (() => ''),
      }));
      const csv = buildCSV(columns, allRows);
      downloadCSV(csv, `extract-${extractTab}`);
    } catch (err) {
      console.error('Extract CSV download failed:', err);
    } finally {
      setExtractDownloading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apolloClient, extractTab, appliedColumns, healthArea, primary, secondary, product, extractRdStage, ext1ColumnFilters, ext2ColumnFilters, ext3ColumnFilters, ext4ColumnFilters]);

  return (
    <div className="flex h-[calc(100vh-74px)] bg-cream-200">
      <Sidebar />

      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Page header band */}
          <div className="flex flex-col gap-6 bg-white p-4 sm:p-6 lg:px-8 -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 mb-8 !pb-0">
            <PageHeader
              title="Portfolio analysis"
              description="Explore the global R&D pipeline for each global health area, disease, or product type through two lenses. Use the Extract custom details tab to build a tailored portfolio across candidate & approved products, R&D priorities, and clinical trials, then export the data as a CSV file for further analysis and reporting. Switch to the Explore visual insights view to analyse portfolio trends through interactive charts and maps."
            />

            {/* Sub-tabs row */}
            <div className="flex gap-6 border-b border-gray-200">
              {[
                { value: 'candidates-approved', label: 'Candidates & approved products' },
                { value: 'rd-priorities', label: 'R&D priorities & candidates' },
                { value: 'clinical-trials', label: 'Clinical trials & candidates' },
                { value: 'rd-only', label: 'R&D priorities' },
              ].map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setExtractTab(tab.value)}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                    extractTab === tab.value
                      ? 'text-[#262626] border-[#262626]'
                      : 'text-gray-400 border-transparent hover:text-gray-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main content card */}
          <div className="bg-white border border-gray-200">
            {/* Header row */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-xl font-bold text-black mb-1">
                    {extractTab === 'candidates-approved' && 'Candidates & approved products'}
                    {extractTab === 'rd-priorities' && 'R&D priorities & candidates'}
                    {extractTab === 'clinical-trials' && 'Clinical trials & candidates'}
                    {extractTab === 'rd-only' && 'R&D priorities'}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">The custom table builder enables selection and display of specific columns, filtering by global health area, disease, product type, and R&amp;D stage, and column sorting to support quick exploration and comparison of the most relevant data.</p>
                  <div style={{ borderBottom: '1px solid #26262617' }} />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    className={`flex items-center gap-2 px-4 py-2 text-sm border transition-colors ${
                      extractDownloading
                        ? 'text-gray-400 bg-white border-gray-200 cursor-not-allowed'
                        : 'text-black bg-white border-black-24 hover:bg-gray-50'
                    }`}
                    disabled={extractDownloading}
                    onClick={handleExtractDownloadCSV}
                  >
                    <CloudDownloadIcon className="w-4 h-4" />
                    {extractDownloading ? 'Downloading...' : 'Download CSV'}
                  </button>
                </div>
              </div>
            </div>

            {/* Per-sub-tab inline filter row.
                GHA + Disease are always visible; Product type
                appears for the candidates and clinical-trials
                sub-tabs; R&D stage only on candidates-approved.
                Each onChange resets the active sub-tab's page to
                1 — matches legacy behavior. */}
            <div className="sticky top-0 z-20 bg-white px-4 py-4 border-b border-gray-200">
              <div className="flex flex-wrap items-end gap-4">
                <div className="min-w-[180px]">
                  <Dropdown
                    label="Global health area"
                    value={healthArea}
                    onChange={(v) => { setHealthArea(v); setExtractPage(1); }}
                    placeholder="All"
                    options={healthAreaOptions}
                    multiSelect={true}
                    compact={true}
                    variant="outlined"
                  />
                </div>
                <div className="min-w-[180px]">
                  <HierarchicalDiseaseFilter
                    label="Disease"
                    hierarchy={narrowedHierarchy}
                    primarySelected={primary}
                    secondarySelected={secondary}
                    onChange={({ primarySelected, secondarySelected }) => {
                      setPrimary(primarySelected);
                      setSecondary(secondarySelected);
                      setExtractPage(1);
                    }}
                    placeholder="All"
                    compact={true}
                    variant="outlined"
                  />
                </div>
                {(extractTab === 'candidates-approved' || extractTab === 'clinical-trials') && (
                  <div className="min-w-[180px]">
                    <Dropdown
                      label="Product type"
                      value={product}
                      onChange={(v) => { setProduct(v); setExtractPage(1); }}
                      placeholder="All"
                      options={productOptions}
                      multiSelect={true}
                      showAllOption={true}
                      compact={true}
                      variant="outlined"
                    />
                  </div>
                )}
                {extractTab === 'candidates-approved' && (
                  <div className="min-w-[180px]">
                    <Dropdown
                      label="R&D stage"
                      value={extractRdStage}
                      onChange={(v) => { setExtractRdStage(v); setExtractPage(1); }}
                      placeholder="All"
                      options={rdStageOptions}
                      multiSelect={true}
                      showAllOption={true}
                      compact={true}
                      variant="outlined"
                    />
                  </div>
                )}
                <div className="flex-1" />
                <button
                  onClick={handleResetExtractFilters}
                  disabled={!hasExtractFilters}
                  className={`flex items-center gap-2 text-sm px-4 h-[36px] whitespace-nowrap border ${
                    hasExtractFilters
                      ? 'text-[#262626] bg-gray-200 border-gray-300 hover:bg-gray-300 cursor-pointer font-medium'
                      : 'text-gray-400 bg-transparent border-gray-200 cursor-not-allowed'
                  }`}
                >
                  Reset filters
                  <RefreshIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            <ExtractDataTable
              key={extractTab}
              extractTab={extractTab}
              activeExtractColumns={activeExtractColumns}
              availableColumns={availableColumns}
              setActiveCols={setActiveCols}
              extractTableData={extractTableData}
              extractTotalCount={extractTotalCount}
              extractHasNext={extractHasNext}
              extractLoading={extractLoading}
              extractPage={extractPage}
              setExtractPage={setExtractPage}
              itemsPerPage={itemsPerPage}
              filtersByTab={{
                'candidates-approved': ext1Filters,
                'rd-priorities': ext2Filters,
                'clinical-trials': ext3Filters,
                'rd-only': ext4Filters,
              }}
              setFiltersByTab={{
                'candidates-approved': setExt1Filters,
                'rd-priorities': setExt2Filters,
                'clinical-trials': setExt3Filters,
                'rd-only': setExt4Filters,
              }}
              sortByTab={{
                'candidates-approved': ext1Sort,
                'rd-priorities': ext2Sort,
                'clinical-trials': ext3Sort,
                'rd-only': ext4Sort,
              }}
              setSortByTab={{
                'candidates-approved': setExt1Sort,
                'rd-priorities': setExt2Sort,
                'clinical-trials': setExt3Sort,
                'rd-only': setExt4Sort,
              }}
              filterContextByTab={{
                'candidates-approved': ext1FilterContext,
                'rd-priorities': ext2FilterContext,
                'clinical-trials': ext3FilterContext,
                'rd-only': ext4FilterContext,
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

// =========================================================
// ExtractDataTable — per-sub-tab DataTable wrapper
// =========================================================
//
// The Extract page renders one logical DataTable whose `tableId`,
// `graphqlTable`, columns, data, filters, sort, and filter context
// switch with the active sub-tab. Lifting that into its own
// component keeps the main page render readable and lets us
// `key={extractTab}` it so internal state (column widths, popover
// open state) doesn't leak between sub-tabs.
//
// `hideable: false` on the first column of each tab (Name / Title /
// Candidate name) marks it as a frozen-and-locked column: DataTable's
// positional freeze keeps the first entry in `visibleColumns` sticky,
// and `ColumnsPopover` renders its visibility checkbox disabled so
// the user can't accidentally hide it. The same `hideable: false`
// blocks the column-header kebab's Hide-column option.
const SUB_TAB_GRAPHQL = {
  'candidates-approved': 'PORTFOLIO_CANDIDATES',
  'rd-priorities': 'RD_PRIORITIES_WITH_CANDIDATES',
  'clinical-trials': 'CLINICAL_TRIALS',
  'rd-only': 'RD_PRIORITIES',
};

const SUB_TAB_TABLE_ID = {
  'candidates-approved': 'ext1',
  'rd-priorities': 'ext2',
  'clinical-trials': 'ext3',
  'rd-only': 'ext4',
};

function ExtractDataTable({
  extractTab,
  activeExtractColumns,
  availableColumns,
  setActiveCols,
  extractTableData,
  extractTotalCount,
  extractHasNext,
  extractLoading,
  extractPage,
  setExtractPage,
  itemsPerPage,
  filtersByTab,
  setFiltersByTab,
  sortByTab,
  setSortByTab,
  filterContextByTab,
}) {
  const filters = filtersByTab[extractTab] ?? {};
  const setFilters = setFiltersByTab[extractTab] ?? (() => {});
  const sort = sortByTab[extractTab] ?? null;
  const setSort = setSortByTab[extractTab] ?? (() => {});
  const filterContext = filterContextByTab[extractTab] ?? {};

  // The first column of each tab is `hideable: false` (configured in
  // EXTRACT_TAB_COLUMNS), which DataTable's positional-freeze + the
  // popover's locked-checkbox combination treats as the sticky
  // always-on column. No synthetic prefix column needed.
  const columns = activeExtractColumns.map((col) => ({
    header: col.label,
    accessor: col.accessor || col.id,
    ...(col.render && { render: col.render }),
    ...(col.type && { type: col.type, maxWidth: col.maxWidth || '250px' }),
    ...(col.filter && { filter: col.filter }),
    sortable: col.sortable !== false,
    hideable: col.hideable !== false,
  }));

  const visibleColumns = activeExtractColumns.map((c) => c.accessor || c.id);

  // DataTable's column popover (and the header kebab's "Hide column")
  // fire onVisibleColumnsChange with an accessor list. Translate the
  // surviving accessors back to id-space and persist to URL state via
  // the per-sub-tab cols setter, so the `cols1`–`cols4` URL contract
  // stays in id-space.
  const handleVisibleColumnsChange = (nextAccessors) => {
    const accessorToId = new Map(availableColumns.map((c) => [c.accessor, c.id]));
    const nextIds = nextAccessors
      .map((a) => accessorToId.get(a))
      .filter(Boolean);
    setActiveCols(nextIds);
  };

  return (
    <DataTable
      tableId={SUB_TAB_TABLE_ID[extractTab]}
      graphqlTable={SUB_TAB_GRAPHQL[extractTab]}
      filterContext={filterContext}
      columns={columns}
      data={extractTableData}
      rowKey={EXTRACT_ROW_KEY[extractTab]}
      page={extractPage}
      onPageChange={setExtractPage}
      totalCount={extractTotalCount}
      hasNextPage={extractHasNext}
      itemsPerPage={itemsPerPage}
      loading={extractLoading}
      filters={filters}
      onFiltersChange={(next) => {
        setFilters(next);
        setExtractPage(1);
      }}
      sort={sort}
      onSortChange={(next) => {
        setSort(next);
        setExtractPage(1);
      }}
      visibleColumns={visibleColumns}
      onVisibleColumnsChange={handleVisibleColumnsChange}
      emptyState={
        Object.keys(filters).length > 0
          ? {
              title: 'No results found',
              description: 'No rows match the active filters. Clear them to see more.',
            }
          : { title: 'No results available' }
      }
    />
  );
}
