'use client';

// =========================================================
// WHO Priority alignment page
// =========================================================
//
// Page chrome (sidebar + page-header band) + sticky working filter
// row + Priorities overview section. The filter bar replaces the
// inert placeholder shipped in the shell, and the section card
// below it mirrors the Home page's WHO Priority Alignment grid with
// the addition of the `List of Priorities` card under disease or
// product filters.

import Sidebar from '@/components/layout/Sidebar';
import PageHeader from '@/components/layout/PageHeader';
import {
  WhoFilterBar,
  PrioritiesOverviewSection,
  IndividualPriorityAnalysisSection,
} from '@/components/who-priority-alignment';

const INTRO =
  'The WHO product-development priorities for the diseases this portal covers, with the R&D pipeline mapped against each one. Filters apply across the whole portal — use them to scope by global health area, disease or product type; your selection stays active as you move between pages and remains until you clear it, from the global filter menu at the top or the active-filter box at the lower left.';

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
              description={INTRO}
            />
          </div>

          <WhoFilterBar />
          <PrioritiesOverviewSection />
          <IndividualPriorityAnalysisSection />
        </div>
      </main>
    </div>
  );
}
