import { describe, it, expect } from 'vitest';
import {
  clickSort,
  shiftClickSort,
  kebabSortEntries,
} from '@/lib/dataTableSort';

describe('clickSort', () => {
  it('starts an ascending single sort from empty', () => {
    expect(clickSort([], 'name')).toEqual([{ column: 'name', direction: 'asc' }]);
  });

  it('cycles the sole sorted column asc → desc → none', () => {
    expect(clickSort([{ column: 'name', direction: 'asc' }], 'name')).toEqual([
      { column: 'name', direction: 'desc' },
    ]);
    expect(clickSort([{ column: 'name', direction: 'desc' }], 'name')).toEqual([]);
  });

  it('replaces the whole sort when other columns are sorted', () => {
    const multi = [
      { column: 'name', direction: 'asc' },
      { column: 'type', direction: 'desc' },
    ];
    // On a column that is a level of a multi-sort: replace, not cycle.
    expect(clickSort(multi, 'type')).toEqual([{ column: 'type', direction: 'asc' }]);
    // On a column outside the sort: replace too.
    expect(clickSort(multi, 'year')).toEqual([{ column: 'year', direction: 'asc' }]);
    // Single sort on ANOTHER column: replace.
    expect(clickSort([{ column: 'name', direction: 'desc' }], 'type')).toEqual([
      { column: 'type', direction: 'asc' },
    ]);
  });
});

describe('shiftClickSort', () => {
  it('appends a new ascending level', () => {
    expect(shiftClickSort([{ column: 'name', direction: 'asc' }], 'type')).toEqual([
      { column: 'name', direction: 'asc' },
      { column: 'type', direction: 'asc' },
    ]);
  });

  it('flips an ascending level to descending in place', () => {
    expect(
      shiftClickSort(
        [
          { column: 'name', direction: 'asc' },
          { column: 'type', direction: 'asc' },
        ],
        'name',
      ),
    ).toEqual([
      { column: 'name', direction: 'desc' },
      { column: 'type', direction: 'asc' },
    ]);
  });

  it('removes a descending level; later levels shift up', () => {
    expect(
      shiftClickSort(
        [
          { column: 'name', direction: 'desc' },
          { column: 'type', direction: 'asc' },
        ],
        'name',
      ),
    ).toEqual([{ column: 'type', direction: 'asc' }]);
  });
});

describe('kebabSortEntries', () => {
  const labels = (sort, column) => kebabSortEntries(sort, column).map((e) => e.label);

  it('empty sort → single "Sort ascending" entry', () => {
    expect(labels([], 'name')).toEqual(['Sort ascending']);
    expect(kebabSortEntries([], 'name')[0].next).toEqual([
      { column: 'name', direction: 'asc' },
    ]);
  });

  it('sole sorted column cycles: asc → "Sort descending", desc → "Remove sorting"', () => {
    expect(labels([{ column: 'name', direction: 'asc' }], 'name')).toEqual([
      'Sort descending',
    ]);
    expect(labels([{ column: 'name', direction: 'desc' }], 'name')).toEqual([
      'Remove sorting',
    ]);
    expect(
      kebabSortEntries([{ column: 'name', direction: 'desc' }], 'name')[0].next,
    ).toEqual([]);
  });

  it('sort active, column not a level → replace + append entries', () => {
    const sort = [{ column: 'name', direction: 'asc' }];
    expect(labels(sort, 'type')).toEqual(['Sort ascending only', 'Add sort level']);
    const [replace, append] = kebabSortEntries(sort, 'type');
    expect(replace.next).toEqual([{ column: 'type', direction: 'asc' }]);
    expect(append.next).toEqual([
      { column: 'name', direction: 'asc' },
      { column: 'type', direction: 'asc' },
    ]);
  });

  it('multi-sort, column is an asc level → replace + flip entries', () => {
    const sort = [
      { column: 'name', direction: 'asc' },
      { column: 'type', direction: 'asc' },
    ];
    expect(labels(sort, 'type')).toEqual([
      'Sort ascending only',
      'Sort level descending',
    ]);
  });

  it('multi-sort, column is a desc level → replace + remove entries', () => {
    const sort = [
      { column: 'name', direction: 'asc' },
      { column: 'type', direction: 'desc' },
    ];
    expect(labels(sort, 'type')).toEqual(['Sort ascending only', 'Remove sort level']);
    const remove = kebabSortEntries(sort, 'type')[1];
    expect(remove.next).toEqual([{ column: 'name', direction: 'asc' }]);
    expect(remove.dir).toBe('remove');
  });
});
