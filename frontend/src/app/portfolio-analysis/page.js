'use client';

// =========================================================
// Portfolio Analysis combined page
// =========================================================
//
// Renders the Explore and Aggregated sections vertically on a
// single route, with URL-hash anchors at `#explore` (default,
// represented by the empty hash) and `#aggregated`. A scroll-spy
// keeps the URL hash in sync with whichever section is currently
// in view, so the Sidebar's "Portfolio analysis" and "Aggregated
// portfolio" submenus can highlight based on scroll position.
//
// Clicking a submenu drives a smooth scroll to the matching
// anchor via the hash-change effect below. The spy is suppressed
// for ~800ms during click-driven scrolls so it doesn't fight the
// click by repeatedly rewriting the hash to whichever section
// happens to be passing through the active band during the
// scroll animation.

import { useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useHash } from '@/lib/useHash';
import Sidebar from '@/components/layout/Sidebar';
import {
  ExploreSection,
  AggregatedSection,
  GlobalFilterBar,
  PortfolioPageHeader,
  usePortfolioScrollSpy,
} from '@/components/portfolio-analysis';

export default function PortfolioAnalysisPage() {
  const mainRef = useRef(null);
  const exploreRef = useRef(null);
  const aggregatedRef = useRef(null);

  const sections = useMemo(
    () => [
      { id: 'explore', ref: exploreRef },
      { id: 'aggregated', ref: aggregatedRef },
    ],
    [],
  );

  const { suppressUntil } = usePortfolioScrollSpy({
    rootRef: mainRef,
    sections,
  });

  // Click-driven scroll. When the URL hash changes — either
  // because the Sidebar fired a same-route <Link> click, or
  // because the page just mounted on a direct visit to
  // /portfolio-analysis#aggregated — smooth-scroll the matching
  // section into view. Suppress the spy briefly so it doesn't
  // overwrite the hash mid-scroll.
  const pathname = usePathname();
  const hash = useHash();
  useEffect(() => {
    if (pathname !== '/portfolio-analysis') return;
    const targetId = hash || 'explore';
    const el = document.getElementById(targetId);
    if (!el || !mainRef.current) return;

    // Skip the scroll when the target section is already in the
    // spy's active band — that's the case when (a) the spy wrote
    // the hash because the user scrolled here naturally, or (b)
    // the user clicked the link for a section they're already on.
    // Either way, snapping `block: 'start'` would visibly fight
    // the user's existing scroll position. The band corresponds
    // to the spy's rootMargin: -30% 0px -60% 0px, so a section is
    // "in the band" when its top edge sits between 0 and ~30% of
    // the container's height relative to the container.
    const containerRect = mainRef.current.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const offsetWithinContainer = elRect.top - containerRect.top;
    const inActiveBand =
      offsetWithinContainer >= 0 &&
      offsetWithinContainer <= containerRect.height * 0.3;
    if (inActiveBand) return;

    suppressUntil(800);
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [pathname, hash, suppressUntil]);

  return (
    <div className="flex h-[calc(100vh-74px)] bg-cream-200">
      <Sidebar />

      <main ref={mainRef} className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Single page header band */}
          <div className="flex flex-col gap-6 bg-white p-4 sm:p-6 lg:px-8 -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 mb-0">
            <PortfolioPageHeader
              title="Portfolio analysis"
              description="Explore the global R&D pipeline across health areas, diseases and product types through two complementary views. Use interactive charts and maps to visualize portfolio trends and apply filters (across the complete visual insights view) or switch to the table view to build a custom dataset and export it as .csv for further analysis."
            />
          </div>

          <GlobalFilterBar />

          <section id="explore" ref={exploreRef}>
            <ExploreSection />
          </section>

          <section id="aggregated" ref={aggregatedRef} className="mt-6">
            <AggregatedSection />
          </section>
        </div>
      </main>
    </div>
  );
}
