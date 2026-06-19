// @vitest-environment jsdom
import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { DataTable } from '@/components/ui/data-table';

const COLUMNS = [
  { header: 'Name', accessor: 'name', filter: { kind: 'text' }, sortable: true },
  { header: 'Type', accessor: 'type', filter: { kind: 'category' }, sortable: true },
];

const ROWS = [
  { name: 'Alpha', type: 'A' },
  { name: 'Bravo', type: 'B' },
];

const renderTable = (props = {}) =>
  render(
    <MockedProvider mocks={[]} addTypename={false}>
      <DataTable
        tableId="test"
        graphqlTable="PORTFOLIO_CANDIDATES"
        columns={COLUMNS}
        data={ROWS}
        totalCount={ROWS.length}
        rowKey="name"
        {...props}
      />
    </MockedProvider>,
  );

describe('DataTable', () => {
  it('renders all rows and column headers by default', () => {
    renderTable();
    expect(screen.getByText('Name')).toBeTruthy();
    expect(screen.getByText('Type')).toBeTruthy();
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Bravo')).toBeTruthy();
  });

  it('fires onFiltersChange when typing in a text filter', () => {
    const onFiltersChange = vi.fn();
    renderTable({ onFiltersChange });

    const input = screen.getByPlaceholderText('Filter…');
    fireEvent.change(input, { target: { value: 'alpha' } });

    // Debouncing happens upstream in useUrlState; this component fires
    // onChange immediately on every keystroke.
    expect(onFiltersChange).toHaveBeenCalledWith({
      name: { kind: 'text', text: 'alpha' },
    });
  });

  it('fires onSortChange when selecting "Sort ascending" from the column menu', () => {
    const onSortChange = vi.fn();
    renderTable({ onSortChange });

    // The first column-menu button corresponds to the Name column.
    fireEvent.click(screen.getAllByLabelText('Column actions')[0]);
    fireEvent.click(screen.getByText('Sort ascending'));

    expect(onSortChange).toHaveBeenCalledWith({
      column: 'name',
      direction: 'asc',
    });
  });

  it('hides a column when "Hide column" is selected', () => {
    const onVisibleColumnsChange = vi.fn();
    renderTable({
      visibleColumns: ['name', 'type'],
      onVisibleColumnsChange,
    });

    // Index-0 column is the frozen one and its Hide is disabled, so
    // exercise the Hide on the second (non-frozen) column.
    fireEvent.click(screen.getAllByLabelText('Column actions')[1]);
    fireEvent.click(screen.getByText('Hide column'));

    expect(onVisibleColumnsChange).toHaveBeenCalledWith(['name']);
  });

  it('Select all in the Columns popover adds every missing column', () => {
    const COLUMNS_3 = [
      { header: 'Alpha', accessor: 'a', sortable: true },
      { header: 'Bravo', accessor: 'b', sortable: true, hideable: false },
      { header: 'Charlie', accessor: 'c', sortable: true },
    ];
    const onVisibleColumnsChange = vi.fn();
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <DataTable
          tableId="test"
          graphqlTable="PORTFOLIO_CANDIDATES"
          columns={COLUMNS_3}
          data={[{ a: '1', b: '2', c: '3' }]}
          totalCount={1}
          rowKey="a"
          visibleColumns={['a']}
          onVisibleColumnsChange={onVisibleColumnsChange}
        />
      </MockedProvider>,
    );

    // Open the Columns popover via its trigger button.
    fireEvent.click(screen.getByRole('button', { name: /columns/i }));

    // Click "Select all" inside the popover.
    fireEvent.click(screen.getByRole('button', { name: 'Select all' }));

    // Current visible order is preserved; missing accessors append in
    // config order.
    expect(onVisibleColumnsChange).toHaveBeenCalledWith(['a', 'b', 'c']);
  });

  it('Clear in the Columns popover keeps frozen and non-hideable columns', () => {
    const COLUMNS_3 = [
      { header: 'Alpha', accessor: 'a', sortable: true },
      { header: 'Bravo', accessor: 'b', sortable: true, hideable: false },
      { header: 'Charlie', accessor: 'c', sortable: true },
    ];
    const onVisibleColumnsChange = vi.fn();
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <DataTable
          tableId="test"
          graphqlTable="PORTFOLIO_CANDIDATES"
          columns={COLUMNS_3}
          data={[{ a: '1', b: '2', c: '3' }]}
          totalCount={1}
          rowKey="a"
          visibleColumns={['a', 'b', 'c']}
          onVisibleColumnsChange={onVisibleColumnsChange}
        />
      </MockedProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /columns/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    // Survivors: 'a' (frozen at index 0) + 'b' (hideable: false). 'c'
    // is togglable and gets dropped.
    expect(onVisibleColumnsChange).toHaveBeenCalledWith(['a', 'b']);
  });

  it('Select all is disabled when every column is already visible', () => {
    const COLUMNS_3 = [
      { header: 'Alpha', accessor: 'a', sortable: true },
      { header: 'Bravo', accessor: 'b', sortable: true },
      { header: 'Charlie', accessor: 'c', sortable: true },
    ];
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <DataTable
          tableId="test"
          graphqlTable="PORTFOLIO_CANDIDATES"
          columns={COLUMNS_3}
          data={[{ a: '1', b: '2', c: '3' }]}
          totalCount={1}
          rowKey="a"
          visibleColumns={['a', 'b', 'c']}
          onVisibleColumnsChange={() => {}}
        />
      </MockedProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /columns/i }));
    expect(
      screen.getByRole('button', { name: 'Select all' }).disabled,
    ).toBe(true);
  });

  it('Clear is disabled when only frozen and non-hideable columns are visible', () => {
    const COLUMNS_3 = [
      { header: 'Alpha', accessor: 'a', sortable: true },
      { header: 'Bravo', accessor: 'b', sortable: true, hideable: false },
      { header: 'Charlie', accessor: 'c', sortable: true },
    ];
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <DataTable
          tableId="test"
          graphqlTable="PORTFOLIO_CANDIDATES"
          columns={COLUMNS_3}
          data={[{ a: '1', b: '2', c: '3' }]}
          totalCount={1}
          rowKey="a"
          visibleColumns={['a', 'b']}
          onVisibleColumnsChange={() => {}}
        />
      </MockedProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /columns/i }));
    expect(screen.getByRole('button', { name: 'Clear' }).disabled).toBe(true);
  });

  it('paginates client-side data when serverSide=false', () => {
    // Seed 25 rows with non-unique-by-name data — this is the case that
    // bit us in the Storybook story (66 unique disease names across 200+
    // rows). With a string rowKey colliding, React reused DOM nodes
    // across pages and the table visually didn't update.
    const ROWS_25 = Array.from({ length: 25 }, (_, i) => ({
      name: `Item ${i % 5}`, // intentionally non-unique
      type: i < 12 ? 'A' : 'B',
    }));

    const Page = () => {
      const [page, setPage] = useState(1);
      return (
        <MockedProvider mocks={[]} addTypename={false}>
          <DataTable
            tableId="paged"
            graphqlTable="PORTFOLIO_CANDIDATES"
            columns={COLUMNS}
            data={ROWS_25}
            serverSide={false}
            page={page}
            onPageChange={setPage}
            itemsPerPage={10}
            // String rowKey on a non-unique column — exercises the
            // composite-key fallback to rowIndex when accessor values
            // collide.
            rowKey="name"
          />
        </MockedProvider>
      );
    };

    render(<Page />);

    // Page 1 of 3 → first 10 rows. Index-keyed dupes still render
    // because we fall through to rowIndex when keys collide.
    expect(screen.getAllByText(/^Item /)).toHaveLength(10);

    // Click "Next" via the chevron-right Pagination button (the only
    // button with no accessible name in the footer; grab by index).
    const allButtons = screen.getAllByRole('button');
    const nextChevron = allButtons.find(
      (b) => b.querySelector('.lucide-chevron-right'),
    );
    expect(nextChevron).toBeTruthy();
    fireEvent.click(nextChevron);

    // After paginating, still 10 rows — proving visibleRows recomputed.
    expect(screen.getAllByText(/^Item /)).toHaveLength(10);
  });

  it('updates total count and page number when client-side filters narrow the set', () => {
    // 25 rows, half match the filter → totalCount should drop to 13
    // and the footer should say "13 results", not "25 results".
    const ROWS_25 = Array.from({ length: 25 }, (_, i) => ({
      name: `Row ${i}`,
      type: i % 2 === 0 ? 'A' : 'B', // 13 As, 12 Bs
    }));

    const Page = () => {
      const [filters, setFilters] = useState({});
      return (
        <MockedProvider mocks={[]} addTypename={false}>
          <DataTable
            tableId="paged-filtered"
            graphqlTable="PORTFOLIO_CANDIDATES"
            columns={COLUMNS}
            data={ROWS_25}
            serverSide={false}
            page={1}
            onPageChange={() => {}}
            itemsPerPage={10}
            filters={filters}
            onFiltersChange={setFilters}
            // serverSide=false means the orchestrator derives the
            // category dropdown options locally from `data`, no
            // GraphQL — so we don't need to pass anything extra here.
          />
        </MockedProvider>
      );
    };

    render(<Page />);

    // Pre-filter: 25 rows total → "25 results" in the footer.
    expect(screen.getByText('25 results')).toBeTruthy();

    // Open the Type column's category filter and pick "A".
    const typeButton = screen.getAllByText('All')[0];
    fireEvent.click(typeButton);
    // Match the checkbox in the popover, not the "A" body cells.
    fireEvent.click(screen.getByRole('checkbox', { name: 'A' }));

    // Filtered: 13 rows → "13 results", confirming totalCount tracks
    // the filtered set rather than data.length.
    expect(screen.getByText('13 results')).toBeTruthy();
  });

  it('shows "Clear all filters" only when ≥1 filter is active', () => {
    const { rerender } = render(
      <MockedProvider mocks={[]} addTypename={false}>
        <DataTable
          tableId="test"
          graphqlTable="PORTFOLIO_CANDIDATES"
          columns={COLUMNS}
          data={ROWS}
          totalCount={ROWS.length}
          rowKey="name"
        />
      </MockedProvider>,
    );
    expect(screen.queryByText('Clear all filters')).toBeNull();

    rerender(
      <MockedProvider mocks={[]} addTypename={false}>
        <DataTable
          tableId="test"
          graphqlTable="PORTFOLIO_CANDIDATES"
          columns={COLUMNS}
          data={ROWS}
          totalCount={ROWS.length}
          rowKey="name"
          filters={{ name: { kind: 'text', text: 'alpha' } }}
        />
      </MockedProvider>,
    );
    expect(screen.getByText('Clear all filters')).toBeTruthy();
  });

  // -------- LINK --------

  it('renders a link-type cell as an anchor opening in a new tab', () => {
    renderTable({
      columns: [{ header: 'Source', accessor: 'source', type: 'link' }],
      data: [{ source: 'https://clinicaltrials.gov/study/NCT04406727' }],
    });
    const link = screen.getByRole('link', { name: 'https://clinicaltrials.gov/study/NCT04406727' });
    expect(link.getAttribute('href')).toBe('https://clinicaltrials.gov/study/NCT04406727');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('renders no link for a blank link-type cell', () => {
    renderTable({
      columns: [{ header: 'Source', accessor: 'source', type: 'link' }],
      data: [{ source: '' }],
    });
    expect(screen.queryByRole('link')).toBeNull();
  });

  // -------- NUMBER --------

  it('NUMBER filter fires onFiltersChange with operator + value (after debounce)', async () => {
    const onFiltersChange = vi.fn();
    const NUMBER_COLUMNS = [
      { header: 'Name', accessor: 'name' },
      {
        header: 'Count',
        accessor: 'count',
        filter: { kind: 'number' },
        sortable: true,
      },
    ];
    const ROWS_3 = [
      { name: 'A', count: 10 },
      { name: 'B', count: 50 },
      { name: 'C', count: 100 },
    ];

    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <DataTable
          tableId="num"
          graphqlTable="PORTFOLIO_CANDIDATES"
          columns={NUMBER_COLUMNS}
          data={ROWS_3}
          serverSide={false}
          page={1}
          onPageChange={() => {}}
          onFiltersChange={onFiltersChange}
        />
      </MockedProvider>,
    );

    // Default operator is `eq`; switch to `gt` then type 50.
    const opSelect = screen.getByLabelText('Number filter operator');
    fireEvent.change(opSelect, { target: { value: 'gt' } });

    const valueInput = screen.getByPlaceholderText('value');
    fireEvent.change(valueInput, { target: { value: '50' } });

    // NumberFilter debounces 400ms — wait for the onChange to settle.
    await waitFor(
      () => {
        expect(onFiltersChange).toHaveBeenCalledWith({
          count: { kind: 'number', operator: 'gt', value: 50 },
        });
      },
      { timeout: 1000 },
    );
  });

  it('NUMBER between with both empty bounds clears the filter', async () => {
    const onFiltersChange = vi.fn();
    const NUMBER_COLUMNS = [
      { header: 'Count', accessor: 'count', filter: { kind: 'number' } },
    ];

    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <DataTable
          tableId="num"
          graphqlTable="PORTFOLIO_CANDIDATES"
          columns={NUMBER_COLUMNS}
          data={[]}
          serverSide={false}
          page={1}
          onPageChange={() => {}}
          onFiltersChange={onFiltersChange}
          filters={{
            count: {
              kind: 'number',
              operator: 'between',
              value: 10,
              valueEnd: 20,
            },
          }}
        />
      </MockedProvider>,
    );

    // Clear both inputs — should fire onChange(null) after debounce.
    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '' } });
    fireEvent.change(inputs[1], { target: { value: '' } });

    await waitFor(
      () => expect(onFiltersChange).toHaveBeenLastCalledWith({}),
      { timeout: 1000 },
    );
  });

  // -------- DATE --------

  it('DATE filter fires onFiltersChange with ISO value (after debounce)', async () => {
    const onFiltersChange = vi.fn();
    const DATE_COLUMNS = [
      { header: 'Name', accessor: 'name' },
      {
        header: 'Started',
        accessor: 'started',
        filter: { kind: 'date' },
        sortable: true,
      },
    ];

    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <DataTable
          tableId="date"
          graphqlTable="PORTFOLIO_CANDIDATES"
          columns={DATE_COLUMNS}
          data={[]}
          serverSide={false}
          page={1}
          onPageChange={() => {}}
          onFiltersChange={onFiltersChange}
        />
      </MockedProvider>,
    );

    // Default operator is `eq`. Find the date input by type.
    const dateInputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2025-01-15' } });

    await waitFor(
      () => {
        expect(onFiltersChange).toHaveBeenLastCalledWith({
          started: { kind: 'date', operator: 'eq', value: '2025-01-15' },
        });
      },
      { timeout: 1000 },
    );
  });

  it('DATE between with both bounds fires kind=date operator=between (after debounce)', async () => {
    const onFiltersChange = vi.fn();
    const DATE_COLUMNS = [
      { header: 'Started', accessor: 'started', filter: { kind: 'date' } },
    ];

    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <DataTable
          tableId="date"
          graphqlTable="PORTFOLIO_CANDIDATES"
          columns={DATE_COLUMNS}
          data={[]}
          serverSide={false}
          page={1}
          onPageChange={() => {}}
          onFiltersChange={onFiltersChange}
        />
      </MockedProvider>,
    );

    fireEvent.change(screen.getByLabelText('Date filter operator'), {
      target: { value: 'between' },
    });

    const dateInputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2024-01-01' } });
    fireEvent.change(dateInputs[1], { target: { value: '2024-12-31' } });

    await waitFor(
      () => {
        expect(onFiltersChange).toHaveBeenLastCalledWith({
          started: {
            kind: 'date',
            operator: 'between',
            value: '2024-01-01',
            valueEnd: '2024-12-31',
          },
        });
      },
      { timeout: 1000 },
    );
  });

  // -------- end-to-end client-mode filter math --------

  it('client-side NUMBER filter narrows the visible rows and total count (after debounce)', async () => {
    const COLS = [
      { header: 'Name', accessor: 'name' },
      { header: 'N', accessor: 'n', filter: { kind: 'number' } },
    ];
    const ROWS_5 = [
      { name: 'A', n: 5 },
      { name: 'B', n: 15 },
      { name: 'C', n: 25 },
      { name: 'D', n: 35 },
      { name: 'E', n: 45 },
    ];

    const Page = () => {
      const [filters, setFilters] = useState({});
      return (
        <MockedProvider mocks={[]} addTypename={false}>
          <DataTable
            tableId="ne2e"
            graphqlTable="PORTFOLIO_CANDIDATES"
            columns={COLS}
            data={ROWS_5}
            serverSide={false}
            page={1}
            onPageChange={() => {}}
            itemsPerPage={10}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </MockedProvider>
      );
    };

    render(<Page />);

    // Pre-filter: all 5 rows visible. The filter row lives inside
    // <thead> so tbody tr count is exactly the data row count.
    const countBodyRows = () =>
      document.querySelectorAll('tbody tr').length;
    expect(countBodyRows()).toBe(5);

    // Set operator > and type 20 — expect 3 rows (25, 35, 45) once
    // the debounced filter fires and re-renders.
    fireEvent.change(screen.getByLabelText('Number filter operator'), {
      target: { value: 'gt' },
    });
    fireEvent.change(screen.getByPlaceholderText('value'), {
      target: { value: '20' },
    });

    await waitFor(() => expect(countBodyRows()).toBe(3), { timeout: 1000 });
  });

  it('client-side DATE filter narrows the visible rows and total count (after debounce)', async () => {
    const COLS = [
      { header: 'Name', accessor: 'name' },
      { header: 'Started', accessor: 'started', filter: { kind: 'date' } },
    ];
    const ROWS_4 = [
      { name: 'A', started: '2024-01-15' },
      { name: 'B', started: '2024-06-10' },
      { name: 'C', started: '2024-11-20' },
      { name: 'D', started: '2025-02-05' },
    ];

    const Page = () => {
      const [filters, setFilters] = useState({});
      return (
        <MockedProvider mocks={[]} addTypename={false}>
          <DataTable
            tableId="de2e"
            graphqlTable="PORTFOLIO_CANDIDATES"
            columns={COLS}
            data={ROWS_4}
            serverSide={false}
            page={1}
            onPageChange={() => {}}
            itemsPerPage={10}
            filters={filters}
            onFiltersChange={setFilters}
          />
        </MockedProvider>
      );
    };

    render(<Page />);

    const countBodyRows = () =>
      document.querySelectorAll('tbody tr').length;
    expect(countBodyRows()).toBe(4);

    // Filter "after 2024-12-31" — expect 1 row (2025-02-05) after
    // the debounced filter fires.
    fireEvent.change(screen.getByLabelText('Date filter operator'), {
      target: { value: 'after' },
    });
    const dateInput = document.querySelector('input[type="date"]');
    fireEvent.change(dateInput, { target: { value: '2024-12-31' } });

    await waitFor(() => expect(countBodyRows()).toBe(1), { timeout: 1000 });
  });
});
