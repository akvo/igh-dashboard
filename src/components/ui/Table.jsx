'use client';

import { useState, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, SearchIcon } from '../icons';
import Chip from './Chip';

// Explore Link component
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

// Empty state component
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

// Pagination component
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  resultsPerPage,
  onResultsPerPageChange,
  resultsPerPageOptions = [6, 10, 20, 50],
}) => {
  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`w-8 h-8 flex items-center justify-center rounded bg-gray-100 border-none ${currentPage === 1 ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
        >
          <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
        </button>

        {getPageNumbers().map((page, index) =>
          page === '...' ? (
            <span key={`ellipsis-${index}`} className="px-1 text-gray-400 text-sm">...</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`w-8 h-8 text-sm rounded border-none cursor-pointer ${
                currentPage === page
                  ? 'bg-orange-500 text-white font-medium'
                  : 'bg-transparent text-gray-600 font-normal'
              }`}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`w-8 h-8 flex items-center justify-center rounded bg-gray-100 border-none ${currentPage === totalPages ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
        >
          <ChevronRightIcon className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Results per page:</span>
        <div className="relative inline-flex items-center">
          <select
            value={resultsPerPage}
            onChange={(e) => onResultsPerPageChange(Number(e.target.value))}
            className="appearance-none px-3 py-2 pr-8 text-sm border-none rounded-lg bg-gray-100 cursor-pointer text-black font-medium"
          >
            {resultsPerPageOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <ChevronDownIcon className="absolute right-2 w-4 h-4 text-gray-500 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};

// Main Table component
export default function Table({
  columns,
  data = [],
  emptyState,
  pagination = true,
  defaultResultsPerPage = 6,
  onRowClick,
  stickyHeader = false,
  className = '',
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [resultsPerPage, setResultsPerPage] = useState(defaultResultsPerPage);

  const totalPages = Math.ceil(data.length / resultsPerPage);

  const paginatedData = useMemo(() => {
    if (!pagination) return data;
    const start = (currentPage - 1) * resultsPerPage;
    return data.slice(start, start + resultsPerPage);
  }, [data, currentPage, resultsPerPage, pagination]);

  const handlePageChange = (page) => setCurrentPage(page);
  const handleResultsPerPageChange = (value) => {
    setResultsPerPage(value);
    setCurrentPage(1);
  };

  // Render cell based on column type
  const renderCell = (row, column) => {
    const value = row[column.accessor];

    if (column.render) return column.render(value, row);

    switch (column.type) {
      case 'badge':
        const variant = column.getVariant ? column.getVariant(value, row) : 'default';
        return <Chip variant={variant} size="sm">{value}</Chip>;

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

  if (data.length === 0) {
    return (
      <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
        <EmptyState title={emptyState?.title} description={emptyState?.description} onClear={emptyState?.onClear} />
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.accessor}
                  className="px-4 py-3.5 text-left text-sm font-normal text-black bg-yellow-50 border-b border-gray-200 whitespace-nowrap"
                  style={{ width: column.width, minWidth: column.minWidth }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, rowIndex) => (
              <tr
                key={row.id || rowIndex}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`${onRowClick ? 'cursor-pointer' : 'cursor-default'} hover:bg-cream-200 transition-colors`}
              >
                {columns.map((column) => (
                  <td
                    key={column.accessor}
                    className="px-4 py-4 text-sm align-top border-b border-gray-200 text-black"
                  >
                    {renderCell(row, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          resultsPerPage={resultsPerPage}
          onResultsPerPageChange={handleResultsPerPageChange}
        />
      )}
    </div>
  );
}

// Export sub-components
Table.Chip = Chip;
Table.ExploreLink = ExploreLink;
Table.EmptyState = EmptyState;
Table.Pagination = Pagination;
