'use client';

import { useState } from 'react';
import { Dropdown } from '@/components/ui';
import HierarchicalDiseaseFilter from '@/components/filters/HierarchicalDiseaseFilter';
import {
  FilterIcon,
  PlusIcon,
  CloseIcon,
} from '@/components/icons';
import { useGlobalFilters } from '@/components/portfolio-analysis';

export default function SidebarFilterBox({ isExpanded }) {
  const [isOpen, setIsOpen] = useState(false);

  return <SidebarFilterBoxInner isExpanded={isExpanded} isOpen={isOpen} setIsOpen={setIsOpen} />;
}

// Separate inner component so useGlobalFilters() is only called on
// portfolio-analysis pages (avoids unnecessary queries elsewhere).
function SidebarFilterBoxInner({ isExpanded, isOpen, setIsOpen }) {
  const {
    healthArea,
    primary,
    secondary,
    product,
    rdPhase,
    setHealthArea,
    setPrimary,
    setSecondary,
    setProduct,
    setRdPhase,
    healthAreaOptions,
    narrowedHierarchy,
    productOptions,
    rdPhaseOptions,
    hasFilters,
    clearAll,
  } = useGlobalFilters();

  // Count of filter categories that have an active selection.
  const filterCount = [
    healthArea.length > 0,
    primary.length > 0 || secondary.length > 0,
    product.length > 0,
    rdPhase.length > 0,
  ].filter(Boolean).length;

  // Total filter categories available.
  const totalCategories = 4;

  // Collapsed sidebar: just show filter icon.
  if (!isExpanded) {
    return (
      <div className="px-3 py-2">
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-sidebar-hover transition-colors bg-transparent border-0 cursor-pointer relative"
          title="Filters"
        >
          <FilterIcon className="w-5 h-5 text-sidebar-icon" strokeWidth={2.5} />
          {filterCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {filterCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  // Expanded sidebar, collapsed filter box.
  if (!isOpen) {
    return (
      <div className="px-3 py-2">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-black/[0.03] rounded-lg hover:bg-sidebar-hover transition-colors border-0 cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <span className="text-sm font-semibold text-black">Filters</span>
            <span className="text-sm font-semibold text-orange-500">{totalCategories}</span>
          </span>
          <PlusIcon className="w-4 h-4 text-sidebar-icon" strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  // Expanded sidebar, open filter box.
  return (
    <div className="px-3 py-2">
      <div className="bg-black/[0.03] rounded-lg p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="flex items-center gap-2">
            <span className="text-sm font-semibold text-black">Filters</span>
            <span className="text-sm font-semibold text-orange-500">{totalCategories}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={clearAll}
              disabled={!hasFilters}
              className={`text-xs border-0 bg-transparent cursor-pointer ${
                hasFilters
                  ? 'text-gray-600 hover:text-black'
                  : 'text-gray-300 cursor-not-allowed'
              }`}
            >
              Clear all
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-0.5 bg-transparent border-0 cursor-pointer text-sidebar-icon hover:text-black transition-colors"
            >
              <CloseIcon className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Filter dropdowns */}
        <div className="space-y-3">
          <div>
            <Dropdown
              label="Global health area"
              value={healthArea}
              onChange={setHealthArea}
              placeholder="All"
              options={healthAreaOptions}
              multiSelect={true}
              variant="outlined"
            />
          </div>
          <div>
            <HierarchicalDiseaseFilter
              label="Disease"
              hierarchy={narrowedHierarchy}
              primarySelected={primary}
              secondarySelected={secondary}
              onChange={({ primarySelected, secondarySelected }) => {
                setPrimary(primarySelected);
                setSecondary(secondarySelected);
              }}
              placeholder="All"
              variant="outlined"
            />
          </div>
          <div>
            <Dropdown
              label="Product"
              value={product}
              onChange={setProduct}
              placeholder="All"
              options={productOptions}
              multiSelect={true}
              variant="outlined"
            />
          </div>
          <div>
            <Dropdown
              label="Select R&D stage"
              value={rdPhase}
              onChange={setRdPhase}
              placeholder="Select option"
              options={rdPhaseOptions}
              multiSelect={true}
              variant="outlined"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
