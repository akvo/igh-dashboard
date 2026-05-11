import { useState } from 'react';
import { MockedProvider } from '@apollo/client/testing/react';
import DataTable from '../../components/ui/data-table/DataTable';
import fixture from '../../components/ui/data-table/__fixtures__/diseaseProductTypes.json';

// =========================================================
// DataTable / Client-side — Disease and product types
// =========================================================
//
// Case 1 (the home-page bubble drill-down). The full dataset is loaded
// once into memory; all filtering, sorting, paging happens in TanStack's
// in-memory mode (`serverSide={false}`). No per-page network requests
// after initial load.
//
// CategoryFilter dropdowns query the `distinctValues` Apollo resolver
// when their popover opens. We wrap the story in MockedProvider so that
// query receives an empty mock list rather than blowing up — the
// dropdowns will simply show "No options." for category filters until
// the application story (Phase 3) wires real data. The reviewer can
// still exercise text filters, sort, hide/show, and drag-reorder
// without that.

const DATA = fixture.data?.diseaseProductTypeSummaries ?? [];

const COLUMNS = [
  {
    header: 'Health area',
    accessor: 'global_health_area',
    filter: { kind: 'category' },
    sortable: true,
    hideable: false,
  },
  {
    header: 'Disease',
    accessor: 'disease_group_name',
    filter: { kind: 'category' },
    sortable: true,
    hideable: true,
  },
  {
    header: 'Product type',
    accessor: 'product_type',
    filter: { kind: 'category' },
    sortable: true,
    hideable: true,
  },
  {
    header: 'Candidates',
    accessor: 'candidateCount',
    filter: { kind: 'number' },
    sortable: true,
    hideable: true,
    type: 'number',
  },
  {
    header: 'Products',
    accessor: 'productCount',
    filter: { kind: 'number' },
    sortable: true,
    hideable: true,
    type: 'number',
  },
];

export default {
  title: 'DataTable/Client-side — Disease and product types',
  component: DataTable,
  parameters: {
    layout: 'padded',
  },
};

export const Default = () => {
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState(null);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [visibleColumns, setVisibleColumns] = useState(
    COLUMNS.map((c) => c.accessor),
  );

  return (
    <MockedProvider mocks={[]} addTypename={false}>
      <DataTable
        tableId="story-client-disease-product-types"
        columns={COLUMNS}
        data={DATA}
        serverSide={false}
        loading={false}
        page={page}
        onPageChange={setPage}
        filters={filters}
        onFiltersChange={(next) => {
          setFilters(next);
          setPage(1);
        }}
        sort={sort}
        onSortChange={setSort}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={setItemsPerPage}
        // Match the home-page Table.jsx options the bubble drill-down
        // uses today, so users moving from there see the same choices.
        itemsPerPageOptions={[6, 10, 20, 50]}
        // Compose a unique row key from the three identifying columns —
        // disease_group_name alone is non-unique (67 distinct values
        // across 202 rows), so React would collapse rows with the same
        // disease across product types and the table would appear not
        // to update on page change.
        rowKey={(row) =>
          `${row.global_health_area}|${row.disease_group_name}|${row.product_type}`
        }
        emptyState={{
          title: 'No matching rows',
          description: 'Adjust the column filters or clear them to see more.',
        }}
      />
    </MockedProvider>
  );
};
