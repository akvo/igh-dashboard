import { useEffect, useMemo, useState } from 'react';
import { MockedProvider } from '@apollo/client/testing/react';
import DataTable from '../../components/ui/data-table/DataTable';
import { GET_DISTINCT_VALUES } from '../../graphql/queries/distinctValues';
import page1 from '../../components/ui/data-table/__fixtures__/clinicalTrials.page1.json';
import page2 from '../../components/ui/data-table/__fixtures__/clinicalTrials.page2.json';
import page3 from '../../components/ui/data-table/__fixtures__/clinicalTrials.page3.json';

// =========================================================
// DataTable / Server-side — Clinical trials & candidates
// =========================================================
//
// Case 2 (the Extract sub-tab). In production every interaction
// triggers a real refetch with new GraphQL variables. The story
// simulates that by keeping the union of the three captured fixture
// pages in memory and filtering / sorting / slicing it locally inside
// a useEffect that fires whenever any input changes — so the table
// visibly reacts to filters and sort just like the production page
// will.
//
// `serverSide={true}` still means TanStack does NOT touch the data
// array on its own; the story is acting as the "server" here. The
// table receives only the current page slice plus a totalCount that
// reflects the filtered set, so pagination math stays correct.
//
// CategoryFilter dropdowns hit Apollo's `distinctValues` query just
// like production. The story wraps the table in a MockedProvider with
// a single reusable mock that derives the response from the in-memory
// fixture union — same shape the real backend will return once Phase
// 1 lands. No `categoryOptions` shortcut: the only way the dropdown
// gets populated is via the GraphQL query, so this story actually
// exercises the live-backend code path.

// Inject a synthetic `enrollment_count` so the reviewer can exercise
// the NUMBER filter against this story. Derived deterministically from
// trial_id so the values are stable across re-renders. The captured
// fixture didn't include the real column; once Phase 1 + 3 lands, the
// production page will get the actual values from the GraphQL query.
function withSyntheticEnrollment(rows) {
  return rows.map((r) => ({
    ...r,
    enrollment_count: r.enrollment_count ?? ((r.trial_id ?? 0) % 500) + 10,
  }));
}

const ALL_ROWS = [
  ...withSyntheticEnrollment(page1.data.clinicalTrials.nodes),
  ...withSyntheticEnrollment(page2.data.clinicalTrials.nodes),
  ...withSyntheticEnrollment(page3.data.clinicalTrials.nodes),
];

const COLUMNS = [
  {
    header: 'Trial ID',
    accessor: 'clinicaltrialid',
    filter: { kind: 'text' },
    sortable: false,
    hideable: false,
  },
  {
    header: 'Trial name',
    accessor: 'trial_name',
    filter: { kind: 'text' },
    sortable: true,
    hideable: true,
  },
  {
    header: 'Candidate',
    accessor: 'candidate_name',
    filter: { kind: 'text' },
    sortable: true,
    hideable: true,
  },
  {
    header: 'Disease',
    accessor: 'disease_name',
    filter: { kind: 'category' },
    sortable: true,
    hideable: true,
  },
  {
    header: 'Product',
    accessor: 'product_name',
    filter: { kind: 'category' },
    sortable: true,
    hideable: true,
  },
  {
    header: 'Phase',
    accessor: 'trial_phase',
    filter: { kind: 'category' },
    sortable: true,
    hideable: true,
  },
  {
    header: 'Status',
    accessor: 'status',
    filter: { kind: 'category' },
    sortable: true,
    hideable: true,
  },
  {
    header: 'Enrollment',
    accessor: 'enrollment_count',
    filter: { kind: 'number' },
    sortable: true,
    hideable: true,
    type: 'number',
  },
  {
    header: 'Start date',
    accessor: 'start_date',
    filter: { kind: 'date' },
    sortable: true,
    hideable: true,
  },
  {
    header: 'End date',
    accessor: 'end_date',
    filter: { kind: 'date' },
    sortable: true,
    hideable: true,
    defaultHidden: true,
  },
  {
    header: 'Last updated',
    accessor: 'last_updated',
    filter: { kind: 'date' },
    sortable: true,
    hideable: true,
  },
  {
    header: 'Sponsor',
    accessor: 'sponsor',
    filter: { kind: 'text' },
    sortable: true,
    hideable: true,
  },
  {
    header: 'Locations',
    accessor: 'locations',
    filter: { kind: 'text' },
    sortable: false,
    hideable: true,
  },
];

// Single reusable Apollo mock for the distinctValues query: matches
// any variables and computes the response from the in-memory fixture
// union. Mirrors what the real backend resolver will do (filter rows
// by every other column's filter, return distinct values for the
// asking column). `maxUsageCount: Infinity` lets one mock satisfy
// every dropdown open / re-open without re-declaring per column.
function deriveDistinctFromRows(rows, column, otherFilters) {
  let pool = rows;
  for (const [accessor, entry] of Object.entries(otherFilters ?? {})) {
    if (!entry || accessor === column) continue;
    if (entry.kind === 'text') {
      const text = (entry.text ?? '').toLowerCase();
      if (!text) continue;
      pool = pool.filter((r) =>
        String(r[accessor] ?? '').toLowerCase().includes(text),
      );
    } else if (entry.kind === 'category') {
      const values = entry.values ?? [];
      if (values.length === 0) continue;
      pool = pool.filter((r) => values.includes(r[accessor]));
    }
  }
  const seen = new Set();
  for (const r of pool) {
    const v = r?.[column];
    if (v == null || v === '') continue;
    seen.add(v);
  }
  return [...seen].sort((a, b) => String(a).localeCompare(String(b)));
}

const DISTINCT_VALUES_MOCK = {
  request: { query: GET_DISTINCT_VALUES },
  variableMatcher: () => true,
  result: ({ column, filter }) => {
    // The component strips the asking column's own filter before
    // sending. The shape it sends includes a `column_filters` array;
    // turn that back into the filters object the helper expects.
    const otherFilters = {};
    for (const cf of filter?.column_filters ?? []) {
      if (cf.kind === 'TEXT') {
        otherFilters[cf.column] = { kind: 'text', text: cf.text };
      } else if (cf.kind === 'CATEGORY') {
        otherFilters[cf.column] = { kind: 'category', values: cf.values };
      }
      // NUMBER / DATE handled when those land; not needed for this story.
    }
    return {
      data: {
        distinctValues: deriveDistinctFromRows(ALL_ROWS, column, otherFilters),
      },
    };
  },
  maxUsageCount: Number.POSITIVE_INFINITY,
};

function applyFiltersAndSort(rows, filters, sort) {
  let out = rows;
  for (const [accessor, entry] of Object.entries(filters ?? {})) {
    if (!entry) continue;
    if (entry.kind === 'text') {
      const text = (entry.text ?? '').toLowerCase();
      if (!text) continue;
      out = out.filter((r) =>
        String(r[accessor] ?? '').toLowerCase().includes(text),
      );
    } else if (entry.kind === 'category') {
      const values = entry.values ?? [];
      if (values.length === 0) continue;
      out = out.filter((r) => values.includes(r[accessor]));
    } else if (entry.kind === 'number') {
      const { operator, value, valueEnd } = entry;
      out = out.filter((r) => {
        const cell = r[accessor];
        if (cell == null || !Number.isFinite(Number(cell))) return false;
        const n = Number(cell);
        if (operator === 'eq') return value != null && n === value;
        if (operator === 'lt') return value != null && n < value;
        if (operator === 'gt') return value != null && n > value;
        if (operator === 'between') {
          if (value == null && valueEnd == null) return true;
          if (value != null && n < value) return false;
          if (valueEnd != null && n > valueEnd) return false;
          return true;
        }
        return true;
      });
    } else if (entry.kind === 'date') {
      const { operator, value, valueEnd } = entry;
      out = out.filter((r) => {
        const raw = r[accessor];
        if (raw == null || raw === '') return false;
        const day = String(raw).slice(0, 10);
        if (operator === 'eq') return !!value && day === value;
        if (operator === 'before') return !!value && raw < value;
        if (operator === 'after') return !!value && raw > value;
        if (operator === 'between') {
          if (!value && !valueEnd) return true;
          if (value && day < value) return false;
          if (valueEnd && day > valueEnd) return false;
          return true;
        }
        return true;
      });
    }
  }
  if (sort?.column && sort?.direction) {
    const dir = sort.direction === 'desc' ? -1 : 1;
    out = [...out].sort((a, b) => {
      const av = a[sort.column];
      const bv = b[sort.column];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return (av - bv) * dir;
      }
      return String(av).localeCompare(String(bv)) * dir;
    });
  }
  return out;
}

export default {
  title: 'DataTable/Server-side — Clinical trials & candidates',
  component: DataTable,
  parameters: {
    layout: 'padded',
  },
};

export const Default = () => {
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState({});
  const [sort, setSort] = useState(null);
  const [visibleColumns, setVisibleColumns] = useState(
    COLUMNS.filter((c) => !c.defaultHidden).map((c) => c.accessor),
  );

  // Memoise the pre-filter+sort computation so we don't redo it on
  // every render — only when filters or sort actually change.
  const filteredSorted = useMemo(
    () => applyFiltersAndSort(ALL_ROWS, filters, sort),
    [filters, sort],
  );

  // Simulate a 600ms backend roundtrip for any input change. The
  // resolved "response" is the slice of `filteredSorted` corresponding
  // to the current page + page size.
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      const start = (page - 1) * itemsPerPage;
      setData(filteredSorted.slice(start, start + itemsPerPage));
      setTotalCount(filteredSorted.length);
      setLoading(false);
    }, 600);
    return () => clearTimeout(t);
  }, [filteredSorted, page, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(totalCount / itemsPerPage));
  const hasNextPage = page < totalPages;

  return (
    <MockedProvider mocks={[DISTINCT_VALUES_MOCK]} addTypename={false}>
      <DataTable
        tableId="story-server-clinical-trials"
        graphqlTable="CLINICAL_TRIALS"
        columns={COLUMNS}
        data={data}
        serverSide={true}
        totalCount={totalCount}
        hasNextPage={hasNextPage}
        loading={loading}
        page={page}
        onPageChange={setPage}
        filters={filters}
        onFiltersChange={(next) => {
          setFilters(next);
          setPage(1);
        }}
        sort={sort}
        onSortChange={(next) => {
          setSort(next);
          setPage(1);
        }}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        itemsPerPage={itemsPerPage}
        onItemsPerPageChange={setItemsPerPage}
        itemsPerPageOptions={[10, 25, 50, 100]}
        rowKey="trial_id"
      />
    </MockedProvider>
  );
};
