'use client';

// =========================================================
// Pipeline Overview page
// =========================================================
//
// Re-hosts the "Explore" half of the Portfolio Analysis page — the
// KPI cards, the Global pipeline overview stacked bar, and the
// Product types donut — under its own /pipeline-overview route with
// the four global filters. The Aggregated portfolio section is
// intentionally dropped, so none of the scroll-spy / URL-hash
// machinery from the old combined page is needed here: this page is
// just the header band, the filter bar, and one section.

import Sidebar from '@/components/layout/Sidebar';
import { GlobalFilterBar, useGlobalFilters } from '@/components/global-filters';
import PageHeader from '@/components/layout/PageHeader';
import PipelineOverviewSection from '@/components/pipeline-overview/PipelineOverviewSection';

const INTRO =
  'An interactive overview of the global health R&D pipeline by global health area, disease, product type and R&D stage. Page-level filters scope every chart here. Use Share this view to copy a link with your filters preserved.';

export default function PipelineOverviewPage() {
  const globalFilters = useGlobalFilters();

  return (
    <div className="flex h-[calc(100vh-74px)] bg-cream-200">
      <Sidebar />

      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Page header band */}
          <div className="flex flex-col gap-6 bg-white p-4 sm:p-6 lg:px-8 -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 mb-0">
            <PageHeader title="Pipeline overview" description={INTRO} />
          </div>

          <GlobalFilterBar filters={globalFilters} />

          <PipelineOverviewSection />
        </div>
      </main>
    </div>
  );
}
