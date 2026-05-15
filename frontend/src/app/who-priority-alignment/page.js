'use client';

// =========================================================
// WHO Priority alignment page — shell + inert filter row
// =========================================================
//
// First slice of the page: sidebar + page-header band + an
// inert filter row visually matching the eventual real
// version. The cards/donuts/data fetching that fill the body
// land in a follow-up. Until then, the body below the filter
// row is intentionally empty.
//
// The filter row mirrors the styling of <GlobalFilterBar/>
// from the Portfolio Analysis page (sticky, white bg, the
// same Dropdown layout) so the eventual swap to a real
// <WhoFilterBar/> is a drop-in replacement with no layout
// shift. It carries no state, no GraphQL options, and no
// Clear behaviour — selections silently no-op (Dropdown
// guards every internal `onChange` call with `if (onChange)`,
// see Dropdown.jsx:103-115). The filter row uses three
// filters (no R&D phase), matching the WHO designer's
// screenshot.

import Sidebar from '@/components/layout/Sidebar';
import PageHeader from '@/components/layout/PageHeader';
import { Dropdown } from '@/components/ui';
import { RefreshIcon } from '@/components/icons';

export default function WhoPriorityAlignmentPage() {
  return (
    <div className="flex min-h-[calc(100vh-74px)] bg-cream-200">
      <Sidebar />

      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Page header band */}
          <div className="flex flex-col gap-6 bg-white p-4 sm:p-6 lg:px-8 -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 mb-0">
            <PageHeader
              title="WHO Priority alignment"
              description="These core priorities are anchored in the 2030 Sustainable Development Goals (SDGs) agenda and are linked to three bold targets for the health sector's contribution to the SDGs: the triple billion targets."
            />
          </div>

          {/* Inert filter row — visual placeholder. */}
          <div className="sticky top-0 z-20 bg-white -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-200 mb-8">
            <div className="flex items-end gap-4">
              <div className="min-w-[220px]">
                <Dropdown
                  label="Global health area"
                  value={[]}
                  placeholder="All"
                  options={[]}
                  multiSelect={true}
                  variant="outlined"
                />
              </div>
              <div className="min-w-[220px]">
                <Dropdown
                  label="Disease"
                  value={[]}
                  placeholder="All"
                  options={[]}
                  multiSelect={true}
                  variant="outlined"
                />
              </div>
              <div className="min-w-[220px]">
                <Dropdown
                  label="Product"
                  value={[]}
                  placeholder="All"
                  options={[]}
                  multiSelect={true}
                  variant="outlined"
                />
              </div>
              <div className="flex-1" />
              <button
                disabled
                className="flex items-center gap-2 text-sm px-4 h-[44px] whitespace-nowrap border text-gray-400 bg-gray-100 border-gray-200 cursor-not-allowed"
              >
                Clear
                <RefreshIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body intentionally empty — cards/charts land in a follow-up. */}
        </div>
      </main>
    </div>
  );
}
