'use client';

import { useState } from 'react';
import {
  FilterIcon,
  PlusIcon,
  CloseIcon,
} from '@/components/icons';
import { useGlobalFilters } from '@/components/global-filters';
import { useUrlState } from '@/lib/useUrlState';
import { arraySerializer, stringSerializer } from '@/lib/url-serializers';

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
    hasFilters,
    clearAll: clearGlobal,
  } = useGlobalFilters();

  // Section-local URL-state filters (home page + cross-pipeline analytics).
  // Reading them here lets the sidebar reflect all active filters regardless
  // of which page/section set them.
  const [hProduct, setHProduct] = useUrlState('hProduct', [], arraySerializer);
  const [hRdStage, setHRdStage] = useUrlState('hRdStage', [], arraySerializer);
  const [crossGha, setCrossGha] = useUrlState('crossGha', [], arraySerializer);
  const [crossProduct, setCrossProduct] = useUrlState('crossProduct', [], arraySerializer);
  const [ttYear, setTtYear] = useUrlState('ttYear', [], arraySerializer);
  const [cpYear, setCpYear] = useUrlState('cpYear', '', stringSerializer);

  // Aggregate counts across global + section-local filters per category.
  const ghaCount = healthArea.length + crossGha.length;
  const diseaseCount = primary.length + secondary.length;
  const productCount = product.length + hProduct.length + crossProduct.length;
  const rdStageCount = rdPhase.length + hRdStage.length;
  const yearCount = ttYear.length + (cpYear ? 1 : 0);

  const activeCount = ghaCount + diseaseCount + productCount + rdStageCount + yearCount;
  const hasAnyFilters = activeCount > 0;

  const clearAll = () => {
    clearGlobal();
    setHProduct([]);
    setHRdStage([]);
    setCrossGha([]);
    setCrossProduct([]);
    setTtYear([]);
    setCpYear('');
  };

  // Filter category definitions for the list view.
  const categories = [
    {
      label: 'Global health area',
      count: ghaCount,
      clear: () => { setHealthArea([]); setCrossGha([]); },
    },
    {
      label: 'Disease',
      count: diseaseCount,
      clear: () => { setPrimary([]); setSecondary([]); },
    },
    {
      label: 'Product',
      count: productCount,
      clear: () => { setProduct([]); setHProduct([]); setCrossProduct([]); },
    },
    {
      label: 'R&D stage',
      count: rdStageCount,
      clear: () => { setRdPhase([]); setHRdStage([]); },
    },
    {
      label: 'Year',
      count: yearCount,
      clear: () => { setTtYear([]); setCpYear(''); },
    },
  ];

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
          {activeCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {activeCount}
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
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors border-0 cursor-pointer"
          style={{ backgroundColor: '#262626' }}
        >
          <span className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">Filters</span>

            {activeCount > 0 && (
              <span className="text-sm font-semibold text-orange-500">{activeCount} Active</span>
            )}
          </span>
          <PlusIcon className="w-4 h-4 text-white" strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  // Expanded sidebar, open filter box.
  return (
    <div className="px-3 py-2">
      <div className="rounded-lg bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-3 pt-3 pb-2 rounded-t-lg" style={{ backgroundColor: '#262626' }}>
          <span className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">Filters</span>
            {activeCount > 0 && (
              <span className="text-sm font-semibold text-orange-500">{activeCount} Active</span>
            )}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={clearAll}
              disabled={!hasAnyFilters}
              className={`text-xs border-0 bg-transparent cursor-pointer ${
                hasAnyFilters
                  ? 'text-gray-300 hover:text-white'
                  : 'text-gray-500 cursor-not-allowed'
              }`}
            >
              Clear all
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-0.5 bg-transparent border-0 cursor-pointer text-gray-300 hover:text-white transition-colors"
            >
              <CloseIcon className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="mx-3 border-t border-orange-500" />

        {/* Filter category rows */}
        <div className="divide-y divide-white">
          {categories.map((cat) => (
            <div key={cat.label} className="flex items-center justify-between px-3 py-2.5">
              <span className="flex items-center gap-2">
                <span className="text-sm text-black">{cat.label}</span>
                {cat.count > 0 && (
                  <span className="text-sm text-orange-500">(Active - {cat.count})</span>
                )}
              </span>
              <button
                onClick={cat.clear}
                disabled={cat.count === 0}
                className={`p-0.5 bg-transparent border-0 transition-colors ${
                  cat.count > 0
                    ? 'cursor-pointer text-gray-400 hover:text-black'
                    : 'cursor-not-allowed text-gray-200'
                }`}
                title={`Clear ${cat.label}`}
              >
                <CloseIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
