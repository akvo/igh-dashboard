'use client';

import { useState, useEffect } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '../../icons';
import ColumnMenuPopover from './ColumnMenuPopover';

// =========================================================
// DataTableHeader
// =========================================================
//
// Renders the column header row. The column at visible-order index 0 is
// the frozen column: position: sticky, left: 0, higher z-index. The shadow
// on the right edge of the frozen cell is shown only when the table has
// horizontal overflow (otherwise it looks gratuitous on narrow tables
// that fit fully in the viewport). Treat freeze as positional state, not
// per-column config — there is no `column.freeze` field.
//
// Props:
//   columns       — visible columns in display order
//   activeSort    — { column, direction } | null
//   onSort        — (column, direction|null) => void
//   onHideColumn  — (column) => void
//   scrollableRef — ref to the overflow container (for shadow detection)
export default function DataTableHeader({
  columns,
  activeSort,
  onSort,
  onHideColumn,
  scrollableRef,
  headerRowRef,
}) {
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const el = scrollableRef?.current;
    if (!el) return;
    const check = () => setHasOverflow(el.scrollWidth > el.clientWidth);
    check();
    // ResizeObserver is missing in jsdom; fall back to a one-shot
    // measurement so component tests don't blow up on the constructor.
    if (typeof ResizeObserver === 'undefined') return;
    const resizeObserver = new ResizeObserver(check);
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, [scrollableRef]);

  return (
    <thead>
      <tr ref={headerRowRef}>
        {columns.map((column, index) => {
          const isFrozen = index === 0;
          const isSorted = activeSort?.column === column.accessor;
          const stickyStyle = isFrozen
            ? {
                position: 'sticky',
                left: 0,
                zIndex: 20,
                boxShadow:
                  hasOverflow ? '4px 0 6px -2px rgba(0,0,0,0.08)' : undefined,
              }
            : undefined;
          return (
            <th
              key={column.accessor}
              className="px-4 py-3 text-left text-sm font-medium text-gray-700 bg-[#FEF8EE] border-b border-gray-200 whitespace-nowrap sticky top-0 z-10"
              style={{ width: column.width, minWidth: column.minWidth, ...stickyStyle }}
            >
              <div className="flex items-center gap-1">
                <span className={isSorted ? 'text-orange-500' : ''}>{column.header}</span>
                {/* Sort-direction indicator beside the kebab. Only renders
                    when this column drives the active sort, so users can
                    see the order at a glance without opening the menu. */}
                {isSorted && activeSort?.direction === 'asc' && (
                  <ChevronUpIcon
                    className="w-3 h-3 text-orange-500 shrink-0"
                    aria-label="Sorted ascending"
                  />
                )}
                {isSorted && activeSort?.direction === 'desc' && (
                  <ChevronDownIcon
                    className="w-3 h-3 text-orange-500 shrink-0"
                    aria-label="Sorted descending"
                  />
                )}
                <ColumnMenuPopover
                  column={column}
                  activeSort={activeSort}
                  onSort={(direction) => onSort(column.accessor, direction)}
                  onHide={() => onHideColumn(column)}
                  isFrozen={isFrozen}
                />
              </div>
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
