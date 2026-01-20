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
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        color: '#fe7449',
        fontSize: '14px',
        textDecoration: 'none',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.textDecoration = 'underline';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.textDecoration = 'none';
      }}
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
        style={{ marginLeft: '4px', flexShrink: 0 }}
      >
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
      </svg>
    </a>
  );
};

// Empty state component
const EmptyState = ({ title = 'No data found', description, onClear }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 16px' }}>
    <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#fff1ed', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
      <SearchIcon style={{ width: '32px', height: '32px', color: '#ffa07a' }} strokeWidth={1.5} />
    </div>
    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#262626', marginBottom: '8px' }}>{title}</h3>
    {description && (
      <p style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center', marginBottom: '16px', maxWidth: '320px' }}>{description}</p>
    )}
    {onClear && (
      <button
        onClick={onClear}
        style={{
          padding: '8px 16px',
          fontSize: '14px',
          fontWeight: '500',
          color: '#fe7449',
          border: '1px solid #fe7449',
          borderRadius: '8px',
          backgroundColor: 'transparent',
          cursor: 'pointer',
        }}
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid #e5e7eb' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            backgroundColor: '#f3f4f6',
            border: 'none',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            opacity: currentPage === 1 ? 0.4 : 1,
          }}
        >
          <ChevronLeftIcon style={{ width: '16px', height: '16px', color: '#4b5563' }} />
        </button>

        {getPageNumbers().map((page, index) =>
          page === '...' ? (
            <span key={`ellipsis-${index}`} style={{ padding: '0 4px', color: '#9ca3af', fontSize: '14px' }}>...</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              style={{
                width: '32px',
                height: '32px',
                fontSize: '14px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: currentPage === page ? '#fe7449' : 'transparent',
                color: currentPage === page ? '#ffffff' : '#4b5563',
                fontWeight: currentPage === page ? '500' : '400',
              }}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            backgroundColor: '#f3f4f6',
            border: 'none',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            opacity: currentPage === totalPages ? 0.4 : 1,
          }}
        >
          <ChevronRightIcon style={{ width: '16px', height: '16px', color: '#4b5563' }} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '14px', color: '#6b7280' }}>Results per page:</span>
        <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          <select
            value={resultsPerPage}
            onChange={(e) => onResultsPerPageChange(Number(e.target.value))}
            style={{
              padding: '8px 32px 8px 12px',
              fontSize: '14px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: '#F2F2F4',
              cursor: 'pointer',
              appearance: 'none',
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              color: '#262626',
              fontWeight: '500',
            }}
          >
            {resultsPerPageOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <ChevronDownIcon
            style={{ position: 'absolute', right: '8px', pointerEvents: 'none', width: '16px', height: '16px', color: '#6b7280' }}
          />
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
            <div style={{ color: '#262626', marginBottom: '4px' }}>{value}</div>
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
        return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{typeof value === 'number' ? value.toLocaleString() : value}</span>;

      case 'date':
        if (!value) return <span style={{ color: '#9ca3af' }}>-</span>;
        return <span style={{ color: '#4b5563', fontVariantNumeric: 'tabular-nums' }}>{new Date(value).toLocaleDateString()}</span>;

      case 'truncate':
        return (
          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: column.maxWidth || '200px' }} title={value}>
            {value || '-'}
          </span>
        );

      default:
        return <span style={{ color: '#262626' }}>{value ?? '-'}</span>;
    }
  };

  if (data.length === 0) {
    return (
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }} className={className}>
        <EmptyState title={emptyState?.title} description={emptyState?.description} onClear={emptyState?.onClear} />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }} className={className}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.accessor}
                  style={{
                    padding: '14px 16px',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '400',
                    color: '#262626',
                    backgroundColor: '#FEF8EE',
                    borderBottom: '1px solid #e5e7eb',
                    whiteSpace: 'nowrap',
                    width: column.width,
                    minWidth: column.minWidth,
                  }}
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
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fdfcfa'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {columns.map((column) => (
                  <td
                    key={column.accessor}
                    style={{
                      padding: '16px',
                      fontSize: '14px',
                      verticalAlign: 'top',
                      borderBottom: '1px solid #e5e7eb',
                      color: '#262626',
                    }}
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
