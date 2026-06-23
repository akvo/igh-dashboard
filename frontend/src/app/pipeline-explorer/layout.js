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
import { t } from '@/content';
import { Markdown } from '@/content/Markdown';

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

  // Visual Insights intro is two paragraphs rendered as markdown; Table
  // Builder intro is a single paragraph rendered as plain text.
  const intro = isTableBuilder
    ? t('pipeline_explorer.page.tb_intro')
    : <Markdown path="pipeline_explorer.page.vi_intro" className="space-y-3" />;

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
            <PageHeader title={t('pipeline_explorer.page.title')} description={intro} />
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
