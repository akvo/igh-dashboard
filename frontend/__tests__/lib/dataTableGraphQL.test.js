import { describe, it, expect } from 'vitest';
import { toColumnSort } from '@/lib/dataTableGraphQL';

describe('toColumnSort', () => {
  it('returns undefined for null / empty', () => {
    expect(toColumnSort(null)).toBeUndefined();
    expect(toColumnSort(undefined)).toBeUndefined();
    expect(toColumnSort([])).toBeUndefined();
  });

  it('converts levels to uppercase directions, preserving order', () => {
    expect(
      toColumnSort([
        { column: 'disease', direction: 'asc' },
        { column: 'phase', direction: 'desc' },
      ]),
    ).toEqual([
      { column: 'disease', direction: 'ASC' },
      { column: 'phase', direction: 'DESC' },
    ]);
  });

  it('drops malformed entries; undefined when none survive', () => {
    expect(
      toColumnSort([{ column: '', direction: 'asc' }, { column: 'a' }]),
    ).toBeUndefined();
    expect(
      toColumnSort([{ column: 'a', direction: 'sideways' }, { column: 'b', direction: 'desc' }]),
    ).toEqual([{ column: 'b', direction: 'DESC' }]);
  });
});
