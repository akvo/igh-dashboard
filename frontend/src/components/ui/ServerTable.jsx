'use client';

import Chip from './Chip';
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon } from '../icons';

// =========================================================
// ExploreLink — duplicated from Table.jsx because Table
// doesn't export it individually.
// =========================================================

const ExploreLink = ({ href, onClick, children = 'Explore' }) => {
  const handleClick = (e) => {
    if (onClick) {
      e.preventDefault();
      onClick(e);
    }
  };

  return (
    <a
      href={href || '#'}
      onClick={onClick ? handleClick : undefined}
      className="inline-flex items-center text-orange-500 text-sm no-underline cursor-pointer whitespace-nowrap hover:underline"
    >
      {children}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="ml-1 shrink-0"
      >
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    </a>
  );
};

// =========================================================
// EmptyState
// =========================================================

const EmptyState = ({ title = 'No data found', description, onClear }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4">
    <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
      <SearchIcon className="w-8 h-8 text-orange-300" strokeWidth={1.5} />
    </div>
    <h3 className="text-lg font-semibold text-black mb-2">{title}</h3>
    {description && (
      <p className="text-sm text-gray-500 text-center mb-4 max-w-xs">{description}</p>
    )}
    {onClear && (
      <button
        onClick={onClear}
        className="px-4 py-2 text-sm font-medium text-orange-500 border border-orange-500 rounded-lg bg-transparent cursor-pointer"
      >
        Clear search
      </button>
    )}
  </div>
);

// =========================================================
// Pagination — sliding-window page buttons
// =========================================================

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  hasNextPage,
  totalCount,
}) => {
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

      <span className="text-sm text-gray-500">{totalCount} results</span>
    </div>
  );
};

// =========================================================
// Cell rendering — matches Table.jsx's renderCell logic
// =========================================================

const renderCell = (row, column) => {
  const value = row[column.accessor];

  if (column.render) return column.render(value, row);

  switch (column.type) {
    case 'badge': {
      const variant = column.getVariant ? column.getVariant(value, row) : 'default';
      return <Chip variant={variant} size="sm">{value}</Chip>;
    }

    case 'name-with-link':
      return (
        <div>
          <div className="text-black mb-1">{value}</div>
          <ExploreLink
            onClick={column.onClick ? () => column.onClick(value, row) : undefined}
            href={column.getHref ? column.getHref(value, row) : '#'}
          >
            {column.linkText || 'Explore'}
          </ExploreLink>
        </div>
      );

    case 'link':
      return (
        <ExploreLink
          onClick={column.onClick ? () => column.onClick(value, row) : undefined}
          href={column.getHref ? column.getHref(value, row) : '#'}
        >
          {column.linkText || value || 'View'}
        </ExploreLink>
      );

    case 'number':
      return <span className="tabular-nums">{typeof value === 'number' ? value.toLocaleString() : value}</span>;

    case 'date':
      if (!value) return <span className="text-gray-400">-</span>;
      return <span className="text-gray-600 tabular-nums">{new Date(value).toLocaleDateString()}</span>;

    case 'truncate':
      return (
        <span className="block overflow-hidden text-ellipsis whitespace-nowrap" style={{ maxWidth: column.maxWidth || '200px' }} title={value}>
          {value || '-'}
        </span>
      );

    default:
      return <span className="text-black">{value ?? '-'}</span>;
  }
};

// =========================================================
// ServerTable — externally paginated table component
//
// Unlike `Table`, this component does NOT manage page state
// internally. The caller provides `data` pre-sliced to the
// current page and controls pagination via props.
// =========================================================

export default function ServerTable({
  columns,
  data = [],
  rowKey,
  currentPage,
  onPageChange,
  totalCount,
  hasNextPage,
  itemsPerPage = 10,
  emptyState,
  className = '',
}) {
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  if (data.length === 0) {
    return (
      <div className={`bg-white border border-gray-200 overflow-hidden ${className}`}>
        <EmptyState
          title={emptyState?.title}
          description={emptyState?.description}
          onClear={emptyState?.onClear}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              {columns.map((column, idx) => (
                <th
                  key={column.accessor || idx}
                  className="text-left py-3 px-4 text-sm font-medium text-gray-600 bg-[#FEF8EE] whitespace-nowrap"
                  style={{ width: column.width, minWidth: column.minWidth }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => {
              const key = rowKey ? row[rowKey] : rowIndex;
              return (
                <tr key={key} className="border-b border-gray-100 hover:bg-gray-50">
                  {columns.map((column, colIdx) => {
                    const cellClass = typeof column.cellClassName === 'function'
                      ? column.cellClassName(row[column.accessor], row)
                      : (column.cellClassName || '');
                    const cellStyle = typeof column.cellStyle === 'function'
                      ? column.cellStyle(row[column.accessor], row)
                      : (column.cellStyle || undefined);
                    return (
                      <td
                        key={column.accessor || colIdx}
                        className={`py-4 px-4 text-sm align-top border-b border-gray-200 text-black ${cellClass}`}
                        style={cellStyle}
                      >
                        {renderCell(row, column)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          hasNextPage={hasNextPage}
          totalCount={totalCount}
        />
      )}
    </div>
  );
}
