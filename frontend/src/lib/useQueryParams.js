// =========================================================
// useQueryParams — Low-level URL query parameter read/write
// =========================================================
//
// Provides a reactive view of the browser's query string using
// useSyncExternalStore (React 19). All useUrlState instances on
// a page share this single subscription, so they stay in sync.
//
// We read window.location.search directly instead of using
// Next.js useSearchParams() to avoid Suspense boundary
// requirements — safe because all pages are 'use client'.

import { useSyncExternalStore, useCallback } from 'react';

// Coalesce rapid URL updates into a single popstate notification.
// Deferring to a macrotask lets React finish batching any useState
// updates (e.g. optimistic input values) before useSyncExternalStore
// reacts to the URL change — preventing priority conflicts that
// cause input lag.
let popstateTimer = null;
function notifySubscribers() {
  clearTimeout(popstateTimer);
  popstateTimer = setTimeout(() => {
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, 0);
}

// ---- External store contract for useSyncExternalStore ----

function subscribe(callback) {
  window.addEventListener('popstate', callback);
  return () => window.removeEventListener('popstate', callback);
}

function getSnapshot() {
  return window.location.search;
}

// During SSR there is no URL; return empty string so the server
// render uses default values for all parameters.
function getServerSnapshot() {
  return '';
}

/**
 * Low-level hook that exposes [params, setParams]:
 *
 *   params    — a URLSearchParams snapshot of the current query string
 *   setParams — (updates: Record<string, string|null>, mode?) => void
 *               Set keys in the URL. Pass null to remove a key.
 *               mode: 'replace' (default) | 'push'
 */
export function useQueryParams() {
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const params = new URLSearchParams(search);

  const setParams = useCallback((updates, mode = 'replace') => {
    // Read fresh from the browser so rapid sequential calls within
    // the same event handler each see the result of the previous one.
    const current = new URLSearchParams(window.location.search);

    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === undefined) {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    }

    const newSearch = current.toString();
    const oldSearch = window.location.search.replace(/^\?/, '');

    // Skip entirely when the URL hasn't changed (e.g. resetting page
    // to 1 when already on page 1) — avoids unnecessary re-renders.
    if (newSearch === oldSearch) return;

    const newUrl = newSearch
      ? `${window.location.pathname}?${newSearch}`
      : window.location.pathname;

    if (mode === 'push') {
      window.history.pushState(null, '', newUrl);
    } else {
      window.history.replaceState(null, '', newUrl);
    }

    // pushState/replaceState do not fire popstate, so we dispatch
    // it manually. The notification is deferred to a macrotask so
    // React can finish batching any in-progress useState updates
    // before useSyncExternalStore reacts to the URL change.
    notifySubscribers();
  }, []);

  return [params, setParams];
}
