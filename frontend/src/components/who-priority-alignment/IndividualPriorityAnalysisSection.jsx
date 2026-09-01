'use client';

// =========================================================
// IndividualPriorityAnalysisSection — Phase B wiring.
// =========================================================
// Replaces Phase A's four placeholders with live data:
//
//   • Three stat cards — counts and target_population from
//     `useIndividualPriorityAnalysis`.
//   • Pipeline build-up stacked bar chart fed through the
//     `transformProductPhaseDistribution` helper.
//   • Candidates table via `usePortfolioCandidates`, scoped
//     to `candidate_type = 'Candidate'` + the committed priority
//     key. URL-backed filter / sort / pagination / visible-columns
//     state lives under the `who-priority` namespace so it
//     doesn't collide with Portfolio Analysis's `*.candidates` keys.
//
// The slide-in panel, dropdown, Apply/Clear row, and EmptyState
// are preserved exactly as Phase A left them.

import { useState, useMemo, useCallback, useRef } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Dropdown, StatCard, DataTable, ChartMenu } from '@/components/ui';
import { StackedBarChart, ChartEmptyState } from '@/components/charts';
import { InfoIcon, RefreshIcon, CloudDownloadIcon } from '@/components/icons';
import {
  usePriorityAlignment,
  useRdPriorities,
  useIndividualPriorityAnalysis,
  usePortfolioCandidates,
} from '@/graphql/hooks';
import { transformProductPhaseDistribution } from '@/lib/transformations/productPhaseDistribution';
import {
  CANDIDATE_COLUMNS,
  buildCandidateColumns,
  toCSVColumns,
} from '@/lib/exploreColumnConfig';
import { CandidateSlideIn } from '@/components/slideins/CandidateSlideIn';
import { sortSerializer, makeFilterSerializer } from '@/lib/dataTableUrl';
import { toColumnFilters, toColumnSort } from '@/lib/dataTableGraphQL';
import { buildCSV, downloadCSV } from '@/lib/csv';
import { downloadPNG } from '@/lib/png';
import { fetchAllCandidates } from '@/lib/fetchAllCandidates';
import { useUrlState } from '@/lib/useUrlState';
import {
  arraySerializer,
  numberSerializer,
  stringSerializer,
} from '@/lib/url-serializers';
import { useWhoPageFilters } from './useWhoPageFilters';
import { useIndividualPriorityState } from './useIndividualPriorityState';
import PriorityKeyInfoPanel from './PriorityKeyInfoPanel';
import { t } from '@/content';

const candidatesFilterSerializer = makeFilterSerializer(CANDIDATE_COLUMNS);

// Page size for the candidates table — kept module-scope so the
// hook fetch size and the DataTable pagination UI never drift.
const ITEMS_PER_PAGE = 20;

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="w-12 h-12 flex items-center justify-center rounded-md bg-orange-100 mb-4">
        <InfoIcon className="w-6 h-6 text-orange-500" />
      </div>
      <h4 className="text-lg font-bold text-black mb-1">{t('who_priority.individual.empty_title')}</h4>
      <p className="text-sm text-gray-500 max-w-xs text-center">
        {t('who_priority.individual.empty_description')}
      </p>
    </div>
  );
}

function PipelineBuildUpCard({ pipelineBuildUp, loading }) {
  const chartRef = useRef(null);

  const { chartData, phases } = useMemo(
    () => transformProductPhaseDistribution(pipelineBuildUp ?? []),
    [pipelineBuildUp],
  );

  return (
    <div
      ref={chartRef}
      className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col"
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <div>
          <h4 className="text-base font-bold text-black">{t('who_priority.individual.pipeline_chart.title')}</h4>
          <p className="text-sm text-gray-500">
            {t('who_priority.individual.pipeline_chart.description')}
          </p>
        </div>
        <ChartMenu
          onDownloadCSV={() => {
            const csv = buildCSV(
              [
                { label: 'Product type', accessor: 'category' },
                ...phases.map((p) => ({ label: p.label, accessor: p.key })),
              ],
              chartData,
            );
            downloadCSV(csv, 'who-individual-priority-pipeline-build-up');
          }}
          onDownloadPNG={() =>
            downloadPNG(chartRef, 'who-individual-priority-pipeline-build-up')
          }
        />
      </div>
      <div className="flex-1 mt-2">
        {loading ? (
          <div className="h-[220px] flex items-center justify-center">
            <div className="animate-pulse text-gray-400">{t('who_priority.overview.loading')}</div>
          </div>
        ) : chartData.length === 0 ? (
          <ChartEmptyState variant="bar" height={220} />
        ) : (
          <StackedBarChart
            data={chartData}
            phases={phases}
            categoryKey="category"
            layout="vertical"
            height={Math.max(180, chartData.length * 48)}
            xAxisLabel={t('who_priority.individual.pipeline_chart.x_axis')}
            barRadius={0}
          />
        )}
      </div>
    </div>
  );
}

function CandidatesTable({
  columns,
  candidates,
  totalCount,
  hasNextPage,
  loading,
  filterContext,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  page,
  onPageChange,
  visibleColumns,
  onVisibleColumnsChange,
  onDownloadCSV,
  downloading,
}) {
  return (
    <div className="border border-gray-200">
      <div className="p-4 pb-0 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h4 className="text-xl font-bold text-black leading-none">
              {t('who_priority.individual.candidates_table.title')}
            </h4>
            <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">
              {totalCount} {t('who_priority.individual.candidates_table.count_label')}
            </span>
          </div>
          <div className="flex items-center gap-3 h-[36px]">
            <button
              onClick={onDownloadCSV}
              disabled={downloading || totalCount === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm text-black bg-white border border-black-24 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <CloudDownloadIcon className="w-4 h-4" />
              {downloading ? t('who_priority.individual.candidates_table.downloading') : t('who_priority.individual.candidates_table.download_csv')}
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {t('who_priority.individual.candidates_table.description')}
        </p>
      </div>
      <DataTable
        tableId="who-priority-candidates"
        graphqlTable="PORTFOLIO_CANDIDATES"
        filterContext={filterContext}
        columns={columns}
        data={candidates}
        rowKey="candidate_key"
        page={page}
        onPageChange={onPageChange}
        totalCount={totalCount}
        hasNextPage={hasNextPage}
        itemsPerPage={ITEMS_PER_PAGE}
        loading={loading}
        filters={filters}
        onFiltersChange={onFiltersChange}
        sort={sort}
        onSortChange={onSortChange}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={onVisibleColumnsChange}
        emptyState={
          Object.keys(filters || {}).length > 0
            ? {
                title: t('who_priority.individual.candidates_table.empty_filtered_title'),
                description: t('who_priority.individual.candidates_table.empty_filtered_description'),
              }
            : { title: t('who_priority.individual.candidates_table.empty_no_linked') }
        }
      />
    </div>
  );
}

function ActiveBody({
  selectedPriorityName,
  onExplore,
  analysis,
  table,
  candidateColumns,
  filterContext,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  page,
  onPageChange,
  visibleColumns,
  onVisibleColumnsChange,
  onDownloadCSV,
  downloading,
}) {
  return (
    <div className="flex flex-col gap-6">
      {/* Row A — Pipeline header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-base sm:text-lg font-bold text-black">
          {t('who_priority.individual.pipeline_heading')} {selectedPriorityName ?? '—'}
        </h4>
        <button
          type="button"
          data-tour="wpa-explore"
          onClick={onExplore}
          className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium text-black bg-orange-500 hover:bg-black hover:text-white whitespace-nowrap transition-colors cursor-pointer"
        >
          {t('who_priority.individual.explore_button')}
        </button>
      </div>

      {/* Rows B+C — two-column grid: left = stat-card stack, right = pipeline chart */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
        {/* Column 1 — stacked stat cards bound to the analysis hook */}
        <div className="flex flex-col gap-4">
          <StatCard
            title={t('who_priority.individual.stat_candidates.title')}
            value={analysis.counts.candidatesCount}
            variant="number"
            loading={analysis.loading}
          />
          <StatCard
            title={t('who_priority.panel.sections.target_population')}
            value={
              analysis.targetPopulation && analysis.targetPopulation.length > 0
                ? analysis.targetPopulation
                : t('who_priority.individual.not_specified')
            }
            variant="text"
            loading={analysis.loading}
          />
        </div>

        {/* Column 2 — Pipeline build up chart */}
        <PipelineBuildUpCard
          pipelineBuildUp={analysis.pipelineBuildUp}
          loading={analysis.loading}
        />
      </div>

      {/* Row D — Candidates table */}
      <CandidatesTable
        columns={candidateColumns}
        candidates={table.candidates}
        totalCount={table.totalCount}
        hasNextPage={table.hasNextPage}
        loading={table.loading}
        filterContext={filterContext}
        filters={filters}
        onFiltersChange={onFiltersChange}
        sort={sort}
        onSortChange={onSortChange}
        page={page}
        onPageChange={onPageChange}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={onVisibleColumnsChange}
        onDownloadCSV={onDownloadCSV}
        downloading={downloading}
      />
    </div>
  );
}

export default function IndividualPriorityAnalysisSection() {
  const page = useWhoPageFilters();
  const state = useIndividualPriorityState();
  const apolloClient = useApolloClient();
  const [slideInOpen, setSlideInOpen] = useState(false);

  // URL-backed state for the per-row candidate slide-in. Mirrors the
  // `slide` / `slideKey` shape used on the Aggregated portfolio page so a
  // shared link deep-links to the same open panel.
  const [candidateSlideType, setCandidateSlideType] = useUrlState(
    'slide',
    null,
    stringSerializer,
  );
  const [candidateSlideKey, setCandidateSlideKey] = useUrlState(
    'slideKey',
    null,
    numberSerializer,
  );
  const closeCandidateSlideIn = useCallback(() => {
    setCandidateSlideType(null);
    setCandidateSlideKey(null);
  }, [setCandidateSlideType, setCandidateSlideKey]);

  // The priority-info panel and the candidate slide-in share the same
  // right-anchored dock, so they're held mutually exclusive: opening one
  // closes the other.
  const openPriorityInfo = useCallback(() => {
    closeCandidateSlideIn();
    setSlideInOpen(true);
  }, [closeCandidateSlideIn]);

  const candidateColumns = useMemo(
    () =>
      buildCandidateColumns({
        onExplore: (row) => {
          setSlideInOpen(false);
          setCandidateSlideType('candidate');
          setCandidateSlideKey(row.candidate_key);
        },
      }),
    [setCandidateSlideType, setCandidateSlideKey],
  );

  const { priorities, loading: prioritiesLoading } = usePriorityAlignment(
    page.healthArea.length > 0 ? page.healthArea : null,
    page.primary.length > 0 ? page.primary : null,
    page.secondary.length > 0 ? page.secondary : null,
    page.expandedProduct.length > 0 ? page.expandedProduct : null,
    page.rdPhase.length > 0 ? page.rdPhase : null,
  );

  const dropdownOptions = priorities.map((p) => ({
    value: String(p.priority_key),
    label: p.priority_name,
  }));

  const selectedPriorityName =
    priorities.find((p) => p.priority_key === state.committedPriority)?.priority_name ?? null;

  // Phase B handoff (Q19): when the page-bar filters change to exclude
  // the committed priority, the active body keeps rendering but
  // `selectedPriorityName` becomes null (Row A reads `—`). The
  // dropdown placeholder shows the orphan key, but the rest of the
  // section gives no signal that the user's selection is stale. The
  // final UX (warning chip? auto-clear? grey-out body?) is gated on
  // the designer's Q19 answer. Phase A leaves this as-is.
  const isCommittedInOptions =
    state.committedPriority == null ||
    priorities.some((p) => p.priority_key === state.committedPriority);
  const staleCommitLabel =
    state.committedPriority != null && !isCommittedInOptions
      ? `Unknown priority (#${state.committedPriority}) — not in current filter`
      : null;

  // Slide-in: fetch the committed priority's editorial record only when
  // the panel is open. `useRdPriorities` returns the one node we need.
  const slideinHook = useRdPriorities(
    { priorityKeys: state.committedPriority != null ? [state.committedPriority] : null },
    1,
    0,
    { skip: !slideInOpen || state.committedPriority == null },
  );
  const slideInPriority = slideinHook?.priorities?.[0] ?? null;

  const onDropdownChange = (val) => {
    if (val === '' || val == null) {
      state.setPending(null);
    } else {
      state.setPending(Number(val));
    }
  };

  // `Dropdown` has no `disabled` prop, so we gate interactivity with a
  // wrapping div that suppresses pointer events when the options list is
  // empty or still loading.
  const dropdownDisabled = prioritiesLoading || dropdownOptions.length === 0;

  // =========================================================
  // Live data wiring for the active body
  // =========================================================

  // Analysis: counts + target_population + pipeline build-up.
  const analysis = useIndividualPriorityAnalysis({
    priorityKey: state.committedPriority,
    globalHealthAreas: page.healthArea,
    primaryDiseaseNames: page.primary,
    secondaryDiseaseNames: page.secondary,
    productNames: page.expandedProduct,
    phaseNames: page.rdPhase,
  });

  // Table state — mirrors the shared DataTable `f.<tab>`/`s.<tab>`/
  // `cols.<tab>`/`<tab>-page` URL-state pattern but with a `who-priority`
  // namespace so we don't collide with other pages' keys.
  const [candidatesFilters, setCandidatesFilters] = useUrlState(
    'f.who-priority',
    {},
    candidatesFilterSerializer,
  );
  const [candidatesSort, setCandidatesSort] = useUrlState(
    's.who-priority',
    null,
    sortSerializer,
  );
  const [candidatesVisibleCols, setCandidatesVisibleCols] = useUrlState(
    'cols.who-priority',
    [],
    arraySerializer,
  );
  const [candidatesPage, setCandidatesPage] = useUrlState(
    'who-priority-page',
    1,
    numberSerializer,
  );

  const candidatesColumnFilters = useMemo(
    () => toColumnFilters(candidatesFilters),
    [candidatesFilters],
  );
  const candidatesSortVar = useMemo(
    () => toColumnSort(candidatesSort),
    [candidatesSort],
  );

  // filterContext is forwarded to `<DataTable>` so it can issue
  // server-side filter-options queries scoped to the current priority.
  const candidatesFilterContext = useMemo(
    () => ({
      global_health_areas: page.healthArea?.length > 0 ? page.healthArea : undefined,
      primary_disease_names: page.primary?.length > 0 ? page.primary : undefined,
      secondary_disease_names: page.secondary?.length > 0 ? page.secondary : undefined,
      product_names: page.expandedProduct?.length > 0 ? page.expandedProduct : undefined,
      phase_names: page.rdPhase?.length > 0 ? page.rdPhase : undefined,
      candidate_type: 'Candidate',
      priority_keys:
        state.committedPriority != null ? [state.committedPriority] : undefined,
      column_filters: candidatesColumnFilters,
    }),
    [
      page.healthArea,
      page.primary,
      page.secondary,
      page.expandedProduct,
      page.rdPhase,
      state.committedPriority,
      candidatesColumnFilters,
    ],
  );

  const table = usePortfolioCandidates(
    {
      globalHealthAreas: page.healthArea,
      primaryDiseaseNames: page.primary,
      secondaryDiseaseNames: page.secondary,
      productNames: page.expandedProduct,
      phaseNames: page.rdPhase,
      candidateType: 'Candidate',
      priorityKeys:
        state.committedPriority != null ? [state.committedPriority] : null,
      columnFilters: candidatesColumnFilters,
    },
    ITEMS_PER_PAGE,
    (candidatesPage - 1) * ITEMS_PER_PAGE,
    {
      skip: state.committedPriority == null,
      sort: candidatesSortVar,
    },
  );

  // CSV download: fetches all rows via the paginating `fetchAllCandidates`
  // helper (the shared batched-CSV export pattern) so the export isn't
  // capped at the visible page.
  const [candidatesDownloading, setCandidatesDownloading] = useState(false);
  const handleCandidatesDownloadCSV = useCallback(async () => {
    setCandidatesDownloading(true);
    try {
      const allRows = await fetchAllCandidates(apolloClient, {
        globalHealthAreas: page.healthArea,
        primaryDiseaseNames: page.primary,
        secondaryDiseaseNames: page.secondary,
        productNames: page.expandedProduct,
        candidateType: 'Candidate',
        priorityKeys:
          state.committedPriority != null ? [state.committedPriority] : null,
        columnFilters: candidatesColumnFilters,
      });
      const csv = buildCSV(toCSVColumns(CANDIDATE_COLUMNS), allRows);
      downloadCSV(csv, 'who-individual-priority-candidates');
    } catch (err) {
      console.error('Candidates CSV download failed:', err);
    } finally {
      setCandidatesDownloading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    apolloClient,
    page.healthArea,
    page.primary,
    page.secondary,
    page.expandedProduct,
    state.committedPriority,
    candidatesColumnFilters,
  ]);

  return (
    <div data-tour="wpa-individual" className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div className="mb-2">
        <h3 className="text-base sm:text-lg font-bold text-black">
          {t('who_priority.individual.title')}
        </h3>
        <p className="text-sm text-gray-500">
          {t('who_priority.individual.description')}
        </p>
      </div>
      <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />

      <div className="flex flex-wrap items-end gap-4 mb-4">
        <div
          className={`min-w-[260px] ${dropdownDisabled ? 'opacity-50' : ''}`}
          aria-disabled={dropdownDisabled || undefined}
          {...(dropdownDisabled ? { inert: '' } : {})}
        >
          <Dropdown
            label={t('who_priority.individual.dropdown_label')}
            value={state.pendingPriority != null ? String(state.pendingPriority) : ''}
            placeholder={
              staleCommitLabel ||
              (dropdownOptions.length === 0 ? t('who_priority.individual.dropdown_no_priorities') : 'All')
            }
            options={dropdownOptions}
            multiSelect={false}
            variant="outlined"
            onChange={onDropdownChange}
          />
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={state.clear}
          disabled={!state.hasPending && !state.hasCommitted}
          className={`flex items-center gap-2 text-sm px-4 h-[44px] whitespace-nowrap border transition-colors ${
            !state.hasPending && !state.hasCommitted
              ? 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed'
              : 'text-black bg-white border-gray-300 hover:bg-gray-50 cursor-pointer'
          }`}
        >
          {t('who_priority.individual.clear')}
          <RefreshIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={state.apply}
          disabled={!state.hasPending}
          className={`flex items-center justify-center text-sm font-medium px-6 h-[44px] whitespace-nowrap transition-colors ${
            !state.hasPending
              ? 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed'
              : 'text-black bg-orange-500 hover:bg-black hover:text-white cursor-pointer'
          }`}
        >
          {t('who_priority.individual.apply')}
        </button>
      </div>

      <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />

      {!state.hasCommitted ? (
        <EmptyState />
      ) : (
        <ActiveBody
          selectedPriorityName={selectedPriorityName}
          onExplore={openPriorityInfo}
          analysis={analysis}
          table={table}
          candidateColumns={candidateColumns}
          filterContext={candidatesFilterContext}
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
          page={candidatesPage}
          onPageChange={setCandidatesPage}
          visibleColumns={candidatesVisibleCols}
          onVisibleColumnsChange={setCandidatesVisibleCols}
          onDownloadCSV={handleCandidatesDownloadCSV}
          downloading={candidatesDownloading}
        />
      )}

      <PriorityKeyInfoPanel
        isOpen={slideInOpen}
        onClose={() => setSlideInOpen(false)}
        priority={slideInPriority}
        loading={slideinHook?.loading}
      />

      {candidateSlideType === 'candidate' && candidateSlideKey != null && (
        <CandidateSlideIn
          candidateKey={candidateSlideKey}
          onClose={closeCandidateSlideIn}
        />
      )}
    </div>
  );
}
