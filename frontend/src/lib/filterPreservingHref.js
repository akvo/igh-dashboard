// =========================================================
// buildHref — filter-preserving navigation URL builder
// =========================================================
//
// Pure, React-free URL construction extracted from the Sidebar so any
// filter-preserving navigation (the Sidebar today, the planned on-page
// button-nav next) can share it.
//
// Rules:
//   1. Always carry the global filter keys (GLOBAL_FILTER_KEYS) forward,
//      across any route — they hold the app-wide filter selection.
//   2. Carry OTHER params only between sibling routes — defined as sharing
//      the same top-level path segment (e.g. /pipeline-explorer and
//      /pipeline-explorer/table-builder both start with `pipeline-explorer`).
//      The rule keys off the shared top segment rather than any single
//      hardcoded route, so a route and its nested pages group for free.
import { GLOBAL_FILTER_KEYS } from './filterGroups';

const globalKeys = new Set(GLOBAL_FILTER_KEYS);

// First path segment, or '' for the root path. '/pipeline-explorer/table-builder'
// → 'pipeline-explorer'; '/' → ''.
function topSegment(path) {
  return path.split('?')[0].split('#')[0].split('/').filter(Boolean)[0] || '';
}

export function buildHref(targetHref, { pathname, params }) {
  const targetPath = targetHref.split('#')[0];

  const fromSegment = pathname ? topSegment(pathname) : '';
  const sameGroup = fromSegment !== '' && fromSegment === topSegment(targetPath);

  const out = new URLSearchParams();
  params.forEach((v, k) => {
    // Always carry global filter keys; carry other keys only between
    // same-top-segment siblings.
    if (globalKeys.has(k) || sameGroup) {
      out.set(k, v);
    }
  });

  const qs = out.toString();
  return qs ? `${targetPath}?${qs}` : targetPath;
}

// =========================================================
// buildHrefWithFilters — drill-down URL builder
// =========================================================
//
// Like buildHref, but for navigations that impose explicit filter
// values (e.g. clicking a specific disease in the drill-down panel)
// while still preserving the user's other active global filters.
//
// It carries forward ONLY the global filter keys from `params` (a
// drill-down always crosses to a different page, so sibling non-global
// params do not apply), then applies:
//   - `remove`: keys to delete outright (e.g. clear a stale secondary
//     when a new primary is chosen).
//   - `set`: a non-empty string sets the key; null/undefined/'' deletes
//     it (so an absent global-health-area leaves any preserved value).
//
// Unlike buildHref, this takes a bare `targetPath` (no query string) and
// owns the whole query, so there is no ambiguity about merging two `?`s.
export function buildHrefWithFilters(targetPath, { params, set = {}, remove = [] }) {
  const out = new URLSearchParams();
  params.forEach((v, k) => {
    if (globalKeys.has(k)) out.set(k, v);
  });
  for (const k of remove) out.delete(k);
  for (const [k, v] of Object.entries(set)) {
    if (v === null || v === undefined || v === '') out.delete(k);
    else out.set(k, v);
  }
  const qs = out.toString();
  return qs ? `${targetPath}?${qs}` : targetPath;
}
