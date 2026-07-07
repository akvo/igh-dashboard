'use client';

// =========================================================
// <ViewToggle/> — Visual Insights / Table Builder switch
// =========================================================
//
// The two Pipeline Explorer views are real routes, so this is a
// link-based segmented control (not the onChange-driven TabSwitcher):
// real <Link>s give us prefetch, middle-click, and proper anchor
// semantics. The active segment is derived from the pathname, and each
// href is built through useFilterPreservingHref so the four global
// filters (gha/primary/secondary/product/rdPhase) carry across the
// toggle. Styling matches components/ui/TabSwitcher for consistency.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useFilterPreservingHref } from '@/lib/useFilterPreservingHref';
import { ChartIcon, ListIcon } from '@/components/icons';

const VIEWS = [
  { value: 'visual', label: 'Visual Insights', href: '/pipeline-explorer', icon: ChartIcon },
  { value: 'table', label: 'Table Builder', href: '/pipeline-explorer/table-builder', icon: ListIcon },
];

export default function ViewToggle() {
  const pathname = usePathname();
  const buildHref = useFilterPreservingHref();

  // Table Builder is the only sub-route; everything else under
  // /pipeline-explorer is the default Visual Insights view. Match the
  // exact path or a deeper segment (trailing-slash guard) so a future
  // sibling like /pipeline-explorer/table-builder-exports can't be
  // mistaken for the Table Builder view.
  const activeValue =
    pathname === '/pipeline-explorer/table-builder' ||
    pathname?.startsWith('/pipeline-explorer/table-builder/')
      ? 'table'
      : 'visual';

  return (
    <div data-tour="pe-view-toggle" className="inline-flex self-start items-center bg-[#F2F2F4] h-9 p-0.5 gap-0.5">
      {VIEWS.map((view) => {
        const Icon = view.icon;
        const isActive = view.value === activeValue;
        return (
          <Link
            key={view.value}
            href={buildHref(view.href)}
            className={`inline-flex items-center justify-center gap-2 whitespace-nowrap px-5 h-8 text-sm transition-all duration-200 ${
              isActive
                ? 'bg-[#262626] text-white font-medium shadow-sm rounded hover:bg-[#262626]/88'
                : 'bg-transparent text-gray-400 font-normal hover:bg-white/50'
            }`}
          >
            <Icon
              className={`w-[18px] h-[18px] ${isActive ? 'text-white' : 'text-gray-400'}`}
              strokeWidth={2}
            />
            <span>{view.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
