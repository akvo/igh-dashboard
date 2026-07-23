'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '../../icons';
import ColumnMenuPopover from './ColumnMenuPopover';
import { clickSort, shiftClickSort } from '@/lib/dataTableSort';

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
// When a column has an active filter or sort, the header text turns
// orange. Sort additionally surfaces a chevron next to the kebab so
// the direction is visible at a glance. The filter row's input itself
// can be too narrow to read on tightly packed tables (e.g.
// heatmap-style columns), so the header-level orange text is the
// user's primary signal that a filter is in effect on a column.
//
// Props:
//   columns       — visible columns in display order
//   sort          — ordered sort levels [{ column, direction }], index 0 = priority 1
//   filters       — controlled filter state, keyed by accessor
//   onSortChange  — (nextSortArray) => void
//   onHideColumn  — (column) => void
//   onReorder     — (newColumns) => void; called after a drag-to-reorder
//   scrollableRef — ref to the overflow container (for shadow detection)
export default function DataTableHeader({
  columns,
  sort = [],
  filters,
  onSortChange,
  onHideColumn,
  onReorder = () => {},
  scrollableRef,
  headerRowRef,
}) {
  const [hasOverflow, setHasOverflow] = useState(false);

  // -----------------------------------------------------------------
  // Header drag-to-reorder (native HTML5 DnD)
  // -----------------------------------------------------------------
  // Mirrors the ColumnsPopover pattern: on dragOver we splice the dragged
  // accessor into the target's slot and emit the new *visible* order via
  // onReorder (wired to onVisibleColumnsChange upstream). The order updates
  // live during the drag, so columns shift under the cursor. The column at
  // index 0 is the frozen column and is LOCKED (client requirement): it is
  // not a drag source (draggable={false}, no onDragStart) and handleDragOver
  // ignores drops targeting it, so no drag can ever displace it.
  const draggedRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const handleDragStart = (accessor) => {
    draggedRef.current = accessor;
    setDraggingId(accessor);
  };

  const handleDragOver = (e, targetAccessor) => {
    e.preventDefault(); // required to allow a drop
    const draggedId = draggedRef.current;
    if (!draggedId || draggedId === targetAccessor) return;
    const order = columns.map((c) => c.accessor);
    // Locked first column: dropping into index 0 would displace the frozen
    // column, so drops targeting it are ignored (no highlight either).
    if (targetAccessor === order[0]) return;
    setDragOverId(targetAccessor);
    const fromIndex = order.indexOf(draggedId);
    const toIndex = order.indexOf(targetAccessor);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
    const next = [...order];
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, draggedId);
    onReorder(next);
  };

  // A drag that actually started must not double as a sort click: some
  // browsers fire a click after dragend on the same element. Suppress
  // exactly the click that immediately follows a drag; the timeout
  // clears the flag before any later, unrelated click.
  const suppressClickRef = useRef(false);

  const handleDragEnd = () => {
    if (draggedRef.current) {
      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
    draggedRef.current = null;
    setDraggingId(null);
    setDragOverId(null);
  };

  const handleHeaderClick = (e, column) => {
    if (column.sortable === false) return;
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    onSortChange(
      e.shiftKey
        ? shiftClickSort(sort, column.accessor)
        : clickSort(sort, column.accessor),
    );
  };

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
    <tr ref={headerRowRef}>
      {columns.map((column, index) => {
        const isFrozen = index === 0;
        const sortIndex = sort.findIndex((s) => s.column === column.accessor);
        const isSorted = sortIndex !== -1;
        const sortDirection = isSorted ? sort[sortIndex].direction : null;
        const sortable = column.sortable !== false;
        const isFiltered = Boolean(filters?.[column.accessor]);
        const isAccented = isSorted || isFiltered;
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
            draggable={!isFrozen}
            onDragStart={isFrozen ? undefined : () => handleDragStart(column.accessor)}
            onDragOver={(e) => handleDragOver(e, column.accessor)}
            onDragEnd={handleDragEnd}
            onClick={(e) => handleHeaderClick(e, column)}
            aria-grabbed={draggingId === column.accessor || undefined}
            className={`px-4 py-3 text-left text-sm font-medium text-gray-700 border-b border-gray-200 whitespace-nowrap sticky top-0 z-10 ${
              isFrozen ? (sortable ? 'cursor-pointer select-none' : '') : 'cursor-grab select-none'
            } ${
              dragOverId === column.accessor
                ? 'bg-orange-50 outline outline-1 outline-orange-300'
                : 'bg-[#FEF8EE]'
            } ${draggingId === column.accessor ? 'opacity-50' : ''}`}
            style={{ width: column.width, minWidth: column.minWidth, ...stickyStyle }}
          >
            <div className="flex items-center gap-1">
              {/* Priority badge + direction chevron. The badge number is
                  the 1-based sort level (index 0 = primary), shown for
                  any active sort so multi-sort priorities read at a
                  glance; the chevron gives the direction. The badge leads
                  the label (mockup order) so priorities line up in a
                  scannable column down the header row. */}
              {isSorted && (
                <span
                  aria-label={`Sort priority ${sortIndex + 1}`}
                  className="w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                >
                  {sortIndex + 1}
                </span>
              )}
              <span className={isAccented ? 'text-orange-500' : ''}>{column.header}</span>
              {isSorted && sortDirection === 'asc' && (
                <ChevronUpIcon
                  className="w-3 h-3 text-orange-500 shrink-0"
                  aria-label="Sorted ascending"
                />
              )}
              {isSorted && sortDirection === 'desc' && (
                <ChevronDownIcon
                  className="w-3 h-3 text-orange-500 shrink-0"
                  aria-label="Sorted descending"
                />
              )}
              {/* Drag shield: the whole header is draggable, but a drag begun
                  on the kebab must not reorder the column. This span is the
                  nearest draggable ancestor when the gesture starts here, so
                  cancelling its dragstart (and stopping propagation to the
                  <th>) keeps the menu fully clickable while blocking drags.
                  It also stops click propagation so opening the menu never
                  triggers a header sort. */}
              <span
                draggable
                onDragStart={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <ColumnMenuPopover
                  column={column}
                  sort={sort}
                  onApplySort={onSortChange}
                  onHide={() => onHideColumn(column)}
                  isFrozen={isFrozen}
                />
              </span>
            </div>
          </th>
        );
      })}
    </tr>
  );
}
