'use client';

import { useState, useRef, useEffect } from 'react';
import { Columns as ColumnsIcon, GripVertical as GripVerticalIcon } from 'lucide-react';

// =========================================================
// ColumnsPopover
// =========================================================
//
// Single popover above the table for managing column visibility AND order.
// Each row has a checkbox (visibility) and a drag handle (reorder).
//
// Position-based freeze: the first row in `visibleColumns` IS the frozen
// column. Its visibility checkbox is rendered checked + disabled — to hide
// it the user must first drag a different column above it. Drag handles
// are always enabled (otherwise the user couldn't change which column is
// frozen). Columns flagged `hideable: false` also render their checkbox
// disabled, regardless of position.
//
// Output `visibleColumns` is the ordered array of accessor strings reflecting
// the user's choices. The orchestrator reconciles this with the static
// `columns` config to render headers in the right order.
//
// Drag-reorder uses native HTML5 events (no @dnd-kit) — same ~30-line
// pattern as `extract/page.js:278-305`. Live-preview reorder during drag:
// the visible-columns array updates immediately so the user sees the new
// order while still dragging; on drop we just clear local state.

export default function ColumnsPopover({
  columns,                 // full column config (all accessors)
  visibleColumns,          // ordered array of visible accessor strings
  onChange,                // (newOrderedVisibleAccessors) => void
}) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);

  const draggedRef = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);

  // Compute the popover's row order: visibleColumns first (in their order),
  // then hidden columns (in their config order). Only visible rows are
  // draggable — hidden rows are static placeholders at the bottom.
  const allAccessors = columns.map((c) => c.accessor);
  const visibleSet = new Set(visibleColumns);
  const hidden = allAccessors.filter((a) => !visibleSet.has(a));
  const rowOrder = [...visibleColumns, ...hidden];

  // Click-outside dismisses the popover.
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const handleDragStart = (accessor) => {
    draggedRef.current = accessor;
  };

  const handleDragOver = (e, targetAccessor) => {
    e.preventDefault(); // required to allow `drop`.
    const draggedId = draggedRef.current;
    if (!draggedId || draggedId === targetAccessor) return;
    if (!visibleSet.has(draggedId) || !visibleSet.has(targetAccessor)) return;
    setDragOverId(targetAccessor);
    const fromIndex = visibleColumns.indexOf(draggedId);
    const toIndex = visibleColumns.indexOf(targetAccessor);
    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;
    const next = [...visibleColumns];
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, draggedId);
    onChange(next);
  };

  const handleDragEnd = () => {
    draggedRef.current = null;
    setDragOverId(null);
  };

  // Append every accessor not in `visibleColumns`, in `columns` config
  // order. Preserves the existing visible order. Membership check (not a
  // length compare) so stale accessors in `visibleColumns` don't trip
  // the all-visible guard.
  const allVisible = columns.every((c) => visibleSet.has(c.accessor));
  const handleSelectAll = () => {
    if (allVisible) return;
    const missing = allAccessors.filter((a) => !visibleSet.has(a));
    onChange([...visibleColumns, ...missing]);
  };

  // Survivors = the column currently at index 0 (positional freeze) +
  // every column with `hideable: false`. Frozen column stays at index 0;
  // remaining locked columns follow in `columns` config order.
  const frozenAccessor = visibleColumns[0];
  const lockedAccessors = columns
    .filter((c) => c.hideable === false && c.accessor !== frozenAccessor)
    .map((c) => c.accessor);
  const clearSurvivors = frozenAccessor
    ? [frozenAccessor, ...lockedAccessors]
    : lockedAccessors;
  const hasTogglableVisible = visibleColumns.some(
    (a) => !clearSurvivors.includes(a),
  );
  const handleClear = () => {
    if (!hasTogglableVisible) return;
    onChange(clearSurvivors);
  };

  const toggle = (accessor) => {
    const next = new Set(visibleSet);
    if (next.has(accessor)) next.delete(accessor);
    else next.add(accessor);
    // Preserve current visible order; newly-visible accessors append.
    const ordered = visibleColumns.filter((a) => next.has(a));
    if (next.has(accessor) && !visibleSet.has(accessor)) ordered.push(accessor);
    onChange(ordered);
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="px-3 py-1.5 text-xs text-black border border-gray-200 rounded bg-white hover:border-orange-500 flex items-center gap-1"
      >
        <ColumnsIcon className="w-3 h-3" />
        Columns
      </button>

      {open && (
        <div className="absolute z-50 mt-1 right-0 w-72 max-h-96 overflow-y-auto bg-white border border-gray-200 rounded shadow-lg">
          <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-3 py-2 border-b border-gray-200">
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={allVisible}
              className={`text-xs border-none bg-transparent ${
                allVisible
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-orange-500 hover:underline cursor-pointer'
              }`}
            >
              Select all
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={!hasTogglableVisible}
              className={`text-xs border-none bg-transparent ${
                !hasTogglableVisible
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-orange-500 hover:underline cursor-pointer'
              }`}
            >
              Clear
            </button>
          </div>
          {rowOrder.map((accessor, index) => {
            const col = columns.find((c) => c.accessor === accessor);
            if (!col) return null;
            const isVisible = visibleSet.has(accessor);
            // Position-based freeze: the row at visible-order index 0 is
            // the frozen column. Its visibility cannot be toggled until
            // the user drags a different column into first place.
            const isFrozen = isVisible && index === 0;
            const isCheckboxLocked = isFrozen || col.hideable === false;
            const isDragOver = dragOverId === accessor;
            return (
              <div
                key={accessor}
                draggable={isVisible}
                onDragStart={() => handleDragStart(accessor)}
                onDragOver={(e) => handleDragOver(e, accessor)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs border-b border-gray-100 last:border-b-0 hover:bg-gray-50 ${
                  isDragOver ? 'bg-orange-50 outline outline-1 outline-orange-300' : ''
                } ${isVisible ? 'cursor-grab' : ''}`}
                aria-grabbed={draggedRef.current === accessor || undefined}
              >
                <GripVerticalIcon
                  className={`w-3 h-3 ${isVisible ? 'text-gray-400' : 'text-gray-200'}`}
                  aria-hidden="true"
                />
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={() => !isCheckboxLocked && toggle(accessor)}
                  disabled={isCheckboxLocked}
                  className="accent-orange-500"
                  aria-label={
                    isFrozen
                      ? `${col.header} (frozen — drag a different column to first place to hide)`
                      : col.header
                  }
                />
                <span
                  className={`flex-1 truncate ${
                    isCheckboxLocked ? 'text-gray-400' : 'text-black'
                  }`}
                >
                  {col.header}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
