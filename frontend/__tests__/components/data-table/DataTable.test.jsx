// @vitest-environment jsdom
import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { DataTable } from '@/components/ui/data-table';

// The header + filter rows are rendered twice: once in the scrolling table
// (inside `.overflow-x-auto`) and once in the aria-hidden page-sticky clone
// (StickyTableHeader). Scope control queries to the real table so they
// resolve to a single element.
const realTable = () => within(document.querySelector('.overflow-x-auto'));

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
    // Header labels appear twice: once in the table, once in the
    // aria-hidden sticky-header clone (StickyTableHeader).
    expect(screen.getAllByText('Name')[0]).toBeTruthy();
    expect(screen.getAllByText('Type')[0]).toBeTruthy();
    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Bravo')).toBeTruthy();
  });

  it('fires onFiltersChange when typing in a text filter', () => {
    const onFiltersChange = vi.fn();
    renderTable({ onFiltersChange });

    const input = realTable().getByPlaceholderText('Filter…');
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
    const opSelect = realTable().getByLabelText('Number filter operator');
    fireEvent.change(opSelect, { target: { value: 'gt' } });

    const valueInput = realTable().getByPlaceholderText('value');
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

    fireEvent.change(realTable().getByLabelText('Date filter operator'), {
      target: { value: 'between' },
    });

    const dateInputs = document.querySelector('.overflow-x-auto').querySelectorAll('input[type="date"]');
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
    fireEvent.change(realTable().getByLabelText('Number filter operator'), {
      target: { value: 'gt' },
    });
    fireEvent.change(realTable().getByPlaceholderText('value'), {
      target: { value: '20' },
    });

    await waitFor(() => expect(countBodyRows()).toBe(3), { timeout: 1000 });
  });

  it('reorders columns when a header cell is dragged onto another (non-first)', () => {
    const onVisibleColumnsChange = vi.fn();
    const COLUMNS_3 = [
      { header: 'Alpha', accessor: 'a', sortable: true },
      { header: 'Bravo', accessor: 'b', sortable: true },
      { header: 'Charlie', accessor: 'c', sortable: true },
    ];
    renderTable({
      columns: COLUMNS_3,
      data: [{ a: '1', b: '2', c: '3' }],
      totalCount: 1,
      rowKey: 'a',
      visibleColumns: ['a', 'b', 'c'],
      onVisibleColumnsChange,
    });

    // Grab header cells via their text, then walk up to the <th>.
    // Scope to the real table: the aria-hidden sticky clone renders a second
    // copy of every header, so an unscoped getByText would match two nodes.
    const bravoTh = realTable().getByText('Bravo').closest('th');
    const charlieTh = realTable().getByText('Charlie').closest('th');

    // Drag "Charlie" onto "Bravo": Charlie moves to index 1. Index 0 is
    // locked, so reorder coverage lives entirely among non-first columns.
    fireEvent.dragStart(charlieTh);
    fireEvent.dragOver(bravoTh);

    expect(onVisibleColumnsChange).toHaveBeenCalledWith(['a', 'c', 'b']);
  });

  it('reorders columns when a header cell is dragged in the sticky clone', () => {
    const onVisibleColumnsChange = vi.fn();
    const COLUMNS_3 = [
      { header: 'Alpha', accessor: 'a', sortable: true },
      { header: 'Bravo', accessor: 'b', sortable: true },
      { header: 'Charlie', accessor: 'c', sortable: true },
    ];
    renderTable({
      columns: COLUMNS_3,
      data: [{ a: '1', b: '2', c: '3' }],
      totalCount: 1,
      rowKey: 'a',
      visibleColumns: ['a', 'b', 'c'],
      onVisibleColumnsChange,
    });

    // Once the real header scrolls out of view the user drags the
    // aria-hidden page-sticky clone (StickyTableHeader). Its zero-height
    // container carries the distinctive `sticky h-0` classes, so scope the
    // query there to grab the clone's header cells rather than the real ones.
    const clone = within(
      document.querySelector('div.sticky.h-0[aria-hidden="true"]'),
    );
    const bravoTh = clone.getByText('Bravo').closest('th');
    const charlieTh = clone.getByText('Charlie').closest('th');

    fireEvent.dragStart(charlieTh);
    fireEvent.dragOver(bravoTh);

    // The clone must emit the same reorder as the real header.
    expect(onVisibleColumnsChange).toHaveBeenCalledWith(['a', 'c', 'b']);
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
    fireEvent.change(realTable().getByLabelText('Date filter operator'), {
      target: { value: 'after' },
    });
    const dateInput = document.querySelector('.overflow-x-auto input[type="date"]');
    fireEvent.change(dateInput, { target: { value: '2024-12-31' } });

    await waitFor(() => expect(countBodyRows()).toBe(1), { timeout: 1000 });
  });

  it('does not reorder when a drag starts on the column kebab', () => {
    const onVisibleColumnsChange = vi.fn();
    renderTable({
      visibleColumns: ['name', 'type'],
      onVisibleColumnsChange,
    });

    // The wrapper span around the kebab is the button's parent element.
    // Scope to the real table so the sticky clone's duplicate kebabs and
    // header cells don't get picked up.
    const kebabButton = realTable().getAllByLabelText('Column actions')[1];
    const kebabWrapper = kebabButton.parentElement;
    const nameTh = realTable().getByText('Name').closest('th');

    // Start the drag on the kebab wrapper, then drag over another header.
    fireEvent.dragStart(kebabWrapper);
    fireEvent.dragOver(nameTh);

    // The wrapper cancels the drag, so no reorder is emitted.
    expect(onVisibleColumnsChange).not.toHaveBeenCalled();
  });

  it('ignores a drop onto the locked first header', () => {
    const onVisibleColumnsChange = vi.fn();
    const COLUMNS_3 = [
      { header: 'Alpha', accessor: 'a', sortable: true },
      { header: 'Bravo', accessor: 'b', sortable: true },
      { header: 'Charlie', accessor: 'c', sortable: true },
    ];
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <DataTable
          tableId="freeze"
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

    // Drag "Charlie" (index 2) onto "Alpha" (index 0). Scope to the real
    // table so the aria-hidden sticky clone's copies aren't matched.
    const alphaTh = realTable().getByText('Alpha').closest('th');
    const charlieTh = realTable().getByText('Charlie').closest('th');
    fireEvent.dragStart(charlieTh);
    fireEvent.dragOver(alphaTh);

    // The first column is locked: no reorder is emitted, Alpha stays frozen.
    expect(onVisibleColumnsChange).not.toHaveBeenCalled();
  });

  it('renders the locked first header as not draggable, in the table and the clone', () => {
    const onVisibleColumnsChange = vi.fn();
    const COLUMNS_3 = [
      { header: 'Alpha', accessor: 'a', sortable: true },
      { header: 'Bravo', accessor: 'b', sortable: true },
      { header: 'Charlie', accessor: 'c', sortable: true },
    ];
    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <DataTable
          tableId="freeze2"
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

    // The <th> at index 0 must not be a drag source; the others stay
    // draggable. React renders the boolean as draggable="false"/"true".
    const alphaTh = realTable().getByText('Alpha').closest('th');
    const bravoTh = realTable().getByText('Bravo').closest('th');
    expect(alphaTh.getAttribute('draggable')).toBe('false');
    expect(bravoTh.getAttribute('draggable')).toBe('true');

    // Same contract in the sticky clone (it reuses DataTableHeader).
    const clone = within(
      document.querySelector('div.sticky.h-0[aria-hidden="true"]'),
    );
    expect(clone.getByText('Alpha').closest('th').getAttribute('draggable')).toBe('false');

    // jsdom does not enforce draggable="false", so also prove the handler
    // side: a drag that somehow starts on the locked header must not
    // reorder when dragged over a neighbour.
    fireEvent.dragStart(alphaTh);
    fireEvent.dragOver(bravoTh);
    expect(onVisibleColumnsChange).not.toHaveBeenCalled();
  });

  it('keeps the dragged header following the cursor across multiple dragOver hops', () => {
    const COLUMNS_4 = [
      { header: 'Alpha', accessor: 'a', sortable: true },
      { header: 'Bravo', accessor: 'b', sortable: true },
      { header: 'Charlie', accessor: 'c', sortable: true },
      { header: 'Delta', accessor: 'd', sortable: true },
    ];
    const onChangeSpy = vi.fn();

    // A stateful wrapper is required here rather than a plain vi.fn() spy.
    // handleDragOver reads the live `columns` prop on every event, so if
    // onVisibleColumnsChange does not feed back into state, the second
    // dragOver would see the original order and compute the wrong result.
    // The Page wrapper closes the loop: each emission updates visibleColumns,
    // which re-renders DataTable with the new order before the next event.
    const Page = () => {
      const [visibleColumns, setVisibleColumns] = useState(['a', 'b', 'c', 'd']);
      return (
        <MockedProvider mocks={[]} addTypename={false}>
          <DataTable
            tableId="multihop"
            graphqlTable="PORTFOLIO_CANDIDATES"
            columns={COLUMNS_4}
            data={[{ a: '1', b: '2', c: '3', d: '4' }]}
            totalCount={1}
            rowKey="a"
            visibleColumns={visibleColumns}
            onVisibleColumnsChange={(next) => {
              onChangeSpy(next);
              setVisibleColumns(next);
            }}
          />
        </MockedProvider>
      );
    };

    render(<Page />);

    // Scope to the real table: the sticky clone renders a duplicate header.
    const th = (label) => realTable().getByText(label).closest('th');

    // Drag "Bravo" rightward: first onto Charlie, then onto Delta. (Alpha
    // is the locked first column and can be neither source nor target.)
    // Hop 1: [a,b,c,d] → remove b → [a,c,d] → insert at index of c (1) → [a,c,b,d]
    // Hop 2: [a,c,b,d] → remove b → [a,c,d] → insert at index of d (2) → [a,c,d,b]
    fireEvent.dragStart(th('Bravo'));
    fireEvent.dragOver(th('Charlie'));
    fireEvent.dragOver(th('Delta'));

    expect(onChangeSpy).toHaveBeenNthCalledWith(1, ['a', 'c', 'b', 'd']);
    expect(onChangeSpy).toHaveBeenLastCalledWith(['a', 'c', 'd', 'b']);

    // The rendered header order reflects the final live-preview state.
    // Each th may contain extra text from the kebab button's accessible
    // label, so we pull out only the leading word from each cell's text.
    const headerOrder = Array.from(
      document.querySelectorAll('.overflow-x-auto thead tr:first-child th'),
    ).map((cell) => cell.textContent.trim().split(/\s+/)[0]);
    expect(headerOrder[0]).toBe('Alpha');
    expect(headerOrder[1]).toBe('Charlie');
    expect(headerOrder[2]).toBe('Delta');
    expect(headerOrder[3]).toBe('Bravo');
  });
});
