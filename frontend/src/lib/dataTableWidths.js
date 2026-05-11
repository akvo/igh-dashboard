// =============================================================================
// localStorage helper for DataTable column widths
// =============================================================================
//
// Single key per table: localStorage["dataTable.<tableId>"].
// Value: { v: SCHEMA_VERSION, widths: { <accessor>: <px> } }
//
// On a breaking column-config change (rename / removal of a tracked column),
// bump SCHEMA_VERSION and saved widths for all tables are discarded on next
// load. This is preferable to a per-table version: column renames are rare
// and global, and this keeps the helper trivial.
//
// All operations are best-effort. Quota errors and malformed JSON return
// defaults silently — column widths are not load-bearing.

export const SCHEMA_VERSION = 1;

function key(tableId) {
  return `dataTable.${tableId}`;
}

export function loadWidths(tableId) {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(key(tableId));
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== SCHEMA_VERSION) return {};
    return parsed.widths ?? {};
  } catch {
    return {};
  }
}

export function saveWidths(tableId, widths) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      key(tableId),
      JSON.stringify({ v: SCHEMA_VERSION, widths }),
    );
  } catch {
    // Quota or private mode — silently drop.
  }
}
