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
  usePortfolioScrollSpy,
} from '@/components/portfolio-analysis';
import PageHeader from '@/components/layout/PageHeader';

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

  const { suppressUntil, consumeSpyWriteFlag } = usePortfolioScrollSpy({
    rootRef: mainRef,
    sections,
  });

  // Click-driven scroll. When the URL hash changes — either
  // because the Sidebar fired a same-route <Link> click, or
  // because the page just mounted on a direct visit to
  // /portfolio-analysis#aggregated — smooth-scroll the matching
  // section into view. Suppress the spy briefly so it doesn't
  // overwrite the hash mid-scroll.
  //
  // Distinguishing click-driven from spy-driven hash changes is
  // done via `consumeSpyWriteFlag` rather than a geometry check.
  // The geometry-check approach mis-fired on initial page mount
  // (the #explore section's natural offset of ~230px is past the
  // band threshold, so a no-hash cold load would scroll past the
  // page header band — exactly what we don't want).
  //
  // Empty hash is treated as "scroll to the top of the page", not
  // "scrollIntoView on #explore" — the page header band lives
  // ABOVE #explore inside <main>, so block:'start' on #explore
  // would hide the header. `scrollTo({top: 0})` on the main
  // element shows the header + KPIs together.
  const pathname = usePathname();
  const hash = useHash();
  useEffect(() => {
    if (pathname !== '/portfolio-analysis') return;
    if (consumeSpyWriteFlag()) return;

    if (!hash) {
      mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const main = mainRef.current;
    const el = document.getElementById(hash);
    if (!main || !el) return;

    // Scroll the section to just below the pinned GlobalFilterBar.
    // `scrollIntoView({ block: 'start' })` would align the section's
    // top with the scroll-port top, but the bar is `sticky top-0`
    // inside <main> and stays pinned there — so the header would land
    // behind it. We offset by the bar's measured height (measured,
    // not hardcoded, because it tracks the filter controls, which
    // wrap/grow on narrower viewports).
    const scrollToSection = (behavior) => {
      const stickyBar = main.querySelector('[data-portfolio-filter-bar]');
      const offset = stickyBar ? stickyBar.offsetHeight : 0;
      const top =
        main.scrollTop + el.getBoundingClientRect().top - main.getBoundingClientRect().top - offset;
      main.scrollTo({ top, behavior });
    };

    // The tricky case is arriving from another route: the Explore
    // section's charts/tables mount and grow AFTER this first scroll,
    // pushing the target downward and stranding the section mid-page.
    // A single scroll therefore lands wrong. Re-pin the section every
    // time the content settles, for a bounded window, then stop so we
    // never fight the user's own scrolling. Keep the spy suppressed
    // for the whole window so it doesn't rewrite the hash mid-settle.
    const SETTLE_MS = 1500;
    suppressUntil(SETTLE_MS);
    scrollToSection('smooth');

    // ResizeObserver delivers an initial callback (current size) just
    // after observe(); skip that one so the first scroll keeps its
    // smooth animation, and only re-pin (instantly) on the genuine
    // later growth when the charts/tables actually mount.
    const content = main.firstElementChild;
    let sawInitial = false;
    const ro = new ResizeObserver(() => {
      if (!sawInitial) {
        sawInitial = true;
        return;
      }
      scrollToSection('auto');
    });
    if (content) ro.observe(content);
    const stopTimer = setTimeout(() => ro.disconnect(), SETTLE_MS);
    return () => {
      ro.disconnect();
      clearTimeout(stopTimer);
    };
  }, [pathname, hash, suppressUntil, consumeSpyWriteFlag]);

  return (
    <div className="flex h-[calc(100vh-74px)] bg-cream-200">
      <Sidebar />

      <main ref={mainRef} className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Single page header band */}
          <div className="flex flex-col gap-6 bg-white p-4 sm:p-6 lg:px-8 -mx-4 sm:-mx-6 lg:-mx-8 -mt-4 sm:-mt-6 lg:-mt-8 mb-0">
            <PageHeader
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
