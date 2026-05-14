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
// Returns `{ activeId, suppressUntil, consumeSpyWriteFlag }`:
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
//
//   - consumeSpyWriteFlag(): returns true (and resets the flag)
//     if the most recent hash change was a spy-driven write. The
//     page's hash effect uses this to tell click-driven hash
//     changes (user wants a scroll) from spy-driven ones (user
//     is already at the right scroll position because that's why
//     the spy fired). Without this the spy's own `hashchange`
//     dispatch would re-trigger `scrollIntoView` and fight the
//     user's natural scroll position.

export function usePortfolioScrollSpy({ rootRef, sections }) {
  const [activeId, setActiveId] = useState(null);
  const suppressUntilRef = useRef(0);
  const lastWrittenRef = useRef(null);
  const spyWriteRef = useRef(false);

  const suppressUntil = useCallback((ms) => {
    suppressUntilRef.current = Date.now() + ms;
  }, []);

  const consumeSpyWriteFlag = useCallback(() => {
    const was = spyWriteRef.current;
    spyWriteRef.current = false;
    return was;
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

        // Skip the URL write + dispatch when the location hash is
        // already what we'd write — typically on initial mount when
        // the URL came in with a hash that the spy is now "syncing"
        // its internal state to. Without this gate, spyWriteRef
        // would be set but no state change ever follows (useHash
        // sees the same value and doesn't re-render), leaving the
        // flag set indefinitely. The next click-driven hash change
        // would then run the page effect with a stale spy flag and
        // incorrectly skip its scroll — requiring the user to click
        // a second time before anything scrolls.
        if (window.location.hash === nextHash) return;

        const url = `${window.location.pathname}${window.location.search}${nextHash}`;
        // Mark this write as spy-driven BEFORE dispatching the
        // synthetic hashchange — the page's hash effect reads the
        // flag during the listener cascade triggered by the
        // dispatch below.
        spyWriteRef.current = true;
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

  return { activeId, suppressUntil, consumeSpyWriteFlag };
}
