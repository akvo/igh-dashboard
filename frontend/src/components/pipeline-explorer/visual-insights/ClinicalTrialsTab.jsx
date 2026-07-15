'use client';

import { useState, useRef, useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Bar,
} from 'recharts';
import { useGlobalFilters } from '@/components/global-filters';
import {
  useClinicalTrialStats,
  useGeographicDistribution,
  useClinicalTrials,
} from '@/graphql/hooks';
import { buildClinicalTrialColumns, CLINICAL_TRIAL_COLUMNS } from '@/lib/exploreColumnConfig';
import { toColumnFilters, toColumnSort } from '@/lib/dataTableGraphQL';
import { useUrlState } from '@/lib/useUrlState';
import { arraySerializer, numberSerializer } from '@/lib/url-serializers';
import { sortSerializer, makeFilterSerializer } from '@/lib/dataTableUrl';
import { downloadPNG } from '@/lib/png';
import { buildCSV, downloadCSV } from '@/lib/csv';
import { WorldMap } from '@/components/charts';
import { DataTable, ChartMenu, Dropdown } from '@/components/ui';
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
  AGE_COLORS,
  BarTooltip,
  DonutTooltip,
} from './shared/primitives';
import { t } from '@/content';

// =========================================================
// Clinical Trials tab — Visual Insights
// =========================================================
//
// The Clinical-Trials slice of the former Analytical Insights page, extracted
// into its own tab. Like its siblings it shows the KPI/stat cards and the
// Top-5 diseases / Top-5 product-types charts, but its trial-specific section
// replaces the regulatory charts with an age-groups donut, a trial-status bar
// chart, and a geographic WorldMap of trial locations.
//
// Two things set this tab apart from the candidate/product tabs:
//   * There is no usePortfolioKPIs call. The headline total comes from
//     `totalTrials` returned by useClinicalTrialStats, and the per-GHA stat
//     cards still count candidates (g.candidateCount) — the trial view groups
//     by health area using the same candidate-derived summaries.
//   * The geographic map carries a local trial-status sub-filter
//     (`mapTrialStatus`) that narrows the map independently of the global
//     filter bar.
//
// As with the siblings, every data hook is threaded with the five global
// filters from useGlobalFilters(), and the tab owns no slide-in state — row
// Explore actions call onExplore(type, key).

const trialsFilterSerializer = makeFilterSerializer(CLINICAL_TRIAL_COLUMNS);

export default function ClinicalTrialsTab({ onExplore }) {
  const { healthArea, primary, secondary, expandedProduct, rdPhase } = useGlobalFilters();

  // Local trial-status sub-filter for the geographic map. Empty array means
  // "all statuses"; the geo hook receives null in that case so the map is
  // unfiltered. This is map-local (not a DataTable column filter) and stays
  // local React state.
  const [mapTrialStatus, setMapTrialStatus] = useState([]);

  // Per-table filter / sort / visible-columns / page state lives in the URL,
  // namespaced per tab (`f.trials`, `s.trials`, …) so it survives tab switches
  // and is shareable, matching the portfolio-analysis convention. The filter
  // serializer debounces text-input writes by 500ms.
  const [trialsPage, setTrialsPage] = useUrlState('tPage', 1, numberSerializer);
  const [trialsFilters, setTrialsFilters] = useUrlState('f.trials', {}, trialsFilterSerializer);
  const [trialsSort, setTrialsSort] = useUrlState('s.trials', null, sortSerializer);
  const [trialsVisibleCols, setTrialsVisibleCols] = useUrlState('cols.trials', [], arraySerializer);

  // PNG-capture refs for the two top-5 charts and the three trial charts.
  const diseasesChartRef = useRef(null);
  const productsChartRef = useRef(null);
  const ageGroupsRef = useRef(null);
  const trialStatusRef = useRef(null);
  const geoMapRef = useRef(null);

  // =========================================================
  // API hooks (all threaded with the global filters)
  // =========================================================

  // Trial statistics feed the headline total, the per-GHA stat cards, the
  // age-groups donut, the trial-status bar chart, and both Top 5 charts.
  const {
    totalTrials,
    statusDistribution: trialStatusData,
    ageGroupDistribution: ageGroupsData,
    diseaseDistribution: diseaseChartData,
    productTypeDistribution: productChartData,
    ghaDistribution,
    loading: trialsStatsLoading,
  } = useClinicalTrialStats(healthArea, primary, secondary, expandedProduct, rdPhase);

  // Geographic distribution feeds the WorldMap. The local mapTrialStatus
  // sub-filter narrows the map by trial status; null means all statuses.
  // We take both shapes the hook returns: `mapData` is keyed by country code
  // for the WorldMap, while `distributionList` is the flat row list the CSV
  // export needs.
  const { mapData: clinicalTrialsMapData, distributionList: trialsGeoList, loading: geoLoading } = useGeographicDistribution(
    'Trial Location',
    mapTrialStatus.length > 0 ? mapTrialStatus : null,
    healthArea, primary, secondary, expandedProduct, rdPhase,
  );

  // =========================================================
  // Derivations
  // =========================================================

  const top5Diseases = useMemo(() => {
    if (!diseaseChartData?.length) return [];
    return [...diseaseChartData]
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map((d) => ({ name: d.name, value: d.value, gha: d.group }));
  }, [diseaseChartData]);

  const top5Products = useMemo(() => {
    if (!productChartData?.length) return [];
    return [...productChartData].sort((a, b) => b.value - a.value).slice(0, 5);
  }, [productChartData]);

  // Attach a colour to each trial-status / age-group slice for the charts and
  // legends, cycling through the shared palettes.
  const coloredTrialStatus = useMemo(() =>
    (trialStatusData || []).map((d, i) => ({ ...d, color: STATUS_COLORS[i % STATUS_COLORS.length] })),
    [trialStatusData],
  );

  const coloredAgeGroups = useMemo(() =>
    (ageGroupsData || []).map((d, i) => ({ ...d, color: AGE_COLORS[i % AGE_COLORS.length] })),
    [ageGroupsData],
  );

  const statCards = useMemo(
    () => buildGhaStatCards(ghaDistribution, {
      total: totalTrials ?? 0,
      totalLabel: 'Total clinical trials',
      countFn: (g) => g.value,
      tooltips: KPI_TOOLTIPS.trials,
    }),
    [totalTrials, ghaDistribution],
  );

  // =========================================================
  // Clinical-trials DataTable (server-side pagination)
  // =========================================================

  const trialsColumnFilters = useMemo(() => {
    const base = toColumnFilters(trialsFilters) || [];
    return base.length > 0 ? base : undefined;
  }, [trialsFilters]);
  const trialsSortVar = useMemo(() => toColumnSort(trialsSort), [trialsSort]);

  const {
    trials: trialsData,
    totalCount: trialsTotalCount,
    hasNextPage: trialsHasNext,
    loading: trialsDataLoading,
  } = useClinicalTrials(
    {
      columnFilters: trialsColumnFilters,
      globalHealthAreas: healthArea,
      primaryDiseaseNames: primary,
      secondaryDiseaseNames: secondary,
      productNames: expandedProduct,
      phaseNames: rdPhase,
    },
    ITEMS_PER_PAGE,
    (trialsPage - 1) * ITEMS_PER_PAGE,
    { sort: trialsSortVar },
  );

  const trialColumns = useMemo(
    () => buildClinicalTrialColumns({
      onExplore: (row) => onExplore('trial', row.trial_id),
    }),
    [onExplore],
  );

  // Filter context lets the DataTable resolve category-filter options against
  // the same active column filters.
  const trialsFilterContext = useMemo(() => ({
    column_filters: trialsColumnFilters,
  }), [trialsColumnFilters]);

  return (
    <>
      <p className="text-sm text-gray-500 mb-6">
        {t('pipeline_explorer.trials.intro')}
      </p>

      <KpiStatCards cards={statCards} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <TopFiveDiseasesChart
          data={top5Diseases}
          title={TAB_LABELS.trials.disease}
          description={TAB_DESCRIPTIONS.trials.disease}
          loading={trialsStatsLoading}
          chartRef={diseasesChartRef}
          onDownloadPNG={() => downloadPNG(diseasesChartRef, 'top-5-diseases')}
          axisLabel="Number of clinical trials"
        />
        <TopFiveProductTypesChart
          data={top5Products}
          title={TAB_LABELS.trials.product}
          description={TAB_DESCRIPTIONS.trials.product}
          loading={trialsStatsLoading}
          chartRef={productsChartRef}
          onDownloadPNG={() => downloadPNG(productsChartRef, 'top-5-product-types')}
          axisLabel="Number of clinical trials"
        />
      </div>

      {/* Trial-specific charts (trials-only) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Age groups */}
        <div className="bg-white border border-gray-200 p-4">
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-base sm:text-lg font-bold text-black">{t('pipeline_explorer.trials.age_groups_title')}</h3>
            <ChartMenu
              onDownloadCSV={() => {
                const columns = [
                  { label: 'Age group', accessor: 'name' },
                  { label: 'Count', accessor: 'value' },
                ];
                downloadCSV(buildCSV(columns, coloredAgeGroups), 'age-groups');
              }}
              onDownloadPNG={() => downloadPNG(ageGroupsRef, 'age-groups')}
            />
          </div>
          <p className="text-sm text-gray-500 mb-4">
            {t('pipeline_explorer.trials.age_groups_description')}
          </p>
          <div ref={ageGroupsRef}>
            {trialsStatsLoading ? (
              <div className="h-[260px] flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading...</div></div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={coloredAgeGroups} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={2}>
                      {coloredAgeGroups.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<DonutTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap items-center justify-center gap-3 mt-3">
                  {coloredAgeGroups.map((d) => (
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

        {/* Trial status */}
        <div className="bg-white border border-gray-200 p-4">
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-base sm:text-lg font-bold text-black">{t('pipeline_explorer.trials.trial_status_title')}</h3>
            <ChartMenu
              onDownloadCSV={() => {
                const columns = [
                  { label: 'Status', accessor: 'name' },
                  { label: 'Count', accessor: 'value' },
                ];
                downloadCSV(buildCSV(columns, coloredTrialStatus), 'trial-status');
              }}
              onDownloadPNG={() => downloadPNG(trialStatusRef, 'trial-status')}
            />
          </div>
          <p className="text-sm text-gray-500 mb-4">
            {t('pipeline_explorer.trials.trial_status_description')}
          </p>
          <div ref={trialStatusRef}>
            {trialsStatsLoading ? (
              <div className="h-[260px] flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading...</div></div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={coloredTrialStatus} margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<BarTooltip />} />
                    <Bar dataKey="value" barSize={32}>
                      {coloredTrialStatus.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  {coloredTrialStatus.map((d) => (
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

      {/* Geographic distribution */}
      <div className="bg-white border border-gray-200 p-4 mb-6">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-base sm:text-lg font-bold text-black">{t('pipeline_explorer.trials.geo_title')}</h3>
          <div className="flex-1" />
          <div className="min-w-[160px]">
            <Dropdown
              value={mapTrialStatus}
              onChange={setMapTrialStatus}
              options={(trialStatusData || []).map((s) => ({ value: s.name, label: s.name }))}
              placeholder="All"
              multiSelect
              showSearch={false}
              compact
            />
          </div>
          <ChartMenu
            onDownloadCSV={() => {
              const columns = [
                { label: 'Country', accessor: 'country_name' },
                { label: 'ISO code', accessor: 'iso_code' },
                { label: 'Count', accessor: 'candidateCount' },
              ];
              downloadCSV(buildCSV(columns, trialsGeoList || []), 'geographic-distribution-trials');
            }}
            onDownloadPNG={() => downloadPNG(geoMapRef, 'geographic-distribution-trials')}
          />
        </div>
        <p className="text-sm text-gray-500 mb-4">
          {t('pipeline_explorer.trials.geo_description')}
        </p>
        <div ref={geoMapRef}>
          {geoLoading ? (
            <div className="h-[320px] flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading map...</div></div>
          ) : (
            <WorldMap data={clinicalTrialsMapData || []} height={320} showLegend={false} />
          )}
        </div>
        <p className="text-xs text-gray-500 mt-3">{t('pipeline_explorer.trials.geo_source')}</p>
      </div>

      <div className="bg-white border border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <h3 className="text-base sm:text-lg font-bold text-black">{t('pipeline_explorer.trials.table_title')}</h3>
          <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">{trialsTotalCount.toLocaleString()}</span>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          {t('pipeline_explorer.trials.table_description')}
        </p>
        <DataTable
          tableId="vi-trials"
          graphqlTable="CLINICAL_TRIALS"
          filterContext={trialsFilterContext}
          columns={trialColumns}
          data={trialsData || []}
          rowKey="trial_id"
          page={trialsPage}
          onPageChange={setTrialsPage}
          totalCount={trialsTotalCount}
          hasNextPage={trialsHasNext}
          itemsPerPage={ITEMS_PER_PAGE}
          loading={trialsDataLoading}
          filters={trialsFilters}
          onFiltersChange={(next) => { setTrialsFilters(next); setTrialsPage(1); }}
          sort={trialsSort}
          onSortChange={(next) => { setTrialsSort(next); setTrialsPage(1); }}
          visibleColumns={trialsVisibleCols}
          onVisibleColumnsChange={setTrialsVisibleCols}
          emptyState={{ title: t('pipeline_explorer.trials.table_empty') }}
        />
      </div>
    </>
  );
}
