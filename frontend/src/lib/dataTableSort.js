// =============================================================================
// DataTable multi-sort gesture transitions
// =============================================================================
//
// The sort state is an ordered array [{ column, direction: 'asc'|'desc' }]
// where index 0 is the highest priority. These pure helpers compute the
// NEXT sort state for each gesture; components stay thin.
//
// Gestures (see docs/superpowers/specs/2026-07-23-datatable-multi-sort-design.md):
//   plain click  — single-sort semantics: replaces the whole sort with this
//                  column, cycling asc → desc → none only when the column is
//                  already the sole sorted column.
//   shift+click  — level semantics: append as last level (asc) → flip to
//                  desc in place → remove the level (later levels shift up).

export function clickSort(sort, column) {
  const sole = sort.length === 1 && sort[0].column === column;
  if (!sole) return [{ column, direction: 'asc' }];
  if (sort[0].direction === 'asc') return [{ column, direction: 'desc' }];
  return [];
}

export function shiftClickSort(sort, column) {
  const idx = sort.findIndex((s) => s.column === column);
  if (idx === -1) return [...sort, { column, direction: 'asc' }];
  if (sort[idx].direction === 'asc') {
    const next = [...sort];
    next[idx] = { column, direction: 'desc' };
    return next;
  }
  return sort.filter((_, i) => i !== idx);
}

// The kebab menu is a NEXT-STATE menu: one entry showing what the next
// plain click would do, plus one showing what the next shift+click would
// do — the latter only when the outcomes differ (they coincide on the
// empty state and on the sole sorted column).
//
// `dir` is an icon hint for the rendering component:
//   'asc' | 'desc' → chevron direction, 'remove' → an X.
export function kebabSortEntries(sort, column) {
  const sole = sort.length === 1 && sort[0].column === column;

  let single;
  if (sole && sort[0].direction === 'asc') {
    single = { label: 'Sort descending', dir: 'desc', next: clickSort(sort, column) };
  } else if (sole) {
    single = { label: 'Remove sorting', dir: 'remove', next: [] };
  } else if (sort.length === 0) {
    single = { label: 'Sort ascending', dir: 'asc', next: clickSort(sort, column) };
  } else {
    // Replacing would clear other levels — say so in the label.
    single = { label: 'Sort ascending only', dir: 'asc', next: clickSort(sort, column) };
  }

  const entries = [single];
  if (sort.length > 0 && !sole) {
    const idx = sort.findIndex((s) => s.column === column);
    if (idx === -1) {
      entries.push({ label: 'Add sort level', dir: 'asc', next: shiftClickSort(sort, column) });
    } else if (sort[idx].direction === 'asc') {
      entries.push({ label: 'Sort level descending', dir: 'desc', next: shiftClickSort(sort, column) });
    } else {
      entries.push({ label: 'Remove sort level', dir: 'remove', next: shiftClickSort(sort, column) });
    }
  }
  return entries;
}

// Multi-level row comparator for client-side sorting: levels compared in
// priority order, nulls always last regardless of direction (mirrors the
// backend's NULLS LAST). Shared by DataTable's serverSide={false} path
// and the ServerSide story's backend mock.
export function compareBySortLevels(sortLevels) {
  return (a, b) => {
    for (const { column, direction } of sortLevels) {
      const av = a[column];
      const bv = b[column];
      if (av == null && bv == null) continue; // tie at this level
      if (av == null) return 1;
      if (bv == null) return -1;
      const dir = direction === 'desc' ? -1 : 1;
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? (av - bv) * dir
          : String(av).localeCompare(String(bv)) * dir;
      if (cmp !== 0) return cmp;
    }
    return 0;
  };
}
