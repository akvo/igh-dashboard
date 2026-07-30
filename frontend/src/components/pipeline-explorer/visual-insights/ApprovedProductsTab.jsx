'use client';

import { useRef, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { useGlobalFilters } from '@/components/global-filters';
import {
  usePortfolioKPIs,
  useGlobalHealthAreaSummaries,
  useDiseaseSummaries,
  useProductDistribution,
  useRegulatoryDistribution,
  usePortfolioCandidates,
} from '@/graphql/hooks';
import { buildApprovedProductColumns, APPROVED_PRODUCT_COLUMNS } from '@/lib/exploreColumnConfig';
import { toColumnFilters, toColumnSort } from '@/lib/dataTableGraphQL';
import { useUrlState } from '@/lib/useUrlState';
import { arraySerializer, numberSerializer } from '@/lib/url-serializers';
import { sortSerializer, makeFilterSerializer } from '@/lib/dataTableUrl';
import { downloadPNG } from '@/lib/png';
import { buildCSV, downloadCSV } from '@/lib/csv';
import { stackedCSVColumns } from '@/lib/visualInsightsCsv';
import { DataTable, ChartMenu } from '@/components/ui';
import { BarChart as ChartBarChart, StackedBarChart, ChartEmptyState } from '@/components/charts';
import { KpiStatCards } from './shared/KpiStatCards';
import { TopFiveDiseasesChart } from './shared/TopFiveDiseasesChart';
import { TopFiveProductTypesChart } from './shared/TopFiveProductTypesChart';
import { buildGhaStatCards } from './shared/buildGhaStatCards';
import {
  TAB_LABELS,
  TAB_DESCRIPTIONS,
  KPI_TOOLTIPS,
  ITEMS_PER_PAGE,
  STATUS_COLORS,
  APPROVING_AUTH_PHASES,
  DonutTooltip,
} from './shared/primitives';
import { t } from '@/content';

// =========================================================
// Approved Products tab — Visual Insights
// =========================================================
//
// The Approved-Products slice of the former Analytical Insights page,
// extracted into its own tab. It mirrors CandidatesTab — the same KPI/stat
// cards, Top-5 diseases and Top-5 product-types charts, and a server-paginated
// DataTable — but is scoped to the 'Product' candidate type and adds three
// regulatory charts (approval status, approving authorities, WHO
// prequalification) that only the approved view shows.
//
// Like CandidatesTab, every data hook is threaded with the five global filters
// from useGlobalFilters() so the view reacts to the shared filter bar, and the
// tab owns no slide-in state — row Explore actions call onExplore(type, key).

// The original page kept WHO-prequalification slice colours as a page local.
// Recreated here so the donut keeps its named-status palette; any status not
// in this map falls back to the shared STATUS_COLORS cycle.
const WHO_PREQUAL_COLORS = { Yes: '#fe7449', No: '#e3d6c1', Unknown: '#B28FC9', Pending: '#54A5C4', 'N/A': '#8DD6A9' };

const approvedFilterSerializer = makeFilterSerializer(APPROVED_PRODUCT_COLUMNS);

export default function ApprovedProductsTab({ onExplore }) {
  const { healthArea, primary, secondary, expandedProduct, rdPhase } = useGlobalFilters();

  // Per-table filter / sort / visible-columns / page state lives in the URL,
  // namespaced per tab (`f.approved`, `s.approved`, …) so it survives tab
  // switches and is shareable, matching the portfolio-analysis convention. The
  // filter serializer debounces text-input writes by 500ms.
  const [approvedPage, setApprovedPage] = useUrlState('aPage', 1, numberSerializer);
  const [approvedFilters, setApprovedFilters] = useUrlState('f.approved', {}, approvedFilterSerializer);
  const [approvedSort, setApprovedSort] = useUrlState('s.approved', null, sortSerializer);
  const [approvedVisibleCols, setApprovedVisibleCols] = useUrlState('cols.approved', [], arraySerializer);

  // PNG-capture refs for the two top-5 charts and the three regulatory charts.
  const diseasesChartRef = useRef(null);
  const productsChartRef = useRef(null);
  const approvalStatusRef = useRef(null);
  const authoritiesRef = useRef(null);
  const whoPrequalRef = useRef(null);

  // =========================================================
  // API hooks (all scoped to 'Product' and the global filters)
  // =========================================================

  const { raw: kpisRaw } = usePortfolioKPIs(
    healthArea, primary, secondary, expandedProduct, rdPhase,
  );

  // GHA summaries feed the per-Global-Health-Area stat cards.
  const { bubbleData: ghaSummaries } = useGlobalHealthAreaSummaries(['Product'], {
    globalHealthAreas: healthArea,
    primaryDiseaseNames: primary,
    secondaryDiseaseNames: secondary,
    productNames: expandedProduct,
    phaseNames: rdPhase,
  });

  // Disease summaries feed the Top 5 diseases chart.
  const { bubbleData: diseaseBubble, loading: diseasesLoading } = useDiseaseSummaries(['Product'], {
    globalHealthAreas: healthArea,
    primaryDiseaseNames: primary,
    secondaryDiseaseNames: secondary,
    productNames: expandedProduct,
    phaseNames: rdPhase,
  });

  // Product distribution feeds the Top 5 product types chart.
  const { chartData: productChartData, loading: productsLoading } = useProductDistribution(
    healthArea, primary, secondary, expandedProduct, rdPhase, 'Product',
  );

  // Regulatory distribution feeds the three approved-only charts.
  const {
    approvalStatus: approvalStatusData,
    whoPrequalification: whoPrequalData,
    approvingAuthorities: approvingAuthoritiesData,
    loading: regulatoryLoading,
  } = useRegulatoryDistribution(healthArea, primary, secondary, expandedProduct, rdPhase);

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

  // Attach a colour to each WHO-prequalification slice for the donut + legend.
  const coloredWhoPrequal = useMemo(() =>
    (whoPrequalData || []).map((d, i) => ({
      ...d,
      color: WHO_PREQUAL_COLORS[d.name] || STATUS_COLORS[i % STATUS_COLORS.length],
    })),
    [whoPrequalData],
  );

  const statCards = useMemo(
    () => buildGhaStatCards(ghaSummaries, {
      total: kpisRaw?.approvedProducts ?? 0,
      totalLabel: 'Total approved products',
      countFn: (g) => g.productCount,
      tooltips: KPI_TOOLTIPS.approved,
    }),
    [kpisRaw, ghaSummaries],
  );

  // =========================================================
  // Approved-products DataTable (server-side pagination)
  // =========================================================

  const approvedColumnFilters = useMemo(() => {
    const base = toColumnFilters(approvedFilters) || [];
    return base.length > 0 ? base : undefined;
  }, [approvedFilters]);
  const approvedSortVar = useMemo(() => toColumnSort(approvedSort), [approvedSort]);

  const {
    candidates: approvedData,
    totalCount: approvedTotalCount,
    hasNextPage: approvedHasNext,
    loading: approvedDataLoading,
  } = usePortfolioCandidates(
    {
      candidateType: 'Product',
      columnFilters: approvedColumnFilters,
      globalHealthAreas: healthArea,
      primaryDiseaseNames: primary,
      secondaryDiseaseNames: secondary,
      productNames: expandedProduct,
      phaseNames: rdPhase,
    },
    ITEMS_PER_PAGE,
    (approvedPage - 1) * ITEMS_PER_PAGE,
    { sort: approvedSortVar },
  );

  const approvedColumns = useMemo(
    () => buildApprovedProductColumns({
      onExplore: (row) => onExplore('product', row.candidate_key),
    }),
    [onExplore],
  );

  // Filter context lets the DataTable resolve category-filter options against
  // the same product scope and active column filters.
  const approvedFilterContext = useMemo(() => ({
    candidate_type: 'Product',
    column_filters: approvedColumnFilters,
  }), [approvedColumnFilters]);

  return (
    <>
      <p className="text-sm text-gray-500 mb-6">
        {t('pipeline_explorer.visual_insights.approved.intro')}
      </p>

      <KpiStatCards cards={statCards} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <TopFiveDiseasesChart
          data={top5Diseases}
          title={TAB_LABELS.approved.disease}
          description={TAB_DESCRIPTIONS.approved.disease}
          loading={diseasesLoading}
          chartRef={diseasesChartRef}
          onDownloadPNG={() => downloadPNG(diseasesChartRef, 'top-5-diseases')}
          axisLabel={t('pipeline_explorer.visual_insights.approved.top5_disease.x_axis')}
        />
        <TopFiveProductTypesChart
          data={top5Products}
          title={TAB_LABELS.approved.product}
          description={TAB_DESCRIPTIONS.approved.product}
          loading={productsLoading}
          chartRef={productsChartRef}
          onDownloadPNG={() => downloadPNG(productsChartRef, 'top-5-product-types')}
          axisLabel={t('pipeline_explorer.visual_insights.approved.top5_product.x_axis')}
        />
      </div>

      {/* Regulatory charts (approved-only) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Approval status */}
        <div className="bg-white border border-gray-200 p-4">
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-base sm:text-lg font-bold text-black">{t('pipeline_explorer.visual_insights.approved.approval_status.title')}</h3>
            <ChartMenu
              onDownloadCSV={() => {
                const columns = [
                  { label: 'Approval status', accessor: 'name' },
                  { label: 'Count', accessor: 'value' },
                ];
                downloadCSV(buildCSV(columns, approvalStatusData || []), 'approval-status');
              }}
              onDownloadPNG={() => downloadPNG(approvalStatusRef, 'approval-status')}
            />
          </div>
          <p className="text-sm text-gray-500 mb-4">
            {t('pipeline_explorer.visual_insights.approved.approval_status.description')}
          </p>
          <div ref={approvalStatusRef}>
            {regulatoryLoading ? (
              <div className="h-[280px] flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading...</div></div>
            ) : !approvalStatusData || approvalStatusData.length === 0 ? (
              <ChartEmptyState variant="bar" height={280} />
            ) : (
              <ChartBarChart
                data={approvalStatusData}
                height={340}
                maxTickChars={999}
                tickAngle={-40}
                xAxisLabel=""
                yAxisLabel={t('pipeline_explorer.visual_insights.approved.approval_status.y_axis')}
              />
            )}
          </div>
        </div>

        {/* Approving Authorities */}
        <div className="bg-white border border-gray-200 p-4">
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-base sm:text-lg font-bold text-black">{t('pipeline_explorer.visual_insights.approved.approving_auth.title')}</h3>
            <ChartMenu
              onDownloadCSV={() => {
                const columns = stackedCSVColumns(
                  { label: 'Authority', accessor: 'category' },
                  APPROVING_AUTH_PHASES,
                );
                downloadCSV(buildCSV(columns, approvingAuthoritiesData || []), 'approving-authorities');
              }}
              onDownloadPNG={() => downloadPNG(authoritiesRef, 'approving-authorities')}
            />
          </div>
          <p className="text-sm text-gray-500 mb-4">
            {t('pipeline_explorer.visual_insights.approved.approving_auth.description')}
          </p>
          <div ref={authoritiesRef}>
            {regulatoryLoading ? (
              <div className="h-[280px] flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading...</div></div>
            ) : !approvingAuthoritiesData || approvingAuthoritiesData.length === 0 ? (
              <ChartEmptyState variant="stackedBar" height={280} />
            ) : (
              <StackedBarChart
                data={approvingAuthoritiesData}
                phases={APPROVING_AUTH_PHASES}
                categoryKey="category"
                layout="horizontal"
                height={280}
                maxTickChars={999}
                xAxisLabel={t('pipeline_explorer.visual_insights.approved.approving_auth.x_axis')}
                yAxisLabel={t('pipeline_explorer.visual_insights.approved.approving_auth.y_axis')}
                showFilters={true}
                barRadius={0}
              />
            )}
          </div>
        </div>

        {/* WHO prequalification */}
        <div className="bg-white border border-gray-200 p-4">
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-base sm:text-lg font-bold text-black">{t('pipeline_explorer.visual_insights.approved.who_prequal.title')}</h3>
            <ChartMenu
              onDownloadCSV={() => {
                const columns = [
                  { label: 'Status', accessor: 'name' },
                  { label: 'Count', accessor: 'value' },
                ];
                downloadCSV(buildCSV(columns, whoPrequalData || []), 'who-prequalification');
              }}
              onDownloadPNG={() => downloadPNG(whoPrequalRef, 'who-prequalification')}
            />
          </div>
          <p className="text-sm text-gray-500 mb-4">
            {t('pipeline_explorer.visual_insights.approved.who_prequal.description')}
          </p>
          <div ref={whoPrequalRef}>
            {regulatoryLoading ? (
              <div className="h-[220px] flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading...</div></div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={coloredWhoPrequal} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={2}>
                      {coloredWhoPrequal.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<DonutTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-4 mt-3">
                  {coloredWhoPrequal.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <h3 className="text-base sm:text-lg font-bold text-black">{t('pipeline_explorer.visual_insights.approved.table.title')}</h3>
          <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">{approvedTotalCount.toLocaleString()}</span>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          {t('pipeline_explorer.visual_insights.approved.table.description')}
        </p>
        <DataTable
          tableId="vi-approved"
          graphqlTable="PORTFOLIO_CANDIDATES"
          filterContext={approvedFilterContext}
          columns={approvedColumns}
          data={approvedData || []}
          rowKey="candidate_key"
          page={approvedPage}
          onPageChange={setApprovedPage}
          totalCount={approvedTotalCount}
          hasNextPage={approvedHasNext}
          itemsPerPage={ITEMS_PER_PAGE}
          loading={approvedDataLoading}
          filters={approvedFilters}
          onFiltersChange={(next) => { setApprovedFilters(next); setApprovedPage(1); }}
          sort={approvedSort}
          onSortChange={(next) => { setApprovedSort(next); setApprovedPage(1); }}
          visibleColumns={approvedVisibleCols}
          onVisibleColumnsChange={setApprovedVisibleCols}
          emptyState={{ title: t('pipeline_explorer.visual_insights.approved.table.empty') }}
        />
      </div>
    </>
  );
}
