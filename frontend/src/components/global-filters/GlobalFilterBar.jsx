'use client';

// =========================================================
// <GlobalFilterBar/> — sticky row of the global filters (presentational)
// =========================================================
//
// Presentational component. Takes a `filters` object (as returned by
// useGlobalFilters or useWhoPageFilters) and a `showRdPhase` flag.
// Renders: Global health area, hierarchical Disease (primary + secondary),
// Product type, and — when showRdPhase is true — R&D phase, plus a
// trailing Clear button. Callers are responsible for supplying the
// filters object; this component does not call useGlobalFilters() itself.

import { Dropdown } from '@/components/ui';
import { RefreshIcon } from '@/components/icons';
import HierarchicalDiseaseFilter from '@/components/filters/HierarchicalDiseaseFilter';
import HierarchicalProductFilter from '@/components/filters/HierarchicalProductFilter';
import { VECTOR_CONTROL_PRODUCT_NAMES } from '@/lib/filterGroups';

export default function GlobalFilterBar({ filters, showRdPhase = true }) {
  return (
    <div
      className="sticky top-0 z-20 bg-white -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-200 mb-8"
    >
      <div className="flex items-end gap-4">
        <div className="min-w-[220px]">
          <Dropdown
            label="Global health area"
            value={filters.healthArea}
            onChange={filters.setHealthArea}
            placeholder="All"
            options={filters.healthAreaOptions}
            multiSelect={true}
            loading={filters.loading.gha}
            variant="outlined"
          />
        </div>
        <div className="min-w-[220px]">
          <HierarchicalDiseaseFilter
            label="Disease"
            hierarchy={filters.narrowedHierarchy}
            primarySelected={filters.primary}
            secondarySelected={filters.secondary}
            onChange={({ primarySelected, secondarySelected }) => {
              filters.setPrimary(primarySelected);
              filters.setSecondary(secondarySelected);
            }}
            placeholder="All"
            variant="outlined"
          />
        </div>
        <div className="min-w-[220px]">
          <HierarchicalProductFilter
            label="Product type"
            selected={filters.product}
            onChange={filters.setProduct}
            placeholder="All"
            options={filters.productOptions}
            groupMembers={VECTOR_CONTROL_PRODUCT_NAMES}
            variant="outlined"
          />
        </div>
        {showRdPhase && (
          <div className="min-w-[220px]">
            <Dropdown
              label="R&D phase"
              value={filters.rdPhase}
              onChange={filters.setRdPhase}
              placeholder="All"
              options={filters.rdPhaseOptions}
              multiSelect={true}
              loading={filters.loading.phases}
              variant="outlined"
            />
          </div>
        )}
        <div className="flex-1" />
        <button
          onClick={filters.clearAll}
          disabled={!filters.hasFilters}
          className={`flex items-center gap-2 text-sm px-4 h-[44px] whitespace-nowrap border ${
            filters.hasFilters
              ? 'text-[#262626] bg-gray-200 border-gray-300 hover:bg-gray-300 cursor-pointer font-medium'
              : 'text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed'
          }`}
        >
          Clear
          <RefreshIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
