'use client';

import { createPortal } from 'react-dom';
import { useQuery } from '@apollo/client/react';
import { XCircle } from 'lucide-react';
import { ChevronDownIcon } from '../../icons';
import { GET_DISTINCT_VALUES } from '@/graphql/queries/distinctValues';
import { usePortalPopover } from './usePortalPopover';

// =========================================================
// CategoryFilter — per-column multi-select dropdown
// =========================================================
//
// Renders a compact button summarising the current selection. Clicking
// opens a popover with a checkbox list of distinct values. The popover
// is portalled to document.body so it escapes the table's
// overflow-x-auto wrapper.
//
// Two ways to source the dropdown options:
//
//   - Server-side mode: the `distinctValues` GraphQL query is fired
//     lazily on first open (skip: !open). The orchestrator threads
//     the current filter context through (own column already
//     stripped) so dropdown values stay contextual.
//
//   - Client-side mode (`localValues` provided): the orchestrator has
//     pre-derived distinct values from the in-memory dataset. The
//     query is skipped entirely.
//
// Props:
//   column        — column accessor (string, required)
//   value         — { kind: 'category', values: string[] } | null
//   onChange      — (next: { kind: 'category', values: string[] } | null) => void
//   table         — DataTable enum: PORTFOLIO_CANDIDATES | CLINICAL_TRIALS | ...
//   filterContext — full filter context, with own column already stripped
//   localValues   — pre-derived distinct values (used in client-side mode);
//                   when provided, the GraphQL query is skipped entirely
export default function CategoryFilter({
  column,
  value,
  onChange,
  table,
  filterContext,
  localValues,
}) {
  const { triggerRef, popoverRef, open, setOpen, coords } = usePortalPopover({
    popoverWidth: 220,
  });

  const selected = new Set(value?.values ?? []);
  const summary = selected.size === 0 ? 'All' : `${selected.size} selected`;

  const useLocal = Array.isArray(localValues);

  const { data, loading, error } = useQuery(GET_DISTINCT_VALUES, {
    variables: { table, column, filter: filterContext },
    skip: useLocal || !open,
    fetchPolicy: 'cache-first',
  });

  const options = useLocal ? localValues : (data?.distinctValues ?? []);
  const showLoading = !useLocal && loading;
  const showError = !useLocal && error;

  const toggle = (v) => {
    const next = new Set(selected);
    if (next.has(v)) next.delete(v); else next.add(v);
    if (next.size === 0) onChange(null);
    else onChange({ kind: 'category', values: [...next] });
  };

  const clear = () => onChange(null);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full px-2 py-1 text-xs border rounded bg-white text-left flex items-center justify-between gap-1 ${
          selected.size > 0 ? 'border-orange-500 text-black' : 'border-gray-200 text-gray-500'
        }`}
      >
        <span className="truncate">{summary}</span>
        {selected.size > 0 ? (
          <XCircle
            className="w-3 h-3 text-gray-400 hover:text-orange-500 shrink-0"
            onClick={(e) => { e.stopPropagation(); clear(); }}
          />
        ) : (
          <ChevronDownIcon className="w-3 h-3 text-gray-400 shrink-0" />
        )}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            minWidth: 200,
            maxWidth: 240,
          }}
          className="z-50 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded shadow-lg"
        >
          {showLoading && (
            <div className="px-3 py-2 text-xs text-gray-400">Loading…</div>
          )}
          {showError && (
            <div className="px-3 py-2 text-xs text-red-500">Couldn&apos;t load options.</div>
          )}
          {!showLoading && !showError && options.length === 0 && (
            <div className="px-3 py-2 text-xs text-gray-400">No options.</div>
          )}
          {!showLoading && !showError && options.map((v) => (
            <label
              key={v}
              className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(v)}
                onChange={() => toggle(v)}
                className="accent-orange-500"
              />
              <span className="truncate">{v}</span>
            </label>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
