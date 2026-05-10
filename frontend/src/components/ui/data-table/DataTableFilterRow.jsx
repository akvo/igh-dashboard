'use client';

import TextFilter from './TextFilter';
import CategoryFilter from './CategoryFilter';
import NumberFilter from './NumberFilter';
import DateFilter from './DateFilter';

// Sorted, deduplicated, non-null/non-empty values for one accessor,
// computed against `rows` after filtering by every active filter
// EXCEPT the asking column's own. That keeps a category dropdown
// contextual: selecting "Tuberculosis" on GHA narrows the Disease
// dropdown to TB diseases, but the GHA dropdown itself still shows
// every GHA option so the user can change their mind.
function deriveLocalDistinctValues(rows, accessor, filters) {
  const own = filters?.[accessor];
  let pool = rows;
  for (const [otherAccessor, entry] of Object.entries(filters ?? {})) {
    if (!entry || otherAccessor === accessor) continue;
    if (entry.kind === 'text') {
      const text = (entry.text ?? '').toLowerCase();
      if (!text) continue;
      pool = pool.filter((r) =>
        String(r[otherAccessor] ?? '').toLowerCase().includes(text),
      );
    } else if (entry.kind === 'category') {
      const values = entry.values ?? [];
      if (values.length === 0) continue;
      pool = pool.filter((r) => values.includes(r[otherAccessor]));
    }
  }
  const seen = new Set();
  for (const row of pool) {
    const v = row?.[accessor];
    if (v == null || v === '') continue;
    seen.add(v);
  }
  // If the asking column already has values selected, make sure those
  // values are always present in the option list (they survived the
  // upstream filter, so a row exists somewhere). Otherwise the user
  // could end up with a selected value they can't see / unselect.
  if (own?.kind === 'category') {
    for (const v of own.values ?? []) seen.add(v);
  }
  return [...seen].sort((a, b) => String(a).localeCompare(String(b)));
}

// =========================================================
// DataTableFilterRow
// =========================================================
//
// Always-visible filter row beneath the header. Renders one filter control
// per column based on the column's `filter` config:
//   - filter: { kind: 'text' }     → TextFilter
//   - filter: { kind: 'category' } → CategoryFilter
//   - no filter config             → empty cell
//
// Per the team-leader directive, freeze is positional: the column at
// visible-order index 0 is the frozen one (sticky left:0, matching the
// header). There is no `column.freeze` config field.
//
// "Clear all filters" lives in the table toolbar (next to the columns
// selector) — not here — so it stays visible regardless of which columns
// are scrolled into view.
export default function DataTableFilterRow({
  columns,
  filters,
  onFilterChange,        // (accessor, entry|null) => void
  table,                 // DataTable enum
  filterContext,         // for distinctValues queries (fallback)
  buildContextForColumn, // (accessor) => filterContext, with own column stripped
  headerHeight,          // px height of the header row, used as sticky-top offset
  serverSide,            // when false, derive distinct values from data instead of GraphQL
  data,                  // dataset used to derive distinct values in client mode
}) {
  // Sticky-top CSS for every filter cell so the filters row stays visible
  // during vertical scroll. The frozen (index 0) cell additionally sticks
  // to the left edge for horizontal scroll.
  const baseSticky = {
    position: 'sticky',
    top: headerHeight ?? 46,
    background: '#FEF8EE',
  };

  return (
    <tr className="bg-[#FEF8EE]">
      {columns.map((column, index) => {
        const isFrozen = index === 0;
        const stickyStyle = isFrozen
          ? { ...baseSticky, left: 0, zIndex: 15 }
          : { ...baseSticky, zIndex: 9 };

        if (!column.filter) {
          return (
            <td
              key={column.accessor}
              className="px-2 py-2 border-b border-gray-200 align-top"
              style={stickyStyle}
            />
          );
        }

        return (
          <td
            key={column.accessor}
            className="px-2 py-2 border-b border-gray-200 align-top"
            style={stickyStyle}
          >
            {(() => {
              const kind = column.filter.kind;
              const entry = filters[column.accessor];
              const fire = (next) => onFilterChange(column.accessor, next);
              if (kind === 'text') {
                return (
                  <TextFilter
                    value={entry?.text ?? ''}
                    onChange={(text) =>
                      fire(text ? { kind: 'text', text } : null)
                    }
                    placeholder="Filter…"
                  />
                );
              }
              if (kind === 'number') {
                return (
                  <NumberFilter
                    value={entry ?? null}
                    onChange={fire}
                    operators={column.filter.operators}
                  />
                );
              }
              if (kind === 'date') {
                return (
                  <DateFilter
                    value={entry ?? null}
                    onChange={fire}
                    operators={column.filter.operators}
                  />
                );
              }
              // CATEGORY (default).
              return (
                <CategoryFilter
                  column={column.accessor}
                  value={entry ?? null}
                  onChange={fire}
                  table={table}
                  filterContext={
                    buildContextForColumn
                      ? buildContextForColumn(column.accessor)
                      : filterContext
                  }
                  // Two sources for the dropdown options:
                  //   1. Client-side mode (`serverSide=false`): derive
                  //      locally from the in-memory data, filtered
                  //      contextually by every other active filter.
                  //   2. Server-side mode: fall through to the GraphQL
                  //      distinctValues query (Apollo handles
                  //      loading / error / cache states).
                  localValues={
                    serverSide === false
                      ? deriveLocalDistinctValues(
                          data ?? [],
                          column.accessor,
                          filters,
                        )
                      : undefined
                  }
                />
              );
            })()}
          </td>
        );
      })}
    </tr>
  );
}
