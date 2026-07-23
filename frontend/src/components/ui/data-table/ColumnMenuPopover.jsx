'use client';

import { createPortal } from 'react-dom';
import { MoreVertical, X } from 'lucide-react';
import { ChevronDownIcon, ChevronUpIcon, EyeOffIcon } from '../../icons';
import { usePortalPopover } from './usePortalPopover';
import { kebabSortEntries } from '@/lib/dataTableSort';

// =========================================================
// ColumnMenuPopover — per-column actions menu
// =========================================================
//
// Anchored to the kebab button in the column header. The sort section is
// a NEXT-STATE menu (see kebabSortEntries): it lists what the next plain
// click and the next shift+click on this header would do, so the menu
// doubles as documentation for both gestures. Hide is disabled on the
// index-0 column (the frozen one — locked, permanently first) and on
// columns flagged `hideable: false` in their config.
//
// The popover content is portalled to document.body and positioned via
// fixed coordinates so it escapes the table's overflow-x-auto wrapper —
// otherwise it gets clipped on the leftmost columns.
//
// Props:
//   column      — column config (used for sortable / hideable defaults)
//   sort        — ordered sort levels [{ column, direction }]
//   onApplySort — (nextSortArray) => void
//   onHide      — () => void
//   isFrozen    — boolean: this column is at visible-order index 0
const ENTRY_ICONS = {
  asc: ChevronUpIcon,
  desc: ChevronDownIcon,
  remove: X,
};

export default function ColumnMenuPopover({
  column,
  sort = [],
  onApplySort,
  onHide,
  isFrozen = false,
}) {
  const { triggerRef, popoverRef, open, setOpen, coords } = usePortalPopover({
    popoverWidth: 180,
  });

  const sortable = column.sortable !== false;
  const hideable = column.hideable !== false && !isFrozen;
  const entries = sortable ? kebabSortEntries(sort, column.accessor) : [];

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
          {entries.map((entry) => {
            const Icon = ENTRY_ICONS[entry.dir];
            return (
              <button
                key={entry.label}
                type="button"
                onClick={() => handle(() => onApplySort(entry.next))}
                className="w-full px-3 py-1.5 text-xs text-left flex items-center gap-2 hover:bg-gray-50 text-black"
              >
                <Icon className="w-3 h-3" />
                {entry.label}
              </button>
            );
          })}
          {sortable && hideable && <div className="my-1 border-t border-gray-100" />}
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
