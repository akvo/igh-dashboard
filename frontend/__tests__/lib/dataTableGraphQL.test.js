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
});
