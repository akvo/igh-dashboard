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
