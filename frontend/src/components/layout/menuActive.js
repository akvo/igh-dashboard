// =========================================================
// matchesItemHref — pure active-state matching for nav items
// =========================================================
//
// Extracted from Sidebar.jsx so the matching rules can be unit-tested
// without rendering the whole sidebar tree. Given a menu item's href
// and the live { pathname, match }, decide whether that item is the
// active route.

export function matchesItemHref(href, { pathname, match } = {}) {
  const itemPath = href.split('#')[0];

  // Prefix mode: one nav entry stays active across all of its
  // sub-routes (e.g. Pipeline Explorer highlights on both
  // /pipeline-explorer and /pipeline-explorer/table-builder). The
  // trailing-slash guard prevents /pipeline-explorer from also
  // matching an unrelated /pipeline-explorer-archive.
  if (match === 'prefix') {
    return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
  }

  return pathname === itemPath;
}
