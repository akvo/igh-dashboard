'use client';

// =========================================================
// <PipelineOverviewSection/> — KPIs + Global pipeline overview + Product types
// =========================================================
//
// The body of the Pipeline Overview page: the three KPI cards, the
// Global pipeline overview stacked bar, and the Product types donut.
// A copy of the Portfolio Analysis ExploreSection with page-specific
// copy, kept separate so the old page is untouched until cleanup.
//
// Owns its own page-local URL state (`productType`, `phide`) and its
// own data hooks. Reads the shared filter context via
// useGlobalFilters().

import { t } from '@/content';
import { useMemo, useRef, useState } from 'react';
import { useUrlState } from '@/lib/useUrlState';
import { arraySerializer } from '@/lib/url-serializers';
import { StatCard, Dropdown, ChartMenu } from '@/components/ui';
import { DownloadIcon } from '@/components/icons';
import { StackedBarChart, DonutChart } from '@/components/charts';
import {
  usePortfolioKPIs,
  useClinicalTrialStats,
  useProductPhaseDistribution,
  useProductDistribution,
} from '@/graphql/hooks';
import { buildCSV, downloadCSV } from '@/lib/csv';
import { downloadPNG } from '@/lib/png';
import {
  isVcpOnlySelection,
  mergeVectorControlChartData,
  mergeVectorControlStackedData,
} from '@/lib/filterGroups';
import { useGlobalFilters } from '@/components/global-filters';

// Donut chart colours — brand chart palette (from design system)
const productTypeColors = [
  '#F0B456', '#CBAFDE', '#B08888', '#E3D6C1',
  '#F9A78D', '#CC9949', '#6AB085', '#54A5C4',
  '#B28FC9', '#FFDCD1',
];

export default function PipelineOverviewSection() {
  const {
    healthArea,
    primary,
    secondary,
    rdPhase,
    expandedProduct,
  } = useGlobalFilters();

  // ===== Page-local URL state =====
  const [productTypeFilter, setProductTypeFilter] = useUrlState('productType', [], arraySerializer);
  const [pipelineHiddenPhases, setPipelineHiddenPhases] = useUrlState('phide', [], arraySerializer);

  // ===== Data hooks =====
  const { kpis, loading: kpisLoading } = usePortfolioKPIs(
    healthArea, primary, secondary, expandedProduct, rdPhase,
  );
  const { totalTrials: ongoingTrials } = useClinicalTrialStats(
    healthArea, primary, secondary, expandedProduct, rdPhase,
  );
  const { chartData: rawPipelineData, phases: pipelinePhases, loading: pipelineLoading } =
    useProductPhaseDistribution(healthArea, primary, secondary, expandedProduct, rdPhase);
  // Break the VCP umbrella into its subtypes only when the product filter is
  // drilled down to VCP subtypes exclusively; otherwise keep the merged umbrella.
  const expandVcp = isVcpOnlySelection(expandedProduct);

  const pipelineData = useMemo(
    () => (expandVcp ? rawPipelineData : mergeVectorControlStackedData(rawPipelineData)),
    [expandVcp, rawPipelineData],
  );

  // The Product types donut accepts a single optional candidateType
  // filter. The dropdown is multi-select for UX consistency, but the
  // API only narrows when exactly one option is picked.
  const candidateTypeForApi = productTypeFilter.length === 1 ? productTypeFilter[0] : undefined;
  const { chartData: rawProductTypesData, loading: productTypesLoading } = useProductDistribution(
    healthArea, primary, secondary, expandedProduct, rdPhase, candidateTypeForApi,
  );
  const productTypesData = useMemo(
    () => (expandVcp ? rawProductTypesData : mergeVectorControlChartData(rawProductTypesData)),
    [expandVcp, rawProductTypesData],
  );

  // Convert hidden-phase array (URL-friendly) into the
  // {key: boolean} visibility map that StackedBarChart expects.
  const pipelineVisiblePhases = useMemo(
    () => pipelinePhases.reduce(
      (acc, p) => ({ ...acc, [p.key]: !pipelineHiddenPhases.includes(p.key) }),
      {},
    ),
    [pipelinePhases, pipelineHiddenPhases],
  );
  const handlePipelineVisiblePhasesChange = (next) => {
    setPipelineHiddenPhases(Object.keys(next).filter((k) => !next[k]));
  };

  // PNG export targets
  const productTypesChartRef = useRef(null);
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

  // KPI value lookups
  const activeCandidates = kpis?.find((k) => k.id === 'candidates')?.value || 0;
  const approvedProducts = kpis?.find((k) => k.id === 'approved')?.value || 0;

  return (
    <>
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {kpisLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-3/4" />
              </div>
            ))}
          </>
        ) : (
          <>
            <StatCard
              title={t('pipeline_overview.kpi.candidates.title')}
              value={activeCandidates}
              description={t('pipeline_overview.kpi.candidates.description')}
              tooltip={t('pipeline_overview.kpi.candidates.tooltip')}
            />
            <StatCard
              title={t('pipeline_overview.kpi.trials.title')}
              value={ongoingTrials}
              description={t('pipeline_overview.kpi.trials.description')}
              tooltip={t('pipeline_overview.kpi.trials.tooltip')}
            />
            <StatCard
              title={t('pipeline_overview.kpi.approved.title')}
              value={approvedProducts}
              description={t('pipeline_overview.kpi.approved.description')}
              tooltip={t('pipeline_overview.kpi.approved.tooltip')}
            />
          </>
        )}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Global pipeline overview — 2 columns */}
        <div data-tour="po-legend" className="lg:col-span-2 bg-white border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-black">{t('pipeline_overview.chart.title')}</h3>
            <button
              onClick={handleExportPNG}
              disabled={exportingPNG}
              title="Export Visual"
              className="inline-flex items-center justify-center border-none bg-[#F2F2F4] cursor-pointer w-9 h-9 min-w-[36px] min-h-[36px] shrink-0 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exportingPNG ? t('pipeline_overview.chart.exporting') : t('pipeline_overview.chart.export')}
              <DownloadIcon className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            {t('pipeline_overview.chart.description')}
          </p>
          <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />
          <div ref={globalPipelineChartRef}>
            {pipelineLoading ? (
              <div className="h-[500px] flex items-center justify-center">
                <div className="animate-pulse text-gray-400">{t('pipeline_overview.chart.loading')}</div>
              </div>
            ) : (
              <StackedBarChart
                data={pipelineData}
                phases={pipelinePhases}
                layout="vertical"
                height={500}
                yAxisWidth={100}
                maxTickChars={15}
                xAxisLabel={t('pipeline_overview.chart.x_axis')}
                yAxisLabel={t('pipeline_overview.chart.y_axis')}
                showFilters={true}
                visiblePhases={pipelineVisiblePhases}
                onVisiblePhasesChange={handlePipelineVisiblePhasesChange}
              />
            )}
          </div>
        </div>

        {/* Product types — 1 column */}
        <div className="bg-white border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-black">{t('pipeline_overview.product_types.title')}</h3>
            <div className="flex items-center gap-2">
              <Dropdown
                value={productTypeFilter}
                onChange={setProductTypeFilter}
                placeholder={t('pipeline_overview.product_types.dropdown_all')}
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
            {t('pipeline_overview.product_types.description')}
          </p>
          <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />
          <div ref={productTypesChartRef}>
            {productTypesLoading ? (
              <div className="h-[500px] flex items-center justify-center">
                <div className="animate-pulse text-gray-400">{t('pipeline_overview.product_types.loading')}</div>
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
  );
}
