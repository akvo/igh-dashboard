'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useUrlState } from '@/lib/useUrlState';
import { arraySerializer, numberSerializer, stringSerializer } from '@/lib/url-serializers';
import Sidebar from '@/components/layout/Sidebar';
import { StatCard, Dropdown, TabSwitcher, ChartMenu, ServerTable } from '@/components/ui';
import DebouncedInput from '@/components/ui/DebouncedInput';
import { UploadIcon, RefreshIcon, DownloadIcon, InfoIcon, SearchIcon, MoreHorizontalIcon, CloudDownloadIcon, BoltIcon, ListIcon, ChartIcon, ListFilterIcon } from '@/components/icons';
import { StackedBarChart, DonutChart, BarChart, WorldMap, ChartEmptyState } from '@/components/charts';
import { usePortfolioKPIs, useGlobalHealthAreaSummaries, useProducts, useDiseases, usePhases, useProductPhaseDistribution, useProductDistribution, useRegulatoryDistribution, useClinicalTrialStats, useClinicalTrials, usePortfolioCandidates, useGeographicDistribution, useTechnologyTypeDistribution, useRdPrioritiesWithCandidates, useRdPriorities, usePipelineFilterPairs } from '@/graphql/hooks';
import { SIMPLIFIED_PHASE_NAMES, PHASE_COLORS } from '@/lib/transformations/constants';
import { buildCSV, downloadCSV } from '@/lib/csv';
import { downloadPNG } from '@/lib/png';
import {
  expandDiseaseSelection,
  consolidateProductOptionsByName,
  expandProductNameSelection,
  mergeVectorControlChartData,
  mergeVectorControlStackedData,
} from '@/lib/filterGroups';
import { useCrossFilteredOptions } from '@/lib/useCrossFilteredOptions';
import { fetchAllCandidates } from '@/lib/fetchAllCandidates';
import { fetchAllTrials } from '@/lib/fetchAllTrials';
import { fetchAllPrioritiesWithCandidates, fetchAllPriorities } from '@/lib/fetchAllPriorities';
import { EXTRACT_TAB_COLUMNS, EXTRACT_FIXED_COLUMNS, EXTRACT_ROW_KEY } from '@/lib/extractColumnConfig';
import { CANDIDATE_COLUMNS, APPROVED_PRODUCT_COLUMNS, CLINICAL_TRIAL_COLUMNS, toCSVColumns } from '@/lib/exploreColumnConfig';
import { createHeatmapScale } from '@/lib/heatmap';

// Clamped cell text with native tooltip for full text on hover
function CellText({ children }) {
  const text = typeof children === 'string' ? children : (children ?? '');
  return <div className="cell-clamp" title={text}>{children}</div>;
}

export default function PortfolioAnalysis() {
  const [activeTab, setActiveTab] = useUrlState('tab', 'explore', { ...stringSerializer, historyMode: 'push' });
  const [healthArea, setHealthArea] = useUrlState('gha', [], arraySerializer);
  const [disease, setDisease] = useUrlState('disease', [], arraySerializer);
  const [product, setProduct] = useUrlState('product', [], arraySerializer);
  const [productTypeFilter, setProductTypeFilter] = useUrlState('productType', [], arraySerializer);
  const [geoTrialStatus, setGeoTrialStatus] = useUrlState('trialStatus', [], arraySerializer);
  const [portfolioTab, setPortfolioTab] = useUrlState('view', 'candidates', { ...stringSerializer, historyMode: 'push' });
  const [searchQuery, setSearchQuery] = useUrlState('q', '', { ...stringSerializer, debounceMs: 500 });
  const [approvedSearchQuery, setApprovedSearchQuery] = useUrlState('aq', '', { ...stringSerializer, debounceMs: 500 });
  const [trialsSearchQuery, setTrialsSearchQuery] = useUrlState('tq', '', { ...stringSerializer, debounceMs: 500 });
  const [technologySearchQuery, setTechnologySearchQuery] = useUrlState('techQ', '', { ...stringSerializer, debounceMs: 500 });
  const [currentPage, setCurrentPage] = useUrlState('techPage', 1, numberSerializer);
  const [trialsPage, setTrialsPage] = useUrlState('tPage', 1, numberSerializer);
  const [candidatesPage, setCandidatesPage] = useUrlState('cPage', 1, numberSerializer);
  const [approvedPage, setApprovedPage] = useUrlState('aPage', 1, numberSerializer);
  const [extractPageCandidates, setExtractPageCandidates] = useUrlState('extP1', 1, numberSerializer);
  const [extractPageRdPriorities, setExtractPageRdPriorities] = useUrlState('extP2', 1, numberSerializer);
  const [extractPageTrials, setExtractPageTrials] = useUrlState('extP3', 1, numberSerializer);
  const [extractPageRdOnly, setExtractPageRdOnly] = useUrlState('extP4', 1, numberSerializer);
  const [extractTab, setExtractTab] = useUrlState('extTab', 'candidates-approved', { ...stringSerializer, historyMode: 'push' });
  const [colsCandidates, setColsCandidates] = useUrlState('cols1', [], arraySerializer);
  const [colsRdPriorities, setColsRdPriorities] = useUrlState('cols2', [], arraySerializer);
  const [colsClinicalTrials, setColsClinicalTrials] = useUrlState('cols3', [], arraySerializer);
  const [colsRdOnly, setColsRdOnly] = useUrlState('cols4', [], arraySerializer);
  const [columnSearchQuery, setColumnSearchQuery] = useState('');

  // Picker state — local only, not URL-persisted.
  // Initialized from URL cols so the picker reflects applied columns on load.
  const [pickerColumnsMap, setPickerColumnsMap] = useState(() => ({
    'candidates-approved': [...colsCandidates],
    'rd-priorities': [...colsRdPriorities],
    'clinical-trials': [...colsClinicalTrials],
    'rd-only': [...colsRdOnly],
  }));

  // Applied columns come straight from URL state — the single source of truth.
  const appliedColumnsMap = {
    'candidates-approved': colsCandidates,
    'rd-priorities': colsRdPriorities,
    'clinical-trials': colsClinicalTrials,
    'rd-only': colsRdOnly,
  };
  const appliedColumns = appliedColumnsMap[extractTab] || [];

  // One-time hydration sync: the useState initializer runs during SSR when
  // URL state is empty. After hydration, copy URL cols into picker state
  // so the checkboxes reflect applied columns on shared-URL load.
  const didInitPickerRef = useRef(false);

  // Skip the first search-triggered page reset — during hydration the
  // search queries transition from '' to their URL value, which would
  // otherwise wipe out the page param from the shared URL.
  const didHydrateSearchRef = useRef(false);
  useEffect(() => {
    if (didInitPickerRef.current) return;
    const hasUrlCols = colsCandidates.length > 0 || colsRdPriorities.length > 0
      || colsClinicalTrials.length > 0 || colsRdOnly.length > 0;
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

  const [extractSort, setExtractSort] = useState({ colId: null, direction: null }); // direction: 'asc' | 'desc' | null
  const [extractColumnFilters, setExtractColumnFilters] = useState({});
  const [extractSearchQuery, setExtractSearchQuery] = useUrlState('extQ', '', { ...stringSerializer, debounceMs: 500 });
  const [extractRdStage, setExtractRdStage] = useUrlState('extRdStage', [], arraySerializer);
  const [extractDownloading, setExtractDownloading] = useState(false);
  const [candidatesDownloading, setCandidatesDownloading] = useState(false);
  const [approvedDownloading, setApprovedDownloading] = useState(false);
  const [trialsDownloading, setTrialsDownloading] = useState(false);
  const [technologyDownloading, setTechnologyDownloading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  // Hidden phase/item keys for charts with filters (empty = all visible).
  const [pipelineHiddenPhases, setPipelineHiddenPhases] = useUrlState('phide', [], arraySerializer);
  const [authHiddenPhases, setAuthHiddenPhases] = useUrlState('ahide', [], arraySerializer);
  const [approvalHiddenItems, setApprovalHiddenItems] = useUrlState('apphide', [], arraySerializer);
  const [trialStatusHiddenItems, setTrialStatusHiddenItems] = useUrlState('tshide', [], arraySerializer);

  const apolloClient = useApolloClient();

  // Fetch data from API
  // Expand composite filter selections for API calls
  const expandedDisease = expandDiseaseSelection(disease);
  const expandedProduct = expandProductNameSelection(product);

  const { kpis, loading: kpisLoading } = usePortfolioKPIs(healthArea, expandedDisease, expandedProduct);
  const { bubbleData: healthAreas, loading: healthAreasLoading } = useGlobalHealthAreaSummaries();
  const { products: productsList, loading: productsLoading } = useProducts();
  const { diseases: diseasesList, raw: diseasesRaw, loading: diseasesLoading } = useDiseases();
  const { pairs, loading: pairsLoading } = usePipelineFilterPairs();
  const { phases, loading: phasesLoading } = usePhases();
  const { chartData: rawPipelineData, phases: pipelinePhases, loading: pipelineLoading } = useProductPhaseDistribution(healthArea, expandedDisease, expandedProduct);
  const pipelineData = useMemo(() => mergeVectorControlStackedData(rawPipelineData), [rawPipelineData]);
  const candidateTypeForApi = productTypeFilter.length === 1 ? productTypeFilter[0] : undefined;
  const { chartData: rawProductTypesData, loading: productTypesLoading } = useProductDistribution(healthArea, expandedDisease, expandedProduct, candidateTypeForApi);
  const productTypesData = useMemo(() => mergeVectorControlChartData(rawProductTypesData), [rawProductTypesData]);
  const { approvalStatus: approvalStatusData, whoPrequalification: whoPrequalData, approvingAuthorities: approvingAuthoritiesData, loading: regulatoryLoading } = useRegulatoryDistribution(healthArea, expandedDisease, expandedProduct);

  const approvingAuthoritiesPhases = [
    { key: 'who_prequalified', label: 'WHO prequalified', color: '#fe7449' },
    { key: 'no_who_listing', label: 'No formal WHO listing', color: '#f9a78d' },
  ];
  const { totalTrials: ongoingTrials, statusDistribution: trialStatusData, ageGroupDistribution: ageGroupsData, loading: trialsLoading } = useClinicalTrialStats(healthArea, expandedDisease, expandedProduct);
  const itemsPerPage = 10;
  const globalFilter = { globalHealthAreas: healthArea, diseaseNames: expandedDisease, productNames: expandedProduct };
  const { candidates: candidatesData, totalCount: candidatesTotalCount, hasNextPage: candidatesHasNext, loading: candidatesLoading } = usePortfolioCandidates(
    { ...globalFilter, candidateType: 'Candidate', search: searchQuery || undefined }, itemsPerPage, (candidatesPage - 1) * itemsPerPage,
  );
  const { candidates: approvedProductsData, totalCount: approvedTotalCount, hasNextPage: approvedHasNext, loading: approvedLoading } = usePortfolioCandidates(
    { ...globalFilter, candidateType: 'Product', search: approvedSearchQuery || undefined }, itemsPerPage, (approvedPage - 1) * itemsPerPage,
  );
  // =========================================================
  // Per-tab column selection (delegates to active tab's state)
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

  // =========================================================
  // Per-tab page state (each tab keeps its own page position)
  // =========================================================
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
  // Per-tab extract filters and data fetching
  // =========================================================

  // Extract tab reuses the global filter selections (healthArea / expandedDisease / expandedProduct)
  // so that switching between Explore and Extract tabs shares the same filters.
  const extractCandidatesFilter = {
    globalHealthAreas: healthArea.length > 0 ? healthArea : undefined,
    diseaseNames: expandedDisease.length > 0 ? expandedDisease : undefined,
    productNames: expandedProduct.length > 0 ? expandedProduct : undefined,
    phaseNames: extractRdStage.length > 0 ? extractRdStage : undefined,
    search: extractSearchQuery || undefined,
  };

  // Priority and trial tabs share GHA + Disease filters but not
  // Product or R&D Stage (those fields don't exist on priorities).
  const extractPriorityFilter = {
    globalHealthAreas: healthArea.length > 0 ? healthArea : undefined,
    diseaseNames: expandedDisease.length > 0 ? expandedDisease : undefined,
    search: extractSearchQuery || undefined,
  };

  const extractTrialFilter = {
    globalHealthAreas: healthArea.length > 0 ? healthArea : undefined,
    diseaseNames: expandedDisease.length > 0 ? expandedDisease : undefined,
    productNames: expandedProduct.length > 0 ? expandedProduct : undefined,
  };

  // Only fire the hook for the active extract tab to prevent cross-tab data
  // bleed — inactive hooks would refetch with stale offsets during tab switches,
  // causing R&D priority rows to briefly appear in other tabs' tables.
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

  // Unified view of the active extract tab's data
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
  const trialsPerPage = 10;
  const { trials: clinicalTrialsTableData, totalCount: trialsTotalCount, hasNextPage: trialsHasNextPage, loading: trialsListLoading } = useClinicalTrials(
    { globalHealthAreas: healthArea, diseaseNames: expandedDisease, productNames: expandedProduct, statuses: geoTrialStatus, search: trialsSearchQuery || undefined },
    trialsPerPage,
    (trialsPage - 1) * trialsPerPage,
  );
  const { mapData: clinicalTrialsMapData, distributionList: clinicalTrialsDistribution, loading: geoLoading } = useGeographicDistribution('Trial Location', geoTrialStatus, healthArea, expandedDisease, expandedProduct);
  const { tableData: technologyTableData, phases: technologyPhases, totalCount: technologyTotalCount, loading: technologyLoading } = useTechnologyTypeDistribution(healthArea, expandedDisease, expandedProduct);

  // Convert hidden-phase arrays to { key: boolean } maps for StackedBarChart.
  const pipelineVisiblePhases = useMemo(() =>
    pipelinePhases.reduce((acc, p) => ({ ...acc, [p.key]: !pipelineHiddenPhases.includes(p.key) }), {}),
    [pipelinePhases, pipelineHiddenPhases]
  );
  const authVisiblePhases = useMemo(() =>
    approvingAuthoritiesPhases.reduce((acc, p) => ({ ...acc, [p.key]: !authHiddenPhases.includes(p.key) }), {}),
    [approvingAuthoritiesPhases, authHiddenPhases]
  );
  const handlePipelineVisiblePhasesChange = useCallback((next) => {
    setPipelineHiddenPhases(Object.keys(next).filter(k => !next[k]));
  }, [setPipelineHiddenPhases]);
  const handleAuthVisiblePhasesChange = useCallback((next) => {
    setAuthHiddenPhases(Object.keys(next).filter(k => !next[k]));
  }, [setAuthHiddenPhases]);
  // BarChart visibility maps (keyed by item name).
  const approvalVisibleItems = useMemo(() =>
    (approvalStatusData || []).reduce((acc, d) => ({ ...acc, [d.name]: !approvalHiddenItems.includes(d.name) }), {}),
    [approvalStatusData, approvalHiddenItems]
  );
  const trialStatusVisibleItems = useMemo(() =>
    (trialStatusData || []).reduce((acc, d) => ({ ...acc, [d.name]: !trialStatusHiddenItems.includes(d.name) }), {}),
    [trialStatusData, trialStatusHiddenItems]
  );
  const handleApprovalVisibleItemsChange = useCallback((next) => {
    setApprovalHiddenItems(Object.keys(next).filter(k => !next[k]));
  }, [setApprovalHiddenItems]);
  const handleTrialStatusVisibleItemsChange = useCallback((next) => {
    setTrialStatusHiddenItems(Object.keys(next).filter(k => !next[k]));
  }, [setTrialStatusHiddenItems]);

  // All product options from API (before cross-filtering), with VC consolidation
  const allProductOptions = useMemo(() => {
    const names = (productsList || []).map(p => p.product_name);
    return consolidateProductOptionsByName(names);
  }, [productsList]);

  const crossFilterData = { healthAreas, diseasesRaw, pairs, allProductOptions };
  const crossFilterLoading = { healthAreas: healthAreasLoading, diseases: diseasesLoading, products: productsLoading, pairs: pairsLoading };

  // Explore tab cross-filtered options
  const { healthAreaOptions, diseaseOptions, productOptions } = useCrossFilteredOptions({
    data: crossFilterData,
    selections: { healthArea, disease, product },
    setters: { setHealthArea, setDisease, setProduct },
    loading: crossFilterLoading,
  });



  // Reset trials pagination when search query changes.
  useEffect(() => {
    if (!didHydrateSearchRef.current) return;
    setTrialsPage(1);
  }, [trialsSearchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset technology pagination when search query changes.
  useEffect(() => {
    if (!didHydrateSearchRef.current) return;
    setCurrentPage(1);
  }, [technologySearchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const timer = setTimeout(() => { didHydrateSearchRef.current = true; }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleClearFilters = () => {
    // Global GHA / Disease / Product filters
    setHealthArea([]);
    setDisease([]);
    setProduct([]);
    // Chart-level filters
    setProductTypeFilter([]);
    setGeoTrialStatus([]);
    // Chart visibility toggles
    setPipelineHiddenPhases([]);
    setAuthHiddenPhases([]);
    setApprovalHiddenItems([]);
    setTrialStatusHiddenItems([]);
    // Extract-specific filters
    setExtractRdStage([]);
    // Search queries across all sub-tabs
    setSearchQuery('');
    setApprovedSearchQuery('');
    setTrialsSearchQuery('');
    setTechnologySearchQuery('');
    setExtractSearchQuery('');
  };

  const hasFilters =
    healthArea.length > 0 || disease.length > 0 || product.length > 0 ||
    productTypeFilter.length > 0 || geoTrialStatus.length > 0 ||
    pipelineHiddenPhases.length > 0 || authHiddenPhases.length > 0 ||
    approvalHiddenItems.length > 0 || trialStatusHiddenItems.length > 0 ||
    extractRdStage.length > 0 ||
    searchQuery.length > 0 || approvedSearchQuery.length > 0 ||
    trialsSearchQuery.length > 0 || technologySearchQuery.length > 0 ||
    extractSearchQuery.length > 0;

  // Get KPI values
  const activeCandidates = kpis?.find(k => k.id === 'candidates')?.value || 0;
  const approvedProducts = kpis?.find(k => k.id === 'approved')?.value || 0;


  // Donut chart colors — brand chart palette (from design system)
  const productTypeColors = [
    '#F0B456', '#CBAFDE', '#B08888', '#E3D6C1',
    '#F9A78D', '#CC9949', '#6AB085', '#54A5C4',
    '#B28FC9', '#FFDCD1',
  ];



  // Dark-text phase colors (lighter backgrounds)
  const LIGHT_BG_PHASES = new Set(['#F9A78D', '#CBAFDE', '#F0B456', '#E3D6C1', '#BFAB8A', '#bbbbbb']);

  const getRdStageStyle = (stage) => {
    const color = PHASE_COLORS[stage];
    if (!color) return { backgroundColor: '#f3f4f6', color: '#4b5563' };
    const textColor = LIGHT_BG_PHASES.has(color) ? '#262626' : '#ffffff';
    return { backgroundColor: color, color: textColor };
  };



  const ageGroupColors = ['#f9a78d', '#54a5c4', '#fe7449', '#ddd6fe', '#f0b456', '#a78bfa'];


  // Columns currently active in the table — only updates when "Apply" is clicked
  const activeExtractColumns = appliedColumns.map((id) => availableColumns.find((col) => col.id === id)).filter(Boolean);

  // Build the column list respecting drag order: selected columns in their reordered
  // sequence first, then unselected columns in original order, filtered by search.
  const filteredColumns = useMemo(() => {
    const search = columnSearchQuery.toLowerCase();
    const selected = selectedColumns
      .map((id) => availableColumns.find((col) => col.id === id))
      .filter(Boolean);
    const unselected = availableColumns.filter((col) => !selectedColumns.includes(col.id));
    return [...selected, ...unselected].filter((col) =>
      col.label.toLowerCase().includes(search)
    );
  }, [availableColumns, selectedColumns, columnSearchQuery]);

  // Refs for PNG download capture targets
  const productTypesChartRef = useRef(null);
  const approvalStatusChartRef = useRef(null);
  const approvingAuthoritiesChartRef = useRef(null);
  const whoPrequalChartRef = useRef(null);
  const ageGroupsChartRef = useRef(null);
  const trialStatusChartRef = useRef(null);
  const geoDistributionChartRef = useRef(null);
  const globalPipelineChartRef = useRef(null);

  const [exportingPNG, setExportingPNG] = useState(false);

  const handleExportPNG = async () => {
    setExportingPNG(true);
    try {
      await downloadPNG(globalPipelineChartRef, 'global-pipeline-overview');
    } finally {
      setExportingPNG(false);
    }
  };

  // Drag-and-drop reordering state
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
    // Preserve existing order for already-selected columns; append unselected ones at the end
    setSelectedColumns((prev) => {
      const allIds = availableColumns.map((col) => col.id);
      const remaining = allIds.filter((id) => !prev.includes(id));
      return [...prev, ...remaining];
    });
  };

  const handleClearColumns = () => {
    setPickerColumnsMap((prev) => ({ ...prev, [extractTab]: [] }));
    const setter = {
      'candidates-approved': setColsCandidates,
      'rd-priorities': setColsRdPriorities,
      'clinical-trials': setColsClinicalTrials,
      'rd-only': setColsRdOnly,
    }[extractTab];
    if (setter) setter([]);
    setExtractSort({ colId: null, direction: null });
    setExtractColumnFilters({});
  };

  const handleApplyColumns = () => {
    const cols = pickerColumnsMap[extractTab] || [];
    // Push to URL state (this IS the applied state now)
    const setter = {
      'candidates-approved': setColsCandidates,
      'rd-priorities': setColsRdPriorities,
      'clinical-trials': setColsClinicalTrials,
      'rd-only': setColsRdOnly,
    }[extractTab];
    if (setter) setter([...cols]);
    setExtractSort({ colId: null, direction: null });
    setExtractColumnFilters({});
    setExtractPage(1);
  };

  const handleToggleColumn = (colId) => {
    setSelectedColumns((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId]
    );
  };

  // Sort toggle: null → asc → desc → null
  const handleExtractSort = (colId) => {
    setExtractSort((prev) => {
      if (prev.colId !== colId) return { colId, direction: 'asc' };
      if (prev.direction === 'asc') return { colId, direction: 'desc' };
      return { colId: null, direction: null };
    });
  };

  const handleExtractColumnFilter = (colId, value) => {
    setExtractColumnFilters((prev) => ({ ...prev, [colId]: value }));
  };

  // Client-side sort & filter on the current page data
  const processedExtractData = useMemo(() => {
    let data = [...(extractTableData || [])];

    // Apply column filters
    const filterEntries = Object.entries(extractColumnFilters).filter(([, v]) => v.trim());
    if (filterEntries.length > 0) {
      data = data.filter((row) =>
        filterEntries.every(([colId, filterVal]) => {
          const col = availableColumns.find((c) => c.id === colId);
          if (!col) return true;
          const cellVal = colId === 'name'
            ? (row.candidate_name || row.alternative_names || '')
            : (row[col.accessor] || '');
          return String(cellVal).toLowerCase().includes(filterVal.toLowerCase());
        })
      );
    }

    // Apply sort
    if (extractSort.colId && extractSort.direction) {
      const col = extractSort.colId === 'name'
        ? null
        : availableColumns.find((c) => c.id === extractSort.colId);
      data.sort((a, b) => {
        const aVal = extractSort.colId === 'name'
          ? (a.candidate_name || a.alternative_names || '')
          : (a[col?.accessor] || '');
        const bVal = extractSort.colId === 'name'
          ? (b.candidate_name || b.alternative_names || '')
          : (b[col?.accessor] || '');
        const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true, sensitivity: 'base' });
        return extractSort.direction === 'asc' ? cmp : -cmp;
      });
    }

    return data;
  }, [extractTableData, extractColumnFilters, extractSort, availableColumns]);

  const hasExtractFilters = healthArea.length > 0 || disease.length > 0 || product.length > 0 || extractRdStage.length > 0 || extractSearchQuery.length > 0;

  const handleResetExtractFilters = () => {
    setHealthArea([]);
    setDisease([]);
    setProduct([]);
    setExtractRdStage([]);
    setExtractSearchQuery('');
    setExtractPage(1);
  };

  // Download all filtered candidates from the "Selected candidates" tab as CSV.
  // Batches through the paginated API so the export includes every matching
  // row, not just the current page of 10.
  const handleCandidatesDownloadCSV = useCallback(async () => {
    setCandidatesDownloading(true);
    try {
      const allRows = await fetchAllCandidates(apolloClient, {
        ...globalFilter,
        candidateType: 'Candidate',
        search: searchQuery || undefined,
      });
      const csv = buildCSV(toCSVColumns(CANDIDATE_COLUMNS), allRows);
      downloadCSV(csv, 'selected-candidates');
    } catch (err) {
      console.error('Candidates CSV download failed:', err);
    } finally {
      setCandidatesDownloading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apolloClient, healthArea, disease, product, searchQuery]);

  // Download all approved products from the "Selected products" tab as CSV.
  const handleApprovedDownloadCSV = useCallback(async () => {
    setApprovedDownloading(true);
    try {
      const allRows = await fetchAllCandidates(apolloClient, {
        ...globalFilter,
        candidateType: 'Product',
      });
      const csv = buildCSV(toCSVColumns(APPROVED_PRODUCT_COLUMNS), allRows);
      downloadCSV(csv, 'selected-products');
    } catch (err) {
      console.error('Approved products CSV download failed:', err);
    } finally {
      setApprovedDownloading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apolloClient, healthArea, disease, product]);

  // Download all clinical trials from the "Selected clinical trials" tab as CSV.
  const handleTrialsDownloadCSV = useCallback(async () => {
    setTrialsDownloading(true);
    try {
      const allRows = await fetchAllTrials(apolloClient, {
        globalHealthAreas: healthArea,
        diseaseNames: expandedDisease,
        productNames: expandedProduct,
        statuses: geoTrialStatus,
      });
      const csv = buildCSV(toCSVColumns(CLINICAL_TRIAL_COLUMNS), allRows);
      downloadCSV(csv, 'selected-clinical-trials');
    } catch (err) {
      console.error('Clinical trials CSV download failed:', err);
    } finally {
      setTrialsDownloading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apolloClient, healthArea, disease, product, geoTrialStatus]);

  // Download technology types table as CSV. All rows are already loaded
  // client-side so no async fetching is needed — we just build from
  // `technologyTableData` with its dynamic phase columns.
  const handleTechnologyDownloadCSV = useCallback(() => {
    setTechnologyDownloading(true);
    try {
      const columns = [
        { label: 'Name', accessor: 'technology_type' },
        ...technologyPhases.map((phase) => ({
          label: phase.label,
          accessor: phase.key,
        })),
      ];
      const csv = buildCSV(columns, technologyTableData);
      downloadCSV(csv, 'technology-types');
    } catch (err) {
      console.error('Technology types CSV download failed:', err);
    } finally {
      setTechnologyDownloading(false);
    }
  }, [technologyTableData, technologyPhases]);

  // Fetch all filtered rows for the active extract tab and download as CSV.
  // Batches through the paginated API (max 100 per request) so the
  // export includes every matching row, not just the current page.
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
  }, [apolloClient, extractTab, appliedColumns, healthArea, disease, product, extractRdStage, extractSearchQuery]);

  // R&D stage options from DB phases
  const rdStageOptions = useMemo(() =>
    phases.map(p => ({
      label: SIMPLIFIED_PHASE_NAMES[p.name] || p.name,
      value: p.name,
    })),
    [phases]
  );


  // Client-side filtering for technology types (backend doesn't support search)
  const filteredTechData = useMemo(() => {
    if (!technologySearchQuery.trim()) return technologyTableData;
    const q = technologySearchQuery.toLowerCase();
    return technologyTableData.filter((item) =>
      item.technology_type && item.technology_type.toLowerCase().includes(q)
    );
  }, [technologyTableData, technologySearchQuery]);

  // Heatmap scale for technology types table.  Computed from the full
  // dataset (not the current page) so colours stay stable across pages.
  const phaseAccessors = technologyPhases.map((p) => p.key);
  const getHeatmapStyle = useMemo(
    () => createHeatmapScale(technologyTableData, phaseAccessors),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [technologyTableData, technologyPhases],
  );

  // Client-side pagination for technology types table
  const techItemsPerPage = 10;
  const techTotalPages = Math.ceil(filteredTechData.length / techItemsPerPage);
  const paginatedTechData = filteredTechData.slice(
    (currentPage - 1) * techItemsPerPage,
    currentPage * techItemsPerPage,
  );

  return (
    <div className="flex h-[calc(100vh-74px)] bg-cream-200">
      <Sidebar activeId="portfolio-analysis" />

      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Page Header */}
          <div className={`flex flex-col gap-6 bg-white p-4 sm:p-6 lg:px-8 -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 ${activeTab === 'extract' ? '!pb-0 mb-8' : 'mb-0'}`}>
            {/* Title Row */}
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-black mb-2">
                  Portfolio analysis
                </h1>
                <p className="text-sm text-gray-500 max-w-3xl">
                Explore the global R&D pipeline for each global health area, disease, or product type through two lenses. Use the Extract custom details tab to build a tailored portfolio across candidate & approved products, R&D priorities, and clinical trials, then export the data as a CSV file for further analysis and reporting. Switch to the Explore visual insights view to analyse portfolio trends through interactive charts and maps.
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

            {/* Tab Switcher and AI Link */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <TabSwitcher
                tabs={[
                  { value: 'explore', label: 'Explore visual insights', icon: ChartIcon },
                  { value: 'extract', label: 'Extract custom details', icon: ListIcon },
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
                size="large"
              />
            </div>

            {/* Sub-tabs for Extract tab */}
            {activeTab === 'extract' && (
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
            )}
          </div>

          {/* Sticky Filters for Explore tab */}
          {activeTab === 'explore' && (
            <div className="sticky top-0 z-20 bg-white -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-200 mb-8">
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
                    variant="outlined"
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
                    variant="outlined"
                  />
                </div>
                <div className="min-w-[220px]">
                  <Dropdown
                    label="Product type"
                    value={product}
                    onChange={setProduct}
                    placeholder="All"
                    options={productOptions}
                    multiSelect={true}
                    loading={productsLoading}
                    variant="outlined"
                  />
                </div>
                <div className="flex-1" />
                <button
                  onClick={handleClearFilters}
                  disabled={!hasFilters}
                  className={`flex items-center gap-2 text-sm px-4 h-[44px] whitespace-nowrap border ${
                    hasFilters
                      ? 'text-[#262626] bg-gray-200 border-gray-300 hover:bg-gray-300 cursor-pointer font-medium'
                      : 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed'
                  }`}
                >
                  Clear
                  <RefreshIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Content based on active tab */}
          {activeTab === 'explore' ? (
            <>
              {/* Pipeline Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {kpisLoading ? (
                  <>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Global pipeline overview - takes 2 columns */}
              <div className="lg:col-span-2 bg-white border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-black">Global pipeline overview</h3>
                  <button
                    onClick={handleExportPNG}
                    disabled={exportingPNG}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-black bg-white border border-black-24 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exportingPNG ? 'Exporting...' : 'Export Visual'}
                    <DownloadIcon className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-4">
               A global overview of the R&amp;D pipeline by product type and development stage. Each horizontal bar represents a product type, with colour‑coded segments showing how many candidates and approved products sit at each stage of the R&D lifecycle, from discovery and pre‑clinical through clinical phases to approval. Use the filters above to narrow the view by global health area, disease, or product type, and click items in the legend to toggle individual stages on or off and compare where activity is concentrated across the pipeline.
                </p>
                <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />

                <div ref={globalPipelineChartRef}>
                {pipelineLoading ? (
                  <div className="h-[500px] flex items-center justify-center">
                    <div className="animate-pulse text-gray-400">Loading chart data...</div>
                  </div>
                ) : (
                  <StackedBarChart
                    data={pipelineData}
                    phases={pipelinePhases}
                    layout="vertical"
                    height={500}
                    yAxisWidth={100}
                    maxTickChars={15}
                    xAxisLabel="Number of candidates / approved products"
                    yAxisLabel="Product type"
                    showFilters={true}
                    visiblePhases={pipelineVisiblePhases}
                    onVisiblePhasesChange={handlePipelineVisiblePhasesChange}
                  />
                )}
                </div>

              </div>

              {/* Product types - takes 1 column */}
              <div className="bg-white border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-black">Product types</h3>
                  <div className="flex items-center gap-2">
                    <Dropdown
                      value={productTypeFilter}
                      onChange={setProductTypeFilter}
                      placeholder="All"
                      options={[
                        { label: 'Candidates', value: 'Candidate' },
                        { label: 'Approved products', value: 'Product' },
                      ]}
                      multiSelect={true}
                      compact={true}
                      className="w-32"
                      variant="outlined"
                    />
                    <ChartMenu
                      onDownloadCSV={() => {
                        const columns = [
                          { label: 'Product type', accessor: 'name' },
                          { label: 'Count', accessor: 'value' },
                        ];
                        const csv = buildCSV(columns, productTypesData);
                        downloadCSV(csv, 'product-types');
                      }}
                      onDownloadPNG={() => downloadPNG(productTypesChartRef, 'product-types')}
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  A snapshot of how the R&amp;D pipeline is distributed across product types. Click on the drop-down to toggle between candidates, approved products or both.
                </p>
                <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />

                <div ref={productTypesChartRef}>
                {productTypesLoading ? (
                  <div className="h-[500px] flex items-center justify-center">
                    <div className="animate-pulse text-gray-400">Loading chart data...</div>
                  </div>
                ) : (
                  <DonutChart
                    data={productTypesData}
                    colors={productTypeColors}
                    height={500}
                    innerRadius={55}
                    outerRadius={140}
                    showLegend={true}
                    legendPosition="top"
                  />
                )}
                </div>
              </div>
            </div>
            </>
          ) : (
            <div>
              {/* Main content card */}
              <div className="bg-white border border-gray-200">
                {/* Header */}
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

                {/* Sticky filters row */}
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
                      <Dropdown
                        label="Disease"
                        value={disease}
                        onChange={(v) => { setDisease(v); setExtractPage(1); }}
                        placeholder="All"
                        options={diseaseOptions}
                        multiSelect={true}
                        compact={true}
                        variant="outlined"
                      />
                    </div>
                    {/* Product filter: only for candidates and clinical trials tabs */}
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
                    {/* R&D stage filter: only for candidates tab */}
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
                                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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

                    {/* Apply / Clear buttons */}
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

                  {/* Right: Data table or empty state */}
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
          )}

          {/* Aggregated portfolio section - only in explore tab */}
          {activeTab === 'explore' && (
          <div className="bg-white border border-gray-200 p-4 mt-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-black">Aggregated portfolio</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              The aggregated portfolio lets you deep dive into four key views of the pipeline: active candidates, approved products, clinical trials and technology types. They can be accessed via the tabs below. All views reflect the page level filters.
            </p>
            <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />

            {/* Tabs */}
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

            {/* Candidates Tab Content */}
            {portfolioTab === 'candidates' && (
              <div className="border border-gray-200 border-t-0">
                {/* Title row */}
                <div className="flex items-center justify-between p-4 pb-0 mb-4">
                  <div className="flex items-center gap-3">
                    <h4 className="text-xl font-bold text-black leading-none">Selected candidates</h4>
                    <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">{candidatesTotalCount} candidates</span>
                  </div>
                  <div className="flex items-center gap-3 h-[36px]">
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <DebouncedInput
                        type="text"
                        placeholder="Search item"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCandidatesPage(1); }}
                        className="pl-10 pr-4 py-2 text-sm bg-gray-100 border-none w-64 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
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
                  This matrix grid shows candidates in development on your current page filter, with a text search option to quickly find specific records. It provides candidate level details such as name, R&D stage, developer, indication and additional attributes to support deeper portfolio analysis.
                </p>

                {/* Table */}
                <ServerTable
                  columns={CANDIDATE_COLUMNS}
                  data={candidatesData}
                  rowKey="candidate_key"
                  currentPage={candidatesPage}
                  onPageChange={setCandidatesPage}
                  totalCount={candidatesTotalCount}
                  hasNextPage={candidatesHasNext}
                  itemsPerPage={itemsPerPage}
                  loading={candidatesLoading}
                  emptyState={searchQuery ? {
                    title: 'No candidates found',
                    description: `Your search "${searchQuery}" did not match any candidates. Please try again or clear the search.`,
                    onClear: () => { setSearchQuery(''); setCandidatesPage(1); },
                  } : { title: 'No candidates available' }}
                />
              </div>
            )}

            {/* Approved Product Tab Content */}
            {portfolioTab === 'approved' && (
              <>
                <p className="text-sm text-gray-500 my-4">
                  This view includes summary charts showing approval status, approving authorities, and WHO prequalification, alongside a searchable table of approved products based on current filters. The table provides product‑level details such as name, indication, approval status, approving authorities, WHO prequalification status, and other key attributes.
                </p>

                {/* Three chart cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
                  {/* Approval status */}
                  <div className="bg-white border border-gray-200 p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-bold text-black">Approval status</h4>
                      <ChartMenu onDownloadCSV={() => {
                        const columns = [
                          { label: 'Approval status', accessor: 'name' },
                          { label: 'Count', accessor: 'value' },
                        ];
                        const csv = buildCSV(columns, approvalStatusData);
                        downloadCSV(csv, 'approval-status');
                      }} onDownloadPNG={() => downloadPNG(approvalStatusChartRef, 'approval-status')} />
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

                  {/* Approving Authorities */}
                  <div className="bg-white border border-gray-200 p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-bold text-black">Approving authorities</h4>
                      <ChartMenu onDownloadCSV={() => {
                        const columns = [
                          { label: 'Authority type', accessor: (row) => row.category.replace(/\n/g, ' ') },
                          { label: 'WHO prequalified', accessor: 'who_prequalified' },
                          { label: 'No formal WHO listing', accessor: 'no_who_listing' },
                        ];
                        const csv = buildCSV(columns, approvingAuthoritiesData);
                        downloadCSV(csv, 'approving-authorities');
                      }} onDownloadPNG={() => downloadPNG(approvingAuthoritiesChartRef, 'approving-authorities')} />
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
                      <ChartMenu onDownloadCSV={() => {
                        const columns = [
                          { label: 'WHO prequalification', accessor: 'name' },
                          { label: 'Count', accessor: 'value' },
                        ];
                        const csv = buildCSV(columns, whoPrequalData);
                        downloadCSV(csv, 'who-prequalification');
                      }} onDownloadPNG={() => downloadPNG(whoPrequalChartRef, 'who-prequalification')} />
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
                  {/* Title row */}
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <h4 className="text-xl font-bold text-black leading-none">Selected products</h4>
                      <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">{approvedTotalCount} products</span>
                    </div>
                    <div className="flex items-center gap-3 h-[36px]">
                      <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <DebouncedInput
                          type="text"
                          placeholder="Search item"
                          value={approvedSearchQuery}
                          onChange={(e) => { setApprovedSearchQuery(e.target.value); setApprovedPage(1); }}
                          className="pl-10 pr-4 py-2 text-sm bg-gray-100 border-none w-64 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
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

                  {/* Table */}
                  <ServerTable
                    columns={APPROVED_PRODUCT_COLUMNS}
                    data={approvedProductsData}
                    rowKey="candidate_key"
                    currentPage={approvedPage}
                    onPageChange={setApprovedPage}
                    totalCount={approvedTotalCount}
                    hasNextPage={approvedHasNext}
                    itemsPerPage={itemsPerPage}
                    loading={approvedLoading}
                    emptyState={approvedSearchQuery ? {
                      title: 'No approved products found',
                      description: `Your search "${approvedSearchQuery}" did not match any approved products. Please try again or clear the search.`,
                      onClear: () => { setApprovedSearchQuery(''); setApprovedPage(1); },
                    } : { title: 'No approved products available' }}
                  />
                </div>
              </>
            )}
            {portfolioTab === 'trials' && (
              <>
              <p className="text-sm text-gray-500 my-4">
                  This provides a high-level overview of studies through an age group chart and a clinical trial status chart, helping users quickly understand patient demographics and trial progression. A global map and detailed table complement these visuals by showing geographic distribution and key trial attributes for deeper exploration and comparison.
                </p>
                {/* Two chart cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                  {/* Age groups in clinical trials */}
                  <div className="bg-white border border-gray-200 p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-bold text-black">Age groups in clinical trials</h4>
                      <ChartMenu onDownloadCSV={() => {
                        const columns = [
                          { label: 'Age group', accessor: 'name' },
                          { label: 'Count', accessor: 'value' },
                        ];
                        const csv = buildCSV(columns, ageGroupsData);
                        downloadCSV(csv, 'age-groups-in-clinical-trials');
                      }} onDownloadPNG={() => downloadPNG(ageGroupsChartRef, 'age-groups-in-clinical-trials')} />
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

                  {/* Clinical trial status */}
                  <div className="bg-white border border-gray-200 p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-bold text-black">Clinical trial status</h4>
                      <ChartMenu onDownloadCSV={() => {
                        const columns = [
                          { label: 'Trial status', accessor: 'name' },
                          { label: 'Count', accessor: 'value' },
                        ];
                        const csv = buildCSV(columns, trialStatusData);
                        downloadCSV(csv, 'clinical-trial-status');
                      }} onDownloadPNG={() => downloadPNG(trialStatusChartRef, 'clinical-trial-status')} />
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
                      <ChartMenu onDownloadCSV={() => {
                        const columns = [
                          { label: 'Country', accessor: 'country_name' },
                          { label: 'ISO code', accessor: 'iso_code' },
                          { label: 'Count', accessor: 'candidateCount' },
                        ];
                        const csv = buildCSV(columns, clinicalTrialsDistribution);
                        downloadCSV(csv, 'geographic-distribution-clinical-trials');
                      }} onDownloadPNG={() => downloadPNG(geoDistributionChartRef, 'geographic-distribution-clinical-trials')} />
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
                        <div className="relative">
                          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <DebouncedInput
                            type="text"
                            placeholder="Search"
                            value={trialsSearchQuery}
                            onChange={(e) => { setTrialsSearchQuery(e.target.value); }}
                            className="pl-10 pr-4 py-2 text-sm bg-gray-100 border-none w-64 focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
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
                      The clinical trial table is a matrix of individual studies, providing granular details such as title, clinical trial status, location, start date, URL and more. The table can be searched using the a text search box to quickly locate specific technologies and filtered results can be exported as a .csv file.
                    </p>
                  </div>

                  {/* Table */}
                  <ServerTable
                    columns={CLINICAL_TRIAL_COLUMNS}
                    data={clinicalTrialsTableData}
                    rowKey="trial_id"
                    currentPage={trialsPage}
                    onPageChange={setTrialsPage}
                    totalCount={trialsTotalCount}
                    hasNextPage={trialsHasNextPage}
                    itemsPerPage={trialsPerPage}
                    loading={trialsListLoading}
                    emptyState={trialsSearchQuery ? {
                      title: 'No clinical trials found',
                      description: `Your search "${trialsSearchQuery}" did not match any clinical trials. Please try again or clear the search.`,
                      onClear: () => { setTrialsSearchQuery(''); setTrialsPage(1); },
                    } : { title: 'No clinical trials available' }}
                  />
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
                      <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">{filteredTechData.length} types</span>
                    </div>
                    <div className="flex items-center gap-3 h-[36px]">
                      <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <DebouncedInput
                          type="text"
                          placeholder="Search item"
                          value={technologySearchQuery}
                          onChange={(e) => { setTechnologySearchQuery(e.target.value); }}
                          className="pl-10 pr-4 py-2 text-sm bg-gray-100 border-none w-64 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
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
                    The technology type table is a matrix showing each technology category by stage of development, including approved products. This highlights how technologies are distributed across the R&D lifecycle. The table can be searched using the a text search box to quickly locate specific technologies and filtered results can be exported as a .csv file.
                  </p>
                </div>

                {/* Table */}
                <ServerTable
                  columns={[
                    { header: 'Name', accessor: 'technology_type' },
                    ...technologyPhases.map((phase) => ({
                      header: phase.label,
                      accessor: phase.key,
                      cellStyle: (value) => getHeatmapStyle(value),
                      render: (value) => (
                        <span className="tabular-nums text-center block">{value || 0}</span>
                      ),
                    })),
                  ]}
                  data={paginatedTechData}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                  totalCount={filteredTechData.length}
                  hasNextPage={currentPage < techTotalPages}
                  itemsPerPage={techItemsPerPage}
                  loading={technologyLoading}
                  emptyState={technologySearchQuery ? {
                    title: 'No technology types found',
                    description: `Your search "${technologySearchQuery}" did not match any technology types. Please try again or clear the search.`,
                    onClear: () => { setTechnologySearchQuery(''); setCurrentPage(1); },
                  } : { title: 'No technology types available' }}
                />
              </div>
            )}
          </div>
          )}
        </div>
      </main>
    </div>
  );
}
