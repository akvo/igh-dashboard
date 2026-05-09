'use client';

import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import { ChevronDownIcon, ChevronUpIcon, EyeOffIcon } from '../../icons';
import { usePortalPopover } from './usePortalPopover';

// =========================================================
// ColumnMenuPopover — per-column actions menu
// =========================================================
//
// Anchored to the kebab button in the column header. Single-column sort:
// clicking a Sort entry replaces any prior sort, never adds. Hide is
// disabled on the index-0 column (the frozen one — drag another column
// into first place to free this one) and on columns flagged
// `hideable: false` in their config.
//
// The popover content is portalled to document.body and positioned via
// fixed coordinates so it escapes the table's overflow-x-auto wrapper —
// otherwise it gets clipped on the leftmost columns.
//
// Props:
//   column      — column config (used for sortable / hideable defaults)
//   activeSort  — current sort { column, direction } | null
//   onSort      — (direction: 'asc'|'desc'|null) => void
//   onHide      — () => void
//   isFrozen    — boolean: this column is at visible-order index 0
export default function ColumnMenuPopover({
  column,
  activeSort,
  onSort,
  onHide,
  isFrozen = false,
}) {
  const { triggerRef, popoverRef, open, setOpen, coords } = usePortalPopover({
    popoverWidth: 180,
  });

  const isAsc =
    activeSort?.column === column.accessor && activeSort.direction === 'asc';
  const isDesc =
    activeSort?.column === column.accessor && activeSort.direction === 'desc';

  const sortable = column.sortable !== false;
  const hideable = column.hideable !== false && !isFrozen;

  const handle = (action) => {
    setOpen(false);
    action();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="ml-1 p-0.5 text-gray-400 hover:text-black"
        aria-label="Column actions"
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          style={{ position: 'fixed', top: coords.top, left: coords.left }}
          className="z-50 min-w-[160px] bg-white border border-gray-200 rounded shadow-lg py-1"
        >
          {sortable && (
            <>
              <button
                type="button"
                onClick={() => handle(() => onSort(isAsc ? null : 'asc'))}
                className={`w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 hover:bg-gray-50 ${
                  isAsc ? 'text-orange-500 font-medium' : 'text-black'
                }`}
              >
                <ChevronUpIcon className="w-3 h-3" />
                Sort ascending
              </button>
              <button
                type="button"
                onClick={() => handle(() => onSort(isDesc ? null : 'desc'))}
                className={`w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 hover:bg-gray-50 ${
                  isDesc ? 'text-orange-500 font-medium' : 'text-black'
                }`}
              >
                <ChevronDownIcon className="w-3 h-3" />
                Sort descending
              </button>
              {hideable && <div className="my-1 border-t border-gray-100" />}
            </>
          )}
          {hideable && (
            <button
              type="button"
              onClick={() => handle(onHide)}
              className="w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 hover:bg-gray-50 text-black"
            >
              <EyeOffIcon className="w-3 h-3" />
              Hide column
            </button>
          )}
          {!sortable && !hideable && (
            <div className="px-3 py-1.5 text-xs text-gray-400">No actions</div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}
