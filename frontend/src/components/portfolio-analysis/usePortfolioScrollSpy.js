'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Watches a list of section elements inside the given scroll
// container and reports which one is currently the in-view "active"
// section.
//
// As the active section changes the hook:
//
//   1. Updates `location.hash` via `history.replaceState` so the
//      URL stays shareable. We use replaceState — not pushState —
//      so natural scrolling does NOT push entries onto the browser
//      history stack. PushState is the click path (handled by
//      <Link>) where adding an entry IS the desired UX.
//
//   2. Dispatches a synthetic `hashchange` event so consumers
//      reading the hash via `useHash()` re-render. `replaceState`
//      does not fire `hashchange` natively, so without this
//      synthetic dispatch the Sidebar wouldn't know the active
//      section changed.
//
// Returns `{ activeId, suppressUntil }`:
//
//   - activeId: the current in-view section ID. Mostly
//     informational for the page; the Sidebar reads the hash
//     directly via `useHash()` and doesn't depend on this.
//
//   - suppressUntil(ms): call before a click-driven smooth
//     scrollIntoView. While the suppression window is open the
//     spy ignores intersection changes, so it doesn't fight the
//     click by rewriting the hash to whichever section happens
//     to be passing through the active band during the animation.

export function usePortfolioScrollSpy({ rootRef, sections }) {
  const [activeId, setActiveId] = useState(null);
  const suppressUntilRef = useRef(0);
  const lastWrittenRef = useRef(null);

  const suppressUntil = useCallback((ms) => {
    suppressUntilRef.current = Date.now() + ms;
  }, []);

  useEffect(() => {
    if (!rootRef.current) return;
    // Sections may mount before this effect runs; only observe
    // those whose refs are currently attached to a DOM node.
    const entries = sections.filter((s) => s.ref.current);
    if (entries.length === 0) return;

    const observer = new IntersectionObserver(
      (records) => {
        if (Date.now() < suppressUntilRef.current) return;

        // Pick the most-visible intersecting entry. The
        // rootMargin places the trigger band in the upper third
        // of the scroll viewport, so the section whose top edge
        // crosses that band becomes the most-visible record.
        let best = null;
        for (const record of records) {
          if (!record.isIntersecting) continue;
          if (!best || record.intersectionRatio > best.intersectionRatio) {
            best = record;
          }
        }
        if (!best) return;

        const id = best.target.id;
        if (id === lastWrittenRef.current) return;
        lastWrittenRef.current = id;
        setActiveId(id);

        // "explore" is the default for /portfolio-analysis — drop
        // the hash entirely in that case so the URL stays clean
        // when the user is at the top of the page.
        const nextHash = id === 'explore' ? '' : `#${id}`;
        const url = `${window.location.pathname}${window.location.search}${nextHash}`;
        history.replaceState(null, '', url);
        window.dispatchEvent(new Event('hashchange'));
      },
      {
        root: rootRef.current,
        rootMargin: '-30% 0px -60% 0px',
        threshold: 0,
      },
    );

    for (const { ref } of entries) observer.observe(ref.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootRef, sections.length]);

  return { activeId, suppressUntil };
}
