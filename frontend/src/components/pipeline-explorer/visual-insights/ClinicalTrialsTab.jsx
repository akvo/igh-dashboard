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
  useGlobalHealthAreaSummaries,
  useDiseaseSummaries,
  useClinicalTrialStats,
  useGeographicDistribution,
  useClinicalTrials,
} from '@/graphql/hooks';
import { buildClinicalTrialColumns, CLINICAL_TRIAL_COLUMNS } from '@/lib/exploreColumnConfig';
import { toColumnFilters, toColumnSort } from '@/lib/dataTableGraphQL';
import { useUrlState } from '@/lib/useUrlState';
import { arraySerializer, numberSerializer } from '@/lib/url-serializers';
import { sortSerializer, makeFilterSerializer } from '@/lib/dataTableUrl';
import { displayHealthArea } from '@/lib/transformations/constants';
import { downloadPNG } from '@/lib/png';
import { WorldMap } from '@/components/charts';
import { DataTable, ChartMenu, Dropdown } from '@/components/ui';
import { KpiStatCards } from './shared/KpiStatCards';
import { TopFiveDiseasesChart } from './shared/TopFiveDiseasesChart';
import { TopFiveProductTypesChart } from './shared/TopFiveProductTypesChart';
import {
  TAB_LABELS,
  TAB_DESCRIPTIONS,
  KPI_TOOLTIPS,
  ITEMS_PER_PAGE,
  STAT_CARD_COLORS,
  STATUS_COLORS,
  AGE_COLORS,
  BarTooltip,
  DonutTooltip,
} from './shared/primitives';

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

  // GHA summaries feed the per-Global-Health-Area stat cards. The trial view
  // still groups by candidate counts, so the summaries are scoped to
  // 'Candidate' like the candidates tab.
  const { bubbleData: ghaSummaries } = useGlobalHealthAreaSummaries(['Candidate'], {
    globalHealthAreas: healthArea,
    primaryDiseaseNames: primary,
    secondaryDiseaseNames: secondary,
    phaseNames: rdPhase,
  });

  // Disease summaries feed the Top 5 diseases chart.
  const { bubbleData: diseaseBubble, loading: diseasesLoading } = useDiseaseSummaries(['Candidate', 'Product'], {
    globalHealthAreas: healthArea,
    primaryDiseaseNames: primary,
    secondaryDiseaseNames: secondary,
    productNames: expandedProduct,
    phaseNames: rdPhase,
  });

  // Trial statistics feed the headline total, the age-groups donut, the
  // trial-status bar chart, and the Top 5 product types chart.
  const {
    totalTrials,
    statusDistribution: trialStatusData,
    ageGroupDistribution: ageGroupsData,
    productTypeDistribution: productChartData,
    loading: trialsStatsLoading,
  } = useClinicalTrialStats(healthArea, primary, secondary, expandedProduct, rdPhase);

  // Geographic distribution feeds the WorldMap. The local mapTrialStatus
  // sub-filter narrows the map by trial status; null means all statuses.
  const { mapData: clinicalTrialsMapData, loading: geoLoading } = useGeographicDistribution(
    'Trial Location',
    mapTrialStatus.length > 0 ? mapTrialStatus : null,
    healthArea, primary, secondary, expandedProduct, rdPhase,
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

  // Stat cards: a total-clinical-trials card followed by one card per GHA. The
  // total is the trial count; the per-GHA cards still count candidates.
  const statCards = useMemo(() => {
    const total = totalTrials ?? 0;
    const ghaCards = (ghaSummaries || []).map((g, i) => {
      const count = g.candidateCount;
      const pct = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
      const title = g.global_health_area ? displayHealthArea(g.global_health_area) : g.name;
      return {
        title,
        value: count,
        percentage: pct,
        color: STAT_CARD_COLORS[i % STAT_CARD_COLORS.length],
        tooltip: KPI_TOOLTIPS.trials[title],
      };
    });
    return [
      { title: 'Total clinical trials', value: total, percentage: null, tooltip: KPI_TOOLTIPS.trials.total },
      ...ghaCards,
    ];
  }, [totalTrials, ghaSummaries]);

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
        The clinical-trial layer of the pipeline — who is being studied, where, and at what stage. Two charts, a map and a searchable table cover age group, status, geography and trial-level detail.
      </p>

      <KpiStatCards cards={statCards} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <TopFiveDiseasesChart
          data={top5Diseases}
          title={TAB_LABELS.trials.disease}
          description={TAB_DESCRIPTIONS.trials.disease}
          loading={diseasesLoading}
          chartRef={diseasesChartRef}
          onDownloadPNG={() => downloadPNG(diseasesChartRef, 'top-5-diseases')}
        />
        <TopFiveProductTypesChart
          data={top5Products}
          title={TAB_LABELS.trials.product}
          description={TAB_DESCRIPTIONS.trials.product}
          loading={trialsStatsLoading}
          chartRef={productsChartRef}
          onDownloadPNG={() => downloadPNG(productsChartRef, 'top-5-product-types')}
        />
      </div>

      {/* Trial-specific charts (trials-only) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Age groups */}
        <div className="bg-white border border-gray-200 p-4">
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-base sm:text-lg font-bold text-black">Age groups in clinical trials</h3>
            <ChartMenu onDownloadPNG={() => downloadPNG(ageGroupsRef, 'age-groups')} />
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Proportion of clinical trial participants in each age bracket, highlighting which age groups are most and least represented across the portfolio.
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
            <h3 className="text-base sm:text-lg font-bold text-black">Clinical trial status</h3>
            <ChartMenu onDownloadPNG={() => downloadPNG(trialStatusRef, 'trial-status')} />
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Number of studies at each stage across the portfolio, from ongoing to completed.
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
          <h3 className="text-base sm:text-lg font-bold text-black">Geographic distribution of clinical trials</h3>
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
          <ChartMenu onDownloadPNG={() => downloadPNG(geoMapRef, 'geographic-distribution-trials')} />
        </div>
        <p className="text-sm text-gray-500 mb-4">
          The global heat map shows the country-level distribution of clinical trials, with darker shades indicating countries with higher numbers of studies, and can be filtered by clinical trial status.
        </p>
        <div ref={geoMapRef}>
          {geoLoading ? (
            <div className="h-[320px] flex items-center justify-center"><div className="animate-pulse text-gray-400">Loading map...</div></div>
          ) : (
            <WorldMap data={clinicalTrialsMapData || []} height={320} showLegend={false} />
          )}
        </div>
        <p className="text-xs text-gray-500 mt-3">Source: World Bank Official Boundaries</p>
      </div>

      <div className="bg-white border border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <h3 className="text-base sm:text-lg font-bold text-black">Selected clinical trials</h3>
          <span className="px-3 py-1 text-sm text-[#E76A42] bg-[#FE74491F]">{trialsTotalCount.toLocaleString()}</span>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          The clinical trial table is a matrix of individual studies, providing granular details such as title, clinical trial status, location, start date, URL and more. Use the per-column filters below each header to narrow results, then export the matching rows to .csv.
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
          emptyState={{ title: 'No clinical trials found' }}
        />
      </div>
    </>
  );
}
