'use client';

// =========================================================
// PrioritiesOverviewSection — WHO page's main section
// =========================================================
// Three-column grid matching the Home page's WHO Priority Alignment
// section: cards stack | product types donut | women/children donut.
// Column 1 reshapes based on the active filters per the rules in
// docs/superpowers/specs/2026-05-17-who-priorities-overview-design.md.
//
// Edge case — diseases with NULL global_health_area (e.g. HIV/AIDS,
// Tuberculosis): when these are selected as the sole disease filter,
// every byArea row returns totalCandidates = 0 so no GHA cards render
// in 'narrow' mode. The total card, both donuts, and the List of
// Priorities card still render with the filter applied.

import { useRef, useState, useMemo } from 'react';
import {
  PriorityShareCard,
  PriorityTotalCard,
  PriorityListCard,
  PriorityListPanel,
  ChartMenu,
} from '@/components/ui';
import { DonutChart, ChartEmptyState } from '@/components/charts';
import { buildCSV, downloadCSV as downloadCSVFile } from '@/lib/csv';
import { downloadPNG } from '@/lib/png';
import { chartColors, colors } from '@/lib/theme';
import { displayHealthArea } from '@/lib/transformations/constants';
import { usePriorityAlignment } from '@/graphql/hooks';
import { useWhoPageFilters } from './useWhoPageFilters';

// =========================================================
// Palette tokens lifted from `app/page.js` — both pages now consume
// them, so they're scoped to the section component.
// =========================================================

// Per-GHA accent for the share-card rings. Sourced from
// `chartColors.primary`; ND lands on the light purple accent, EID
// and WH share the green accent. (Diseases without a GHA never reach
// a ring, so this map is exhaustive for what byArea can return.)
const WHO_RING_COLORS = {
  'Neglected disease': chartColors.primary[1],
  'Emerging infectious disease': chartColors.primary[7],
  'Womens Health': chartColors.primary[7],
};

// Product types donut palette — Vaccines in brand orange, the rest
// stepping through the brandbook palette. DonutChart consumes the
// array positionally.
const WHO_PRODUCT_TYPE_COLORS = [
  colors.orange[500],
  chartColors.primary[1],
  chartColors.primary[2],
  chartColors.primary[3],
  chartColors.primary[4],
  chartColors.primary[5],
  chartColors.primary[0],
  chartColors.primary[6],
  chartColors.primary[7],
];

// Yes / NA / No palette for the women-or-children donut, keyed by
// slice name so a zeroed-out slice doesn't mis-map colours.
const WHO_W_OR_C_COLORS = {
  Yes: chartColors.primary[1],
  NA: chartColors.primary[3],
  No: colors.orange[500],
};

// =========================================================
// Title-pill builder
// =========================================================
// `area` has applicableDiseases / applicableProductNames already
// alphabetised by the backend, scoped to selections relevant to this
// GHA only.
//   - When any disease filter is set: pill comes from applicableDiseases.
//   - Else when product filter is set: pill comes from applicableProductNames.
//   - Else: no pill.
// Returns the full title string.

function buildCardTitle(area, hasDiseaseFilter, hasProductFilter) {
  const base = displayHealthArea(area.global_health_area);
  let pillArr = [];
  if (hasDiseaseFilter) pillArr = area.applicableDiseases ?? [];
  else if (hasProductFilter) pillArr = area.applicableProductNames ?? [];

  if (pillArr.length === 0) return base;
  const [first, ...rest] = pillArr;
  const overflow = rest.length > 0 ? ` +${rest.length}` : '';
  return `${base} | ${first}${overflow}`;
}

export default function PrioritiesOverviewSection() {
  const productTypesChartRef = useRef(null);
  const womenChildrenChartRef = useRef(null);
  const [slideInOpen, setSlideInOpen] = useState(false);

  const filters = useWhoPageFilters();

  const hasDiseaseFilter = filters.primary.length > 0 || filters.secondary.length > 0;
  const hasProductFilter = filters.product.length > 0;

  // Pass positional args matching the hook's actual signature:
  //   usePriorityAlignment(globalHealthAreas, primaryDiseaseNames, secondaryDiseaseNames, productNames)
  // Empty arrays are normalised to null so the resolver receives "no filter"
  // rather than an empty-list filter (the hook coerces null/undefined to
  // undefined internally before passing to the GraphQL variable).
  const {
    totalPriorities,
    byArea,
    candidatesWithPriorityTotal,
    productTypeChartData,
    womenOrChildrenChartData,
    priorities,
    loading,
  } = usePriorityAlignment(
    filters.healthArea.length > 0 ? filters.healthArea : null,
    filters.primary.length > 0 ? filters.primary : null,
    filters.secondary.length > 0 ? filters.secondary : null,
    filters.expandedProduct.length > 0 ? filters.expandedProduct : null,
  );

  // Filter mode drives the Column-1 reshape rule per the spec:
  //   - 'unfiltered'  → all 3 GHA cards, no list card
  //   - 'gha-only'    → only selected GHA cards, no list card
  //   - 'narrow'      → only GHAs touched by the filter (totalCandidates > 0), list card visible
  const filterMode = hasDiseaseFilter || hasProductFilter
    ? 'narrow'
    : filters.healthArea.length > 0
    ? 'gha-only'
    : 'unfiltered';

  const visibleAreas = useMemo(() => {
    if (filterMode === 'unfiltered') return byArea;
    if (filterMode === 'gha-only') {
      return byArea.filter((a) => filters.healthArea.includes(a.global_health_area));
    }
    // 'narrow': only GHAs touched by the filter. "Touched" means at least
    // one candidate in the active-pipeline snapshot falls under this GHA
    // after the disease / product filters apply. When a GHA filter is also
    // set, the backend already restricts byArea to the intersection, so
    // filtering on totalCandidates > 0 gives us the visible subset.
    return byArea.filter((a) => a.totalCandidates > 0);
  }, [filterMode, byArea, filters.healthArea]);

  const showListCard = filterMode === 'narrow';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-black">Priorities overview</h3>
          <p className="text-sm text-gray-500">
            {/* Designer to supply final copy; placeholder per spec. */}
            Lorem ipsum dolor sit amet consectetur. Rhoncus risus tortor vel nibh sed cursus.
          </p>
        </div>
      </div>
      <div className="mb-4" style={{ borderBottom: '1px solid #26262617' }} />

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_1fr] gap-4">
        {/* Column 1: stacked cards */}
        <div className="flex flex-col gap-4">
          {loading ? (
            <>
              <PriorityTotalCard loading />
              <PriorityShareCard loading />
              <PriorityShareCard loading />
              <PriorityShareCard loading />
              {filterMode === 'narrow' && <PriorityListCard loading />}
            </>
          ) : (
            <>
              <PriorityTotalCard total={totalPriorities} />
              {visibleAreas.map((area) => (
                <PriorityShareCard
                  key={area.global_health_area}
                  title={buildCardTitle(area, hasDiseaseFilter, hasProductFilter)}
                  description="Share with dedicated priority."
                  candidatesWithPriority={area.candidatesWithPriority}
                  totalCandidates={area.totalCandidates}
                  accentColor={WHO_RING_COLORS[area.global_health_area]}
                />
              ))}
              {showListCard && (
                <PriorityListCard
                  priorities={priorities}
                  onSeeAll={() => setSlideInOpen(true)}
                />
              )}
            </>
          )}
        </div>

        {/* Column 2: product types donut */}
        <div
          ref={productTypesChartRef}
          className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col"
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-base font-bold text-black">Product types</h4>
            <ChartMenu
              onDownloadCSV={() => {
                const csv = buildCSV(
                  [
                    { label: 'Product type', accessor: 'name' },
                    { label: 'Candidates', accessor: 'value' },
                  ],
                  productTypeChartData,
                );
                downloadCSVFile(csv, 'who-priority-product-types');
              }}
              onDownloadPNG={() => downloadPNG(productTypesChartRef, 'who-priority-product-types')}
            />
          </div>
          <p className="text-sm text-gray-500 mb-3">Distribution of R&D pipeline across product types.</p>
          <div className="flex-1 flex items-center justify-center">
            {loading ? (
              <div className="h-[280px] flex items-center justify-center">
                <div className="animate-pulse text-gray-400">Loading chart...</div>
              </div>
            ) : productTypeChartData.length === 0 || candidatesWithPriorityTotal === 0 ? (
              <ChartEmptyState variant="donut" height={280} />
            ) : (
              <div className="w-full">
                <DonutChart
                  data={productTypeChartData}
                  colors={WHO_PRODUCT_TYPE_COLORS}
                  height={280}
                  legendPosition="top"
                  innerRadius={50}
                  outerRadius={90}
                />
              </div>
            )}
          </div>
        </div>

        {/* Column 3: women / children donut */}
        <div
          ref={womenChildrenChartRef}
          className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col"
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-base font-bold text-black">
              Share of priorities dedicated to women or children
            </h4>
            <ChartMenu
              onDownloadCSV={() => {
                const csv = buildCSV(
                  [
                    { label: 'Category', accessor: 'name' },
                    { label: 'Count', accessor: 'value' },
                  ],
                  womenOrChildrenChartData,
                );
                downloadCSVFile(csv, 'who-priority-women-or-children');
              }}
              onDownloadPNG={() => downloadPNG(womenChildrenChartRef, 'who-priority-women-or-children')}
            />
          </div>
          <p className="text-sm text-gray-500 mb-3">
            Yes / No split with priorities still awaiting classification shown as NA.
          </p>
          <div className="flex-1 flex items-center justify-center">
            {loading ? (
              <div className="h-[280px] flex items-center justify-center">
                <div className="animate-pulse text-gray-400">Loading chart...</div>
              </div>
            ) : womenOrChildrenChartData.length === 0 || candidatesWithPriorityTotal === 0 ? (
              <ChartEmptyState variant="donut" height={280} />
            ) : (
              <div className="w-full">
                <DonutChart
                  data={womenOrChildrenChartData}
                  colors={womenOrChildrenChartData.map((slice) => WHO_W_OR_C_COLORS[slice.name])}
                  height={280}
                  legendPosition="bottom"
                  innerRadius={50}
                  outerRadius={90}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <PriorityListPanel
        isOpen={slideInOpen}
        onClose={() => setSlideInOpen(false)}
        priorities={priorities}
      />
    </div>
  );
}
