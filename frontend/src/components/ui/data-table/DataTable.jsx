'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
} from '@tanstack/react-table';
import DataTableHeader from './DataTableHeader';
import StickyTableHeader from './StickyTableHeader';
import DataTableFilterRow from './DataTableFilterRow';
import ColumnsPopover from './ColumnsPopover';
import Pagination from './Pagination';
import { loadWidths, saveWidths } from '@/lib/dataTableWidths';

// =============================================================================
// DataTable — unified server-paginated table component
// =============================================================================
//
// Replaces both Table.jsx and ServerTable.jsx. Built on TanStack Table v8 in
// headless mode with manualSorting / manualFiltering / manualPagination so
// the actual data fetch stays server-driven.
//
// Filters, sort, page, visibleColumns are CONTROLLED PROPS (caller wires
// each to its own useUrlState hook). Column widths are managed internally
// via loadWidths/saveWidths.
//
// `sort` is an ordered array of levels [{ column, direction }] — index 0
// is the highest priority — or null for "unsorted". See dataTableSort.js
// for the click / shift+click gesture semantics that produce it.
//
// In addition to the controlled mode, callers can pass `serverSide={false}`
// to get a fully client-paginated/filtered/sorted experience — used by the
// Technology Types table and the home-page bubble drill-down where data is
// loaded fully client-side.
//
// Frozen column is positional: the column at visible-order index 0 is
// always the frozen one. There is no per-column `freeze` config; users
// re-arrange the order via the ColumnsPopover to choose which column
// freezes.

const DEFAULT_EMPTY_STATE = {
  title: 'No data found',
  description: 'Try clearing filters or selecting a different page.',
};

export default function DataTable({
  tableId,
  graphqlTable,            // DataTable enum value (PORTFOLIO_CANDIDATES, etc.)
  filterContext = {},      // global filter context for distinctValues queries
  columns,                 // full column config — accessor + filter + sortable + ...
  data = [],
  totalCount = 0,
  hasNextPage = false,
  loading = false,
  page = 1,
  onPageChange = () => {},
  itemsPerPage = 10,
  filters = {},
  onFiltersChange = () => {},
  sort = null,
  onSortChange = () => {},
  visibleColumns = [],
  onVisibleColumnsChange = () => {},
  onItemsPerPageChange,
  itemsPerPageOptions,
  rowKey,
  emptyState,
  className = '',
  serverSide = true,
}) {
  // Sort is an ordered array [{ column, direction }] (index 0 = highest
  // priority). Callers may pass null for "unsorted" — normalize once.
  const sortLevels = sort ?? [];

  // -----------------------------------------------------------------
  // Visible columns reconciliation
  // -----------------------------------------------------------------
  // The URL gives us an ordered array of accessors (which may be empty
  // on first load, or may reference accessors that have since been
  // removed). Reconcile against the static config:
  //   - Drop unknown accessors silently.
  //   - On empty input, use config defaults (excluding defaultHidden).
  const orderedColumns = useMemo(() => {
    const accessorMap = new Map(columns.map((c) => [c.accessor, c]));
    if (visibleColumns.length === 0) {
      return columns.filter((c) => !c.defaultHidden);
    }
    return visibleColumns
      .map((a) => accessorMap.get(a))
      .filter(Boolean);
  }, [columns, visibleColumns]);

  // -----------------------------------------------------------------
  // Column widths (localStorage)
  // -----------------------------------------------------------------
  const [widths, setWidths] = useState(() => loadWidths(tableId));
  const widthsTimerRef = useRef(null);
  useEffect(() => {
    if (widthsTimerRef.current) clearTimeout(widthsTimerRef.current);
    widthsTimerRef.current = setTimeout(() => saveWidths(tableId, widths), 300);
    return () => clearTimeout(widthsTimerRef.current);
  }, [tableId, widths]);

  // -----------------------------------------------------------------
  // TanStack Table instance — headless, manual mode for filter/sort/page
  // -----------------------------------------------------------------
  const tanstackColumns = useMemo(
    () =>
      orderedColumns.map((col) => ({
        id: col.accessor,
        accessorKey: col.accessor,
        header: col.header,
        cell: ({ row }) => renderCell(row.original, col),
      })),
    [orderedColumns],
  );

  // We don't use TanStack's render output directly (the existing styling
  // is custom HTML), but we keep the instance around so future enhancements
  // — column resizing, virtualisation — can hook into it without rewriting.
  useReactTable({
    data,
    columns: tanstackColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: serverSide,
    manualSorting: serverSide,
    manualFiltering: serverSide,
    pageCount: serverSide ? Math.ceil(totalCount / itemsPerPage) : undefined,
  });

  // -----------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------
  const onFilterChange = (accessor, entry) => {
    const next = { ...filters };
    if (entry == null) delete next[accessor];
    else next[accessor] = entry;
    onFiltersChange(next);
  };

  const onHideColumn = (col) => {
    onVisibleColumnsChange(
      orderedColumns
        .filter((c) => c.accessor !== col.accessor)
        .map((c) => c.accessor),
    );
  };

  const clearAllFilters = () => onFiltersChange({});

  // Strip the requesting column's own entry from filters before passing
  // to the CategoryFilter. This is what keeps category dropdowns
  // contextual: a filter on "GHA" still shows every GHA option even
  // when one is already selected.
  const buildContextForColumn = (accessor) => {
    const stripped = { ...filterContext };
    if (stripped.column_filters) {
      stripped.column_filters = stripped.column_filters.filter(
        (cf) => cf.column !== accessor,
      );
    }
    return stripped;
  };

  // -----------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------
  const scrollableRef = useRef(null);
  // Measure the header row so the filter row's sticky-top offset matches
  // the actual rendered height (which depends on theme padding, font, and
  // — critically — column widths, which only finalise once real data is
  // in the table).
  //
  // We use a callback ref (not useRef + useEffect) because the <tr>
  // element identity changes across renders that flip between the loading
  // skeleton and the main render path: React unmounts and re-mounts the
  // <tr>, but a `useEffect([], …)` only runs once at component mount and
  // would observe the original (now-destroyed) element. With a callback
  // ref, every attach re-measures and re-installs the ResizeObserver, so
  // the sticky offset stays in sync as the table re-mounts and as column
  // widths shift after data arrives.
  const observerRef = useRef(null);
  const realHeaderRowRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(46);
  const headerRowRef = useCallback((el) => {
    realHeaderRowRef.current = el;
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!el) return;
    setHeaderHeight(el.getBoundingClientRect().height);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() =>
      setHeaderHeight(el.getBoundingClientRect().height),
    );
    ro.observe(el);
    observerRef.current = ro;
  }, []);

  // Client-side mode: filter + sort the in-memory dataset, then slice
  // for pagination separately so the page count reflects the filtered
  // set (not the original data length). Server-side mode: trust the
  // data prop (caller has already issued the query) and rely on the
  // backend's totalCount.
  const filteredSortedRows = useMemo(() => {
    if (serverSide) return data;
    let rows = data;
    for (const [accessor, entry] of Object.entries(filters)) {
      if (!entry) continue;
      if (entry.kind === 'text') {
        const text = (entry.text ?? '').toLowerCase();
        if (!text) continue;
        rows = rows.filter((r) =>
          String(r[accessor] ?? '').toLowerCase().includes(text),
        );
      } else if (entry.kind === 'category') {
        const values = entry.values ?? [];
        if (values.length === 0) continue;
        rows = rows.filter((r) => values.includes(r[accessor]));
      } else if (entry.kind === 'number') {
        const op = entry.operator;
        const v = entry.value;
        const vEnd = entry.valueEnd;
        rows = rows.filter((r) => {
          const cell = r[accessor];
          if (cell == null || !Number.isFinite(Number(cell))) return false;
          const n = Number(cell);
          if (op === 'eq') return v != null && n === v;
          if (op === 'lt') return v != null && n < v;
          if (op === 'gt') return v != null && n > v;
          if (op === 'between') {
            if (v == null && vEnd == null) return true;
            if (v != null && n < v) return false;
            if (vEnd != null && n > vEnd) return false;
            return true;
          }
          return true;
        });
      } else if (entry.kind === 'date') {
        // Compare ISO date strings lexicographically (matches the
        // backend's `DATE()`-wrapped SQL for whole-day equality). Cell
        // values may be a full ISO timestamp; slice to the date
        // portion for `eq` and `between` so timestamps still match by
        // calendar day.
        const op = entry.operator;
        const v = entry.value;
        const vEnd = entry.valueEnd;
        rows = rows.filter((r) => {
          const raw = r[accessor];
          if (raw == null || raw === '') return false;
          const day = String(raw).slice(0, 10);
          if (op === 'eq') return !!v && day === v;
          if (op === 'before') return !!v && raw < v;
          if (op === 'after') return !!v && raw > v;
          if (op === 'between') {
            if (!v && !vEnd) return true;
            if (v && day < v) return false;
            if (vEnd && day > vEnd) return false;
            return true;
          }
          return true;
        });
      }
    }
    if (sortLevels.length > 0) {
      rows = [...rows].sort((a, b) => {
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
      });
    }
    return rows;
  }, [serverSide, data, filters, sortLevels]);

  const visibleRows = useMemo(() => {
    if (serverSide) return data;
    const start = (page - 1) * itemsPerPage;
    return filteredSortedRows.slice(start, start + itemsPerPage);
  }, [serverSide, data, filteredSortedRows, page, itemsPerPage]);

  // Effective row count for pagination + footer label. Server-side
  // trusts the caller's totalCount; client-side uses the filtered total.
  const effectiveCount = serverSide ? totalCount : filteredSortedRows.length;

  const totalPages = Math.max(1, Math.ceil(effectiveCount / itemsPerPage));

  // Snap back to page 1 if the user filtered down to fewer pages than
  // their current page index — otherwise pagination shows "page 5"
  // when the filtered set has only 2 pages.
  //
  // Client-side only. Server-side callers reset the page explicitly
  // from their own onFiltersChange / onSortChange handlers, and their
  // Apollo hooks use `fetchPolicy: 'network-only'` — which surfaces
  // `totalCount = 0` (so `totalPages = 1`) for one or more renders
  // while a page-change refetch is in flight. Running this effect in
  // server-side mode would catch that transient and snap the user
  // back to page 1 every time they navigated to page 2+.
  useEffect(() => {
    if (serverSide) return;
    if (page > totalPages) onPageChange(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages, serverSide]);

  if (loading && visibleRows.length === 0) {
    return (
      <div className={`bg-white border border-gray-200 ${className}`}>
        <div className="isolate overflow-x-auto" ref={scrollableRef}>
          <table className="w-full">
            <thead>
              <DataTableHeader
                columns={orderedColumns}
                sort={sortLevels}
                onSortChange={onSortChange}
                onHideColumn={onHideColumn}
                onReorder={onVisibleColumnsChange}
                scrollableRef={scrollableRef}
                headerRowRef={headerRowRef}
              />
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100">
                  {orderedColumns.map((col) => (
                    <td key={col.accessor} className="py-4 px-4">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Show "Clear all filters" only when ≥1 filter is active. Lives in the
  // toolbar next to the columns selector so horizontal overflow on the
  // table never hides it.
  const hasActiveFilter = Object.values(filters).some((v) => v != null);

  return (
    <div className={`bg-white border border-gray-200 ${className}`}>
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-gray-200">
        <span className="text-xs text-gray-400">
          Shift+click a header to add a sort level
        </span>
        <div className="flex items-center gap-3">
          {hasActiveFilter && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs text-orange-500 hover:underline"
            >
              Clear all filters
            </button>
          )}
          <ColumnsPopover
            columns={columns}
            visibleColumns={orderedColumns.map((c) => c.accessor)}
            onChange={onVisibleColumnsChange}
          />
        </div>
      </div>

      <StickyTableHeader
        columns={orderedColumns}
        sort={sortLevels}
        filters={filters}
        onSortChange={onSortChange}
        onHideColumn={onHideColumn}
        onReorder={onVisibleColumnsChange}
        onFilterChange={onFilterChange}
        graphqlTable={graphqlTable}
        filterContext={filterContext}
        buildContextForColumn={buildContextForColumn}
        serverSide={serverSide}
        data={data}
        scrollableRef={scrollableRef}
        realHeaderRowRef={realHeaderRowRef}
        headerHeight={headerHeight}
      />

      <div className="relative isolate overflow-x-auto" ref={scrollableRef}>
        {/* Refetch overlay. We keep stale rows visible (better than a
            full skeleton flash) but dim them slightly and pin a small
            "Loading…" badge so the user can see a request is in
            flight when paginating or changing page size. */}
        {loading && visibleRows.length > 0 && (
          <>
            <div className="pointer-events-none absolute inset-0 z-30 bg-white/40" />
            <div className="absolute top-2 right-2 z-40 rounded bg-black/70 px-2 py-1 text-xs text-white shadow">
              Loading…
            </div>
          </>
        )}
        <table className="w-full border-collapse">
          {/* Header + filter rows live inside the same <thead>. position:
              sticky on table cells works reliably for thead-nested rows
              but is browser-dependent for the first <tr> of <tbody> —
              which earlier let the filter row scroll out of view. */}
          <thead>
            <DataTableHeader
              columns={orderedColumns}
              sort={sortLevels}
              filters={filters}
              onSortChange={onSortChange}
              onHideColumn={onHideColumn}
              onReorder={onVisibleColumnsChange}
              scrollableRef={scrollableRef}
              headerRowRef={headerRowRef}
            />
            {/* Auto-hide the filter row when no visible column declares
                a filter. Presentation-only tables (heatmaps, summary
                grids) shouldn't reserve vertical space for empty
                filter cells. */}
            {orderedColumns.some((c) => c.filter) && (
              <DataTableFilterRow
                columns={orderedColumns}
                filters={filters}
                onFilterChange={onFilterChange}
                table={graphqlTable}
                filterContext={filterContext}
                buildContextForColumn={buildContextForColumn}
                headerHeight={headerHeight}
                serverSide={serverSide}
                data={data}
              />
            )}
          </thead>
          <tbody>
            {visibleRows.length === 0 && (
              <tr>
                <td
                  colSpan={orderedColumns.length}
                  className="px-4 py-12 text-center text-sm text-gray-500"
                >
                  {emptyState?.title ?? DEFAULT_EMPTY_STATE.title}
                  {emptyState?.description && (
                    <div className="mt-1 text-xs text-gray-400">{emptyState.description}</div>
                  )}
                </td>
              </tr>
            )}
            {(() => {
              // Compute keys for all visible rows up front so we can
              // detect duplicates and disambiguate by appending the
              // row index. Without this, a string rowKey pointing at a
              // non-unique column (e.g. disease_group_name where the
              // same disease appears under multiple product types) lets
              // React reuse DOM nodes across pages — the table appears
              // not to update on page change.
              //
              // rowKey can be a string (column accessor), a function
              // ((row) => key), or undefined (then we use the index).
              const seen = new Set();
              const keys = visibleRows.map((row, rowIndex) => {
                let raw;
                if (typeof rowKey === 'function') raw = rowKey(row);
                else if (typeof rowKey === 'string') raw = row[rowKey];
                const base = raw != null ? String(raw) : String(rowIndex);
                let key = base;
                if (seen.has(key)) key = `${base}#${rowIndex}`;
                seen.add(key);
                return key;
              });
              return visibleRows.map((row, rowIndex) => {
                const key = keys[rowIndex];
                return (
                  <tr key={key} className="border-b border-gray-100 hover:bg-gray-50">
                    {orderedColumns.map((col, colIndex) => {
                      const isFrozen = colIndex === 0;
                      const stickyStyle = isFrozen
                        ? {
                            position: 'sticky',
                            left: 0,
                            zIndex: 5,
                            background: 'white',
                          }
                        : undefined;
                      // cellStyle lets a column tint the whole <td> based
                      // on the cell value — used by the Technology Types
                      // heatmap. Frozen-cell stickiness still wins on
                      // collisions (it carries the white background that
                      // hides body cells scrolling under the column).
                      const dynamicStyle = col.cellStyle?.(row[col.accessor], row);
                      return (
                        <td
                          key={col.accessor}
                          className="py-4 px-4 text-sm text-left align-top border-b border-gray-200 text-black"
                          style={{ ...dynamicStyle, ...stickyStyle }}
                        >
                          {renderCell(row, col)}
                        </td>
                      );
                    })}
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
      </div>

      {(totalPages > 1 || onItemsPerPageChange) && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
          hasNextPage={serverSide ? hasNextPage : page < totalPages}
          totalCount={effectiveCount}
          itemsPerPage={itemsPerPage}
          onItemsPerPageChange={
            onItemsPerPageChange
              ? (n) => {
                  // Snap back to page 1 so the user doesn't land on a
                  // non-existent page after enlarging the page size.
                  onItemsPerPageChange(n);
                  onPageChange(1);
                }
              : undefined
          }
          itemsPerPageOptions={itemsPerPageOptions}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------------
// Cell renderer — kept inline rather than extracting; mirrors what the
// existing Table.jsx and ServerTable.jsx do, with no new types.
// -------------------------------------------------------------------
const emptyPlaceholder = (
  <span className="text-gray-400 italic">no information available</span>
);

function renderCell(row, column) {
  const value = row[column.accessor];

  if (column.render) return column.render(value, row);

  switch (column.type) {
    case 'number':
      if (value == null && value !== 0) return emptyPlaceholder;
      return (
        <span className="tabular-nums">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
      );
    case 'date':
      if (!value) return emptyPlaceholder;
      return (
        <span className="text-gray-600 tabular-nums">
          {new Date(value).toLocaleDateString()}
        </span>
      );
    case 'truncate':
      return value ? (
        <span
          className="block overflow-hidden text-ellipsis whitespace-nowrap"
          style={{ maxWidth: column.maxWidth || '200px' }}
          title={value}
        >
          {value}
        </span>
      ) : emptyPlaceholder;
    case 'link':
      if (!value) return emptyPlaceholder;
      // Only linkify real URLs; show anything else as plain text so a stray
      // non-URL value never produces a broken anchor.
      return /^https?:\/\//i.test(value) ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="block overflow-hidden text-blue-600 hover:underline"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: column.lines || 3,
            WebkitBoxOrient: 'vertical',
            maxWidth: column.maxWidth || '250px',
          }}
          title={value}
        >
          {value}
        </a>
      ) : (
        <span className="text-black">{value}</span>
      );
    case 'line-clamp':
      return value ? (
        <span
          className="block overflow-hidden"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: column.lines || 3,
            WebkitBoxOrient: 'vertical',
            maxWidth: column.maxWidth || '250px',
          }}
          title={value}
        >
          {value}
        </span>
      ) : emptyPlaceholder;
    default:
      return value != null ? <span className="text-black">{value}</span> : emptyPlaceholder;
  }
}
