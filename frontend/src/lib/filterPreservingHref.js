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
//      the same top-level path segment (e.g. /portfolio-analysis and
//      /portfolio-analysis/extract both start with `portfolio-analysis`).
//      This generalises the previously hardcoded `/portfolio-analysis`
//      check so a future renamed route + its nested pages group for free.
//   3. Re-append the target's hash fragment if present.

import { GLOBAL_FILTER_KEYS } from './filterGroups';

const globalKeys = new Set(GLOBAL_FILTER_KEYS);

// First path segment, or '' for the root path. '/portfolio-analysis/extract'
// → 'portfolio-analysis'; '/' → ''.
function topSegment(path) {
  return path.split('?')[0].split('#')[0].split('/').filter(Boolean)[0] || '';
}

export function buildHref(targetHref, { pathname, params }) {
  const [targetPath, targetHash = ''] = targetHref.split('#');

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

  let href = targetPath;
  const qs = out.toString();
  if (qs) href = `${targetPath}?${qs}`;
  if (targetHash) href = `${href}#${targetHash}`;
  return href;
}
