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

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useUrlState } from '@/lib/useUrlState';
import { arraySerializer, numberSerializer, stringSerializer } from '@/lib/url-serializers';
import Sidebar from '@/components/layout/Sidebar';
import { Dropdown, ServerTable } from '@/components/ui';
import DebouncedInput from '@/components/ui/DebouncedInput';
import {
  SearchIcon,
  InfoIcon,
  CloudDownloadIcon,
  ListFilterIcon,
  RefreshIcon,
} from '@/components/icons';
import HierarchicalDiseaseFilter from '@/components/filters/HierarchicalDiseaseFilter';
import {
  usePortfolioCandidates,
  useClinicalTrials,
  useRdPrioritiesWithCandidates,
  useRdPriorities,
  usePhases,
} from '@/graphql/hooks';
import { SIMPLIFIED_PHASE_NAMES } from '@/lib/transformations/constants';
import { fetchAllCandidates } from '@/lib/fetchAllCandidates';
import { fetchAllTrials } from '@/lib/fetchAllTrials';
import { fetchAllPrioritiesWithCandidates, fetchAllPriorities } from '@/lib/fetchAllPriorities';
import { buildCSV, downloadCSV } from '@/lib/csv';
import {
  EXTRACT_TAB_COLUMNS,
  EXTRACT_FIXED_COLUMNS,
  EXTRACT_ROW_KEY,
} from '@/lib/extractColumnConfig';
import {
  useGlobalFilters,
  PortfolioPageHeader,
} from '@/components/portfolio-analysis';

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
  } = useGlobalFilters();

  // =========================================================
  // URL-backed extract page state
  // =========================================================

  const [extractTab, setExtractTab] = useUrlState('extTab', 'candidates-approved', { ...stringSerializer, historyMode: 'push' });
  const [extractPageCandidates, setExtractPageCandidates] = useUrlState('extP1', 1, numberSerializer);
  const [extractPageRdPriorities, setExtractPageRdPriorities] = useUrlState('extP2', 1, numberSerializer);
  const [extractPageTrials, setExtractPageTrials] = useUrlState('extP3', 1, numberSerializer);
  const [extractPageRdOnly, setExtractPageRdOnly] = useUrlState('extP4', 1, numberSerializer);
  const [colsCandidates, setColsCandidates] = useUrlState('cols1', [], arraySerializer);
  const [colsRdPriorities, setColsRdPriorities] = useUrlState('cols2', [], arraySerializer);
  const [colsClinicalTrials, setColsClinicalTrials] = useUrlState('cols3', [], arraySerializer);
  const [colsRdOnly, setColsRdOnly] = useUrlState('cols4', [], arraySerializer);
  const [extractSearchQuery, setExtractSearchQuery] = useUrlState('extQ', '', { ...stringSerializer, debounceMs: 500 });
  const [extractRdStage, setExtractRdStage] = useUrlState('extRdStage', [], arraySerializer);

  // =========================================================
  // Local-only state (column picker + download flag)
  // =========================================================

  const [columnSearchQuery, setColumnSearchQuery] = useState('');
  const [extractDownloading, setExtractDownloading] = useState(false);
  const [pickerColumnsMap, setPickerColumnsMap] = useState(() => ({
    'candidates-approved': [...colsCandidates],
    'rd-priorities': [...colsRdPriorities],
    'clinical-trials': [...colsClinicalTrials],
    'rd-only': [...colsRdOnly],
  }));

  // Applied columns come straight from URL state — the single
  // source of truth driving the visible table.
  const appliedColumnsMap = {
    'candidates-approved': colsCandidates,
    'rd-priorities': colsRdPriorities,
    'clinical-trials': colsClinicalTrials,
    'rd-only': colsRdOnly,
  };
  const appliedColumns = appliedColumnsMap[extractTab] || [];

  // One-time hydration sync: the useState initializer runs during
  // SSR when URL state is empty. After hydration, copy URL cols
  // into picker state so the checkboxes reflect applied columns
  // on shared-URL load.
  const didInitPickerRef = useRef(false);
  useEffect(() => {
    if (didInitPickerRef.current) return;
    const hasUrlCols =
      colsCandidates.length > 0 ||
      colsRdPriorities.length > 0 ||
      colsClinicalTrials.length > 0 ||
      colsRdOnly.length > 0;
    if (hasUrlCols) {
      didInitPickerRef.current = true;
      setPickerColumnsMap({
        'candidates-approved': [...colsCandidates],
        'rd-priorities': [...colsRdPriorities],
        'clinical-trials': [...colsClinicalTrials],
        'rd-only': [...colsRdOnly],
      });
    }
  }, [colsCandidates, colsRdPriorities, colsClinicalTrials, colsRdOnly]);

  // =========================================================
  // Per-tab column picker + page state plumbing
  // =========================================================

  const selectedColumnsMap = {
    'candidates-approved': pickerColumnsMap['candidates-approved'],
    'rd-priorities': pickerColumnsMap['rd-priorities'],
    'clinical-trials': pickerColumnsMap['clinical-trials'],
    'rd-only': pickerColumnsMap['rd-only'],
  };
  const selectedColumns = selectedColumnsMap[extractTab] || [];
  const setSelectedColumns = (val) => {
    setPickerColumnsMap((prev) => ({
      ...prev,
      [extractTab]: typeof val === 'function' ? val(prev[extractTab] || []) : val,
    }));
  };

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
  const { phases } = usePhases();

  const effectiveExtractPhases = extractRdStage.length > 0
    ? extractRdStage
    : rdPhase.length > 0 ? rdPhase : undefined;

  const extractCandidatesFilter = {
    globalHealthAreas: healthArea.length > 0 ? healthArea : undefined,
    primaryDiseaseNames: primary.length > 0 ? primary : undefined,
    secondaryDiseaseNames: secondary.length > 0 ? secondary : undefined,
    productNames: expandedProduct.length > 0 ? expandedProduct : undefined,
    phaseNames: effectiveExtractPhases,
    search: extractSearchQuery || undefined,
  };

  // Priority and trial tabs share GHA + Disease filters but not
  // Product or R&D Stage (those fields don't exist on priorities).
  const extractPriorityFilter = {
    globalHealthAreas: healthArea.length > 0 ? healthArea : undefined,
    primaryDiseaseNames: primary.length > 0 ? primary : undefined,
    secondaryDiseaseNames: secondary.length > 0 ? secondary : undefined,
    search: extractSearchQuery || undefined,
  };

  const extractTrialFilter = {
    globalHealthAreas: healthArea.length > 0 ? healthArea : undefined,
    primaryDiseaseNames: primary.length > 0 ? primary : undefined,
    secondaryDiseaseNames: secondary.length > 0 ? secondary : undefined,
    productNames: expandedProduct.length > 0 ? expandedProduct : undefined,
  };

  // Only fire the hook for the active extract tab to prevent
  // cross-tab data bleed — inactive hooks would refetch with
  // stale offsets during tab switches, causing R&D priority rows
  // to briefly appear in other tabs' tables.
  const { candidates: extractCandidatesData, totalCount: extractCandidatesTotalCount, hasNextPage: extractCandidatesHasNext, loading: extractCandidatesLoading } = usePortfolioCandidates(
    extractCandidatesFilter, itemsPerPage, (extractPage - 1) * itemsPerPage,
    { skip: extractTab !== 'candidates-approved' },
  );
  const { priorities: extractRdPrioritiesData, totalCount: extractRdPrioritiesTotalCount, hasNextPage: extractRdPrioritiesHasNext, loading: extractRdPrioritiesLoading } = useRdPrioritiesWithCandidates(
    extractPriorityFilter, itemsPerPage, (extractPage - 1) * itemsPerPage,
    { skip: extractTab !== 'rd-priorities' },
  );
  const { trials: extractTrialsData, totalCount: extractTrialsTotalCount, hasNextPage: extractTrialsHasNext, loading: extractTrialsLoading } = useClinicalTrials(
    extractTrialFilter, itemsPerPage, (extractPage - 1) * itemsPerPage,
    { skip: extractTab !== 'clinical-trials' },
  );
  const { priorities: extractRdOnlyData, totalCount: extractRdOnlyTotalCount, hasNextPage: extractRdOnlyHasNext, loading: extractRdOnlyLoading } = useRdPriorities(
    extractPriorityFilter, itemsPerPage, (extractPage - 1) * itemsPerPage,
    { skip: extractTab !== 'rd-only' },
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

  const activeExtractColumns = appliedColumns
    .map((id) => availableColumns.find((col) => col.id === id))
    .filter(Boolean);

  // Build the picker column list respecting drag order: selected
  // columns in their reordered sequence first, then unselected
  // columns in original order, filtered by search.
  const filteredColumns = useMemo(() => {
    const search = columnSearchQuery.toLowerCase();
    const selected = selectedColumns
      .map((id) => availableColumns.find((col) => col.id === id))
      .filter(Boolean);
    const unselected = availableColumns.filter((col) => !selectedColumns.includes(col.id));
    return [...selected, ...unselected].filter((col) =>
      col.label.toLowerCase().includes(search),
    );
  }, [availableColumns, selectedColumns, columnSearchQuery]);

  // R&D stage options for the candidates-approved tab. Always
  // shows all phases (not narrowed by other selections) so that
  // an empty-state user can still pick a stage.
  const rdStageOptions = useMemo(
    () =>
      phases.map((p) => ({
        label: SIMPLIFIED_PHASE_NAMES[p.name] || p.name,
        value: p.name,
      })),
    [phases],
  );

  // =========================================================
  // Drag-and-drop reordering and picker handlers
  // =========================================================

  const draggedColumnRef = useRef(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const handleDragStart = (colId) => {
    draggedColumnRef.current = colId;
  };

  const handleDragOver = (e, colId) => {
    e.preventDefault();
    if (!draggedColumnRef.current || draggedColumnRef.current === colId) return;
    if (!selectedColumns.includes(draggedColumnRef.current) || !selectedColumns.includes(colId)) return;
    setDragOverColumn(colId);
    setSelectedColumns((prev) => {
      const draggedId = draggedColumnRef.current;
      const fromIndex = prev.indexOf(draggedId);
      const toIndex = prev.indexOf(colId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const next = [...prev];
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, draggedId);
      return next;
    });
  };

  const handleDragEnd = () => {
    draggedColumnRef.current = null;
    setDragOverColumn(null);
  };

  const handleSelectAllColumns = () => {
    setSelectedColumns((prev) => {
      const allIds = availableColumns.map((col) => col.id);
      const remaining = allIds.filter((id) => !prev.includes(id));
      return [...prev, ...remaining];
    });
  };

  const colsSetterByTab = {
    'candidates-approved': setColsCandidates,
    'rd-priorities': setColsRdPriorities,
    'clinical-trials': setColsClinicalTrials,
    'rd-only': setColsRdOnly,
  };

  const handleClearColumns = () => {
    setPickerColumnsMap((prev) => ({ ...prev, [extractTab]: [] }));
    const setter = colsSetterByTab[extractTab];
    if (setter) setter([]);
  };

  const handleApplyColumns = () => {
    const cols = pickerColumnsMap[extractTab] || [];
    const setter = colsSetterByTab[extractTab];
    if (setter) setter([...cols]);
    setExtractPage(1);
  };

  const handleToggleColumn = (colId) => {
    setSelectedColumns((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId],
    );
  };

  // Reset clears the filter values that the user can see on the
  // current sub-tab — plus the search input — and resets the
  // active sub-tab's page to 1. We deliberately leave `rdPhase`
  // alone: it's the global R&D phase URL key (only directly
  // editable from the Explore page), and clearing it here would
  // wipe a filter the user did not set from this page. Matches
  // legacy single-page behavior.
  const hasExtractFilters =
    healthArea.length > 0 ||
    primary.length > 0 ||
    secondary.length > 0 ||
    product.length > 0 ||
    extractRdStage.length > 0 ||
    extractSearchQuery.length > 0;

  const handleResetExtractFilters = () => {
    setHealthArea([]);
    setPrimary([]);
    setSecondary([]);
    setProduct([]);
    setExtractRdStage([]);
    setExtractSearchQuery('');
    setExtractPage(1);
  };

  // Fetch all filtered rows for the active extract tab and
  // download as CSV. Batches through the paginated API (max 100
  // per request) so the export includes every matching row, not
  // just the current page.
  const handleExtractDownloadCSV = useCallback(async () => {
    if (activeExtractColumns.length === 0) return;
    setExtractDownloading(true);
    try {
      let allRows;
      if (extractTab === 'candidates-approved') {
        allRows = await fetchAllCandidates(apolloClient, extractCandidatesFilter);
      } else if (extractTab === 'clinical-trials') {
        allRows = await fetchAllTrials(apolloClient, extractTrialFilter);
      } else if (extractTab === 'rd-priorities') {
        allRows = await fetchAllPrioritiesWithCandidates(apolloClient, extractPriorityFilter);
      } else {
        allRows = await fetchAllPriorities(apolloClient, extractPriorityFilter);
      }

      const fixedCol = EXTRACT_FIXED_COLUMNS[extractTab];
      const columns = [
        { label: fixedCol.label, accessor: fixedCol.accessor },
        ...activeExtractColumns.map((col) => ({
          label: col.label,
          accessor: col.csvAccessor || col.accessor || (() => ''),
        })),
      ];
      const csv = buildCSV(columns, allRows);
      downloadCSV(csv, `extract-${extractTab}`);
    } catch (err) {
      console.error('Extract CSV download failed:', err);
    } finally {
      setExtractDownloading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apolloClient, extractTab, appliedColumns, healthArea, primary, secondary, product, extractRdStage, extractSearchQuery]);

  return (
    <div className="flex h-[calc(100vh-74px)] bg-cream-200">
      <Sidebar />

      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Page header band */}
          <div className="flex flex-col gap-6 bg-white p-4 sm:p-6 lg:px-8 -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 mb-8 !pb-0">
            <PortfolioPageHeader
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
                  <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <DebouncedInput
                      type="text"
                      placeholder="Search item"
                      value={extractSearchQuery}
                      onChange={(e) => setExtractSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 text-sm bg-gray-100 border-none w-64 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <button
                    className={`flex items-center gap-2 px-4 py-2 text-sm border transition-colors ${
                      selectedColumns.length > 0 && !extractDownloading
                        ? 'text-black bg-white border-black-24 hover:bg-gray-50'
                        : 'text-gray-400 bg-white border-gray-200 cursor-not-allowed'
                    }`}
                    disabled={selectedColumns.length === 0 || extractDownloading}
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

            {/* Two-column layout: column picker (left) + table (right) */}
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
                  {filteredColumns.map((col) => {
                    const isSelected = selectedColumns.includes(col.id);
                    const isDragging = draggedColumnRef.current === col.id;
                    const isDragOver = dragOverColumn === col.id;
                    return (
                      <div
                        key={col.id}
                        draggable={isSelected}
                        onDragStart={() => handleDragStart(col.id)}
                        onDragOver={(e) => handleDragOver(e, col.id)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center justify-between py-2 px-2 hover:bg-gray-50 cursor-pointer select-none ${
                          isDragging ? 'opacity-40' : ''
                        } ${isDragOver && isSelected ? 'border-t-2 border-orange-400' : ''}`}
                        onClick={() => handleToggleColumn(col.id)}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-4 h-4 border rounded flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'border-orange-500 bg-orange-500'
                                : 'border-gray-300 bg-white'
                            }`}
                          >
                            {isSelected && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          <span className="text-sm text-gray-700">{col.label}</span>
                        </div>
                        <ListFilterIcon
                          className={`w-4 h-4 ${isSelected ? 'text-gray-400 cursor-grab' : 'text-gray-200'}`}
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3 mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleApplyColumns}
                    disabled={selectedColumns.length === 0}
                    className={`flex-1 px-4 py-2.5 text-sm font-medium border-none ${
                      selectedColumns.length > 0
                        ? 'bg-orange-500 text-black hover:bg-black hover:text-white cursor-pointer transition-colors'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Apply
                  </button>
                  <button
                    onClick={handleClearColumns}
                    disabled={selectedColumns.length === 0}
                    className={`flex-1 px-4 py-2.5 text-sm font-medium border-none ${
                      selectedColumns.length > 0
                        ? 'bg-gray-200 text-[#262626] hover:bg-gray-300 cursor-pointer'
                        : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    }`}
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Right: data table or empty state */}
              <div className="flex-1 min-w-0">
                {appliedColumns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                      <InfoIcon className="w-6 h-6 text-orange-500" />
                    </div>
                    <h4 className="text-lg font-bold text-black mb-2">
                      {selectedColumns.length > 0 ? 'Click "Apply" to load table' : 'No columns selected'}
                    </h4>
                    <p className="text-sm text-gray-500 text-center max-w-xs">
                      {selectedColumns.length > 0
                        ? 'Select your columns and click Apply to generate the table'
                        : "Select table columns you'd like to include in the overview"}
                    </p>
                  </div>
                ) : (
                  <ServerTable
                    key={extractTab}
                    columns={[
                      {
                        header: EXTRACT_FIXED_COLUMNS[extractTab].label,
                        accessor: typeof EXTRACT_FIXED_COLUMNS[extractTab].accessor === 'string'
                          ? EXTRACT_FIXED_COLUMNS[extractTab].accessor
                          : '_fixed',
                        render: (value, row) => {
                          const fixedCol = EXTRACT_FIXED_COLUMNS[extractTab];
                          const fixedValue = typeof fixedCol.accessor === 'function' ? fixedCol.accessor(row) : value;
                          return (
                            <div className="text-sm font-medium text-black max-w-[300px]">{fixedValue}</div>
                          );
                        },
                      },
                      ...activeExtractColumns.map((col) => ({
                        header: col.label,
                        accessor: col.accessor || col.id,
                        ...(col.render && { render: col.render }),
                        ...(col.type && { type: col.type, maxWidth: col.maxWidth || '250px' }),
                      })),
                    ]}
                    data={extractTableData}
                    rowKey={EXTRACT_ROW_KEY[extractTab]}
                    currentPage={extractPage}
                    onPageChange={setExtractPage}
                    totalCount={extractTotalCount}
                    hasNextPage={extractHasNext}
                    itemsPerPage={itemsPerPage}
                    fitContent
                    loading={extractLoading}
                    emptyState={extractSearchQuery ? {
                      title: 'No results found',
                      description: `Your search "${extractSearchQuery}" did not match any results. Please try again or clear the search.`,
                      onClear: () => { setExtractSearchQuery(''); setExtractPage(1); },
                    } : { title: 'No results available' }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
