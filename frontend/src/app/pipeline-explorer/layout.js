'use client';

// =========================================================
// Pipeline Explorer — shared route layout
// =========================================================
//
// Hosts the chrome common to both Pipeline Explorer routes: the page
// header (title + intro + Share) and the Visual Insights / Table Builder
// toggle. The layout is route-aware: Visual Insights (the default route)
// keeps the global filter bar in the header, while Table Builder revives
// the pre-split design where filters live inline inside each table card —
// so the bar is dropped and a different intro is shown. Global filter
// state lives in the root GlobalFiltersProvider + the URL, so the bar
// unmounting on the way to Table Builder (and remounting on the way back)
// loses nothing. Each child page.js renders only its view body.

import { usePathname } from 'next/navigation';

import Sidebar from '@/components/layout/Sidebar';
import PageHeader from '@/components/layout/PageHeader';
import ViewToggle from '@/components/pipeline-explorer/ViewToggle';
import { GlobalFilterBar, useGlobalFilters } from '@/components/global-filters';

// Visual Insights intro: what the two views are, then how
// filters/sharing/tables behave. PageHeader renders an array as
// separate <p> blocks.
const VISUAL_INSIGHTS_INTRO = [
  'Pipeline Explorer offers two complementary views of the pipeline. The visual insights view presents interactive charts across candidates, approved products, clinical trials and technology types; switch to the table builder view to assemble a custom dataset and export it as .csv.',
  'Filters apply across the whole portal — they stay active as you move between pages, tabs and the table builder, and remain until you clear them, from the global filter menu at the top or the active-filter box at the lower left. Use Share this view to copy a link with your filters preserved. On every table you can sort by any column, use the Columns button (top right) to show, hide or reorder columns, and follow the Explore → link on any row to open the full record for that entity.',
];

// Table Builder intro: the custom-table builder framing, reusing the
// same cross-portal filtering sentence as Visual Insights — filters now
// persist across every page, so both views describe them identically.
const TABLE_BUILDER_INTRO = [
  'Build custom tables of candidates, approved products, clinical trials and R&D priorities, then export as CSV. Filters apply across the whole portal — they stay active as you move between pages, tabs and the table builder, and remain until you clear them, from the global filter menu at the top or the active-filter box at the lower left. Use Share this view to copy a link with your filters preserved. On every table you can sort by any column and use the Columns button (top right) to show, hide or reorder columns.',
];

export default function PipelineExplorerLayout({ children }) {
  const globalFilters = useGlobalFilters();
  const pathname = usePathname();

  // Table Builder is the only sub-route; everything else under
  // /pipeline-explorer is the default Visual Insights view. Match the
  // exact path or a deeper segment (trailing-slash guard), mirroring
  // ViewToggle's active-route logic.
  const isTableBuilder =
    pathname === '/pipeline-explorer/table-builder' ||
    pathname?.startsWith('/pipeline-explorer/table-builder/');

  const intro = isTableBuilder ? TABLE_BUILDER_INTRO : VISUAL_INSIGHTS_INTRO;

  return (
    <div className="flex h-[calc(100vh-90px)] bg-cream-200">
      <Sidebar />

      <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header band: title + intro + Share, then the view toggle.
              When the filter bar is present it supplies the bottom margin
              (mb-8); when it's absent (Table Builder) the band carries
              that spacing itself. */}
          <div
            className={`flex flex-col gap-6 bg-white p-4 sm:p-6 lg:px-8 -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 ${
              isTableBuilder ? 'mb-8' : 'mb-0'
            }`}
          >
            <PageHeader title="Pipeline Explorer" description={intro} />
            <ViewToggle />
          </div>

          {!isTableBuilder && (
            <GlobalFilterBar filters={globalFilters} showRdPhase />
          )}

          {children}
        </div>
      </main>
    </div>
  );
}
