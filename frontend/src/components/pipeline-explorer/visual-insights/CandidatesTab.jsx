'use client';

import { useState, useRef, useMemo } from 'react';
import { useGlobalFilters } from '@/components/global-filters';
import {
  usePortfolioKPIs,
  useGlobalHealthAreaSummaries,
  useDiseaseSummaries,
  useProductDistribution,
  usePortfolioCandidates,
} from '@/graphql/hooks';
import { buildCandidateColumns } from '@/lib/exploreColumnConfig';
import { toColumnFilters, toColumnSort } from '@/lib/dataTableGraphQL';
import { displayHealthArea } from '@/lib/transformations/constants';
import { downloadPNG } from '@/lib/png';
import { DataTable } from '@/components/ui';
import { KpiStatCards } from './shared/KpiStatCards';
import { TopFiveDiseasesChart } from './shared/TopFiveDiseasesChart';
import { TopFiveProductTypesChart } from './shared/TopFiveProductTypesChart';
import { TAB_LABELS, ITEMS_PER_PAGE, STAT_CARD_COLORS } from './shared/primitives';

// =========================================================
// Candidates tab — Visual Insights
// =========================================================
//
// The Candidates slice of the former Analytical Insights page, extracted into
// its own tab component. Unlike the original (which fetched portfolio data
// without any filters and branched on an `activeTab` flag), this tab is always
// scoped to candidates and threads the five global filters from
// `useGlobalFilters()` into every data hook so the view reacts to the shared
// filter bar.
//
// The tab owns no slide-in state. When a row's Explore action fires it calls
// the `onExplore(type, key)` callback; the host page decides what to render.

export default function CandidatesTab({ onExplore }) {
  const { healthArea, primary, secondary, expandedProduct, rdPhase } = useGlobalFilters();

  // Per-table state is deliberately local React state rather than URL state:
  // each Visual Insights tab mounts its own DataTable, and URL-backed keys
  // (page/filters/sort) would collide across tabs that share the same param
  // names. Local state keeps each tab's pagination independent.
  const [candidatesPage, setCandidatesPage] = useState(1);
  const [candidatesFilters, setCandidatesFilters] = useState({});
  const [candidatesSort, setCandidatesSort] = useState(null);
  const [candidatesVisibleCols, setCandidatesVisibleCols] = useState([]);

  // PNG-capture refs for the two charts, handed to the shared chart components.
  const diseasesChartRef = useRef(null);
  const productsChartRef = useRef(null);

  // =========================================================
  // API hooks (all scoped to 'Candidate' and the global filters)
  // =========================================================

  const { raw: kpisRaw } = usePortfolioKPIs(
    healthArea, primary, secondary, expandedProduct, rdPhase,
  );

  // GHA summaries feed the per-Global-Health-Area stat cards.
  const { bubbleData: ghaSummaries } = useGlobalHealthAreaSummaries(['Candidate'], {
    globalHealthAreas: healthArea,
    primaryDiseaseNames: primary,
    secondaryDiseaseNames: secondary,
    phaseNames: rdPhase,
  });

  // Disease summaries feed the Top 5 diseases chart.
  const { bubbleData: diseaseBubble, loading: diseasesLoading } = useDiseaseSummaries(['Candidate'], {
    globalHealthAreas: healthArea,
    primaryDiseaseNames: primary,
    secondaryDiseaseNames: secondary,
    productNames: expandedProduct,
    phaseNames: rdPhase,
  });

  // Product distribution feeds the Top 5 product types chart.
  const { chartData: productChartData, loading: productsLoading } = useProductDistribution(
    healthArea, primary, secondary, expandedProduct, rdPhase, 'Candidate',
  );

  // =========================================================
  // Derivations
  // =========================================================

  const top5Diseases = useMemo(() => {
    if (!diseaseBubble?.length) return [];
    const sorted = [...diseaseBubble].sort((a, b) => b.value - a.value);
    return sorted.slice(0, 5).map((d) => ({
      name: d.name,
      value: d.value,
      gha: d.group,
    }));
  }, [diseaseBubble]);

  const top5Products = useMemo(() => {
    if (!productChartData?.length) return [];
    return [...productChartData].sort((a, b) => b.value - a.value).slice(0, 5);
  }, [productChartData]);

  // Stat cards: a total-candidates card followed by one card per GHA. The
  // original page branched these values on activeTab; here they are fixed to
  // the candidate figures.
  const statCards = useMemo(() => {
    const total = kpisRaw?.totalCandidates ?? 0;
    const ghaCards = (ghaSummaries || []).map((g, i) => {
      const count = g.candidateCount;
      const pct = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
      return {
        title: g.global_health_area ? displayHealthArea(g.global_health_area) : g.name,
        value: count,
        percentage: pct,
        color: STAT_CARD_COLORS[i % STAT_CARD_COLORS.length],
      };
    });
    return [{ title: 'Total candidates', value: total, percentage: null }, ...ghaCards];
  }, [kpisRaw, ghaSummaries]);

  // =========================================================
  // Candidates DataTable (server-side pagination)
  // =========================================================

  const candidatesColumnFilters = useMemo(() => {
    const base = toColumnFilters(candidatesFilters) || [];
    return base.length > 0 ? base : undefined;
  }, [candidatesFilters]);
  const candidatesSortVar = useMemo(() => toColumnSort(candidatesSort), [candidatesSort]);

  const {
    candidates: candidatesData,
    totalCount: candidatesTotalCount,
    hasNextPage: candidatesHasNext,
    loading: candidatesDataLoading,
  } = usePortfolioCandidates(
    {
      candidateType: 'Candidate',
      columnFilters: candidatesColumnFilters,
      globalHealthAreas: healthArea,
      primaryDiseaseNames: primary,
      secondaryDiseaseNames: secondary,
      productNames: expandedProduct,
      phaseNames: rdPhase,
    },
    ITEMS_PER_PAGE,
    (candidatesPage - 1) * ITEMS_PER_PAGE,
    { sort: candidatesSortVar },
  );

  const candidateColumns = useMemo(
    () => buildCandidateColumns({
      onExplore: (row) => onExplore('candidate', row.candidate_key),
    }),
    [onExplore],
  );

  // Filter context lets the DataTable resolve category-filter options against
  // the same candidate scope and active column filters.
  const candidatesFilterContext = useMemo(() => ({
    candidate_type: 'Candidate',
    column_filters: candidatesColumnFilters,
  }), [candidatesColumnFilters]);

  return (
    <>
      <KpiStatCards cards={statCards} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <TopFiveDiseasesChart
          data={top5Diseases}
          title={TAB_LABELS.candidates.disease}
          loading={diseasesLoading}
          chartRef={diseasesChartRef}
          onDownloadPNG={() => downloadPNG(diseasesChartRef, 'top-5-diseases')}
        />
        <TopFiveProductTypesChart
          data={top5Products}
          title={TAB_LABELS.candidates.product}
          loading={productsLoading}
          chartRef={productsChartRef}
          onDownloadPNG={() => downloadPNG(productsChartRef, 'top-5-product-types')}
        />
      </div>

      <div className="bg-white border border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <h3 className="text-base sm:text-lg font-bold text-black">Candidates</h3>
          <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">{candidatesTotalCount.toLocaleString()}</span>
        </div>
        <DataTable
          tableId="vi-candidates"
          graphqlTable="PORTFOLIO_CANDIDATES"
          filterContext={candidatesFilterContext}
          columns={candidateColumns}
          data={candidatesData || []}
          rowKey="candidate_key"
          page={candidatesPage}
          onPageChange={setCandidatesPage}
          totalCount={candidatesTotalCount}
          hasNextPage={candidatesHasNext}
          itemsPerPage={ITEMS_PER_PAGE}
          loading={candidatesDataLoading}
          filters={candidatesFilters}
          onFiltersChange={(next) => { setCandidatesFilters(next); setCandidatesPage(1); }}
          sort={candidatesSort}
          onSortChange={(next) => { setCandidatesSort(next); setCandidatesPage(1); }}
          visibleColumns={candidatesVisibleCols}
          onVisibleColumnsChange={setCandidatesVisibleCols}
          emptyState={{ title: 'No candidates found' }}
        />
      </div>
    </>
  );
}
