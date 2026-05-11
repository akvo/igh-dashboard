'use client';

import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from '../../icons';

// =========================================================
// Pagination
// =========================================================
//
// Footer for DataTable: sliding-window page buttons on the left, an
// optional "Results per page" selector + total-count label on the right.
// The selector mirrors Table.jsx's existing UX so users moving between
// the home page table and the new DataTable get a consistent control.
//
// Page-size selector is rendered only when `onItemsPerPageChange` is
// provided. When the user picks a new page size the parent should
// reset the current page to 1 — DataTable does this in its passed
// handler.

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  hasNextPage,
  totalCount,
  itemsPerPage,
  onItemsPerPageChange,
  itemsPerPageOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}) {
  const maxVisible = 5;

  // Centre the window on the current page, clamped to valid bounds.
  let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let end = start + maxVisible - 1;
  if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, end - maxVisible + 1);
  }

  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  const showLeftEllipsis = start > 2;
  const showRightEllipsis = end < totalPages - 1;

  return (
    <div className="flex items-center justify-between px-4 py-4 border-t border-gray-200">
      <div className="flex items-center gap-2">
        <button
          className="p-2 text-gray-400 hover:bg-gray-100 rounded disabled:opacity-50"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>

        {/* First page (when the window doesn't start at 1) */}
        {start > 1 && (
          <button
            onClick={() => onPageChange(1)}
            className={`w-8 h-8 text-sm rounded ${
              currentPage === 1 ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            1
          </button>
        )}
        {showLeftEllipsis && <span className="text-gray-400">...</span>}

        {/* Window pages */}
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-8 h-8 text-sm rounded ${
              currentPage === page ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {page}
          </button>
        ))}

        {showRightEllipsis && <span className="text-gray-400">...</span>}
        {/* Last page (when the window doesn't reach it) */}
        {end < totalPages && (
          <button
            onClick={() => onPageChange(totalPages)}
            className={`w-8 h-8 text-sm rounded ${
              currentPage === totalPages ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {totalPages}
          </button>
        )}

        <button
          className="p-2 text-gray-400 hover:bg-gray-100 rounded disabled:opacity-50"
          disabled={!hasNextPage}
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        {onItemsPerPageChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Results per page:</span>
            <div className="relative inline-flex items-center">
              <select
                value={itemsPerPage}
                onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                className="appearance-none px-3 py-2 pr-8 text-sm border-none rounded-lg bg-gray-100 cursor-pointer text-black font-medium"
              >
                {itemsPerPageOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="absolute right-2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>
        )}
        <span className="text-sm text-gray-500">{totalCount} results</span>
      </div>
    </div>
  );
}
