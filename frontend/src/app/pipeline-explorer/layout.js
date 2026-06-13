'use client';

// =========================================================
// Pipeline Explorer — shared route layout
// =========================================================
//
// Hosts the chrome common to both Pipeline Explorer routes: the page
// header (title + intro + Share), the Visual Insights / Table Builder
// toggle, and the global filter bar. App-router layouts persist across
// navigations between their child segments, so toggling views keeps
// this filter bar mounted (no flicker) — and the filters themselves
// live in the root GlobalFiltersProvider + the URL, so they persist
// regardless. Each child page.js renders only its view body.

import Sidebar from '@/components/layout/Sidebar';
import PageHeader from '@/components/layout/PageHeader';
import ViewToggle from '@/components/pipeline-explorer/ViewToggle';
import { GlobalFilterBar, useGlobalFilters } from '@/components/global-filters';

// Two paragraphs: what the two views are, then how filters/sharing/tables
// behave. PageHeader renders an array as separate <p> blocks.
const PAGE_INTRO = [
  'Pipeline Explorer offers two complementary views of the pipeline. The visual insights view presents interactive charts across candidates, approved products, clinical trials and technology types; switch to the table builder view to assemble a custom dataset and export it as .csv.',
  'Page-level filters stay applied as you move across the tabs or to the table builder. Use Share this view to copy a link with your filters preserved. On every table you can sort by any column, use the Columns button (top right) to show, hide or reorder columns, and follow the Explore → link on any row to open the full record for that entity.',
];

export default function PipelineExplorerLayout({ children }) {
  const globalFilters = useGlobalFilters();

  return (
    <div className="flex h-[calc(100vh-74px)] bg-cream-200">
      <Sidebar />

      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header band: title + intro + Share, then the view toggle */}
          <div className="flex flex-col gap-6 bg-white p-4 sm:p-6 lg:px-8 -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 mb-0">
            <PageHeader title="Pipeline Explorer" description={PAGE_INTRO} />
            <ViewToggle />
          </div>

          <GlobalFilterBar filters={globalFilters} showRdPhase />

          {children}
        </div>
      </main>
    </div>
  );
}
