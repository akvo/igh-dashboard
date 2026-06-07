import { describe, it, expect } from 'vitest';
import { toColumnFilters } from '@/lib/dataTableGraphQL';

describe('toColumnFilters hierarchical', () => {
  it('converts a hierarchical entry to HIERARCHICAL with both level arrays', () => {
    const out = toColumnFilters({
      disease_name: { kind: 'hierarchical', primary: ['Dengue'], secondary: ['Cholera'] },
    });
    expect(out).toEqual([
      { column: 'disease_name', kind: 'HIERARCHICAL', primary_values: ['Dengue'], secondary_values: ['Cholera'] },
    ]);
  });

  it('drops a hierarchical entry with both levels empty', () => {
    const out = toColumnFilters({
      disease_name: { kind: 'hierarchical', primary: [], secondary: [] },
    });
    expect(out).toBeUndefined();
  });

  it('keeps a hierarchical entry with only one level populated', () => {
    const out = toColumnFilters({
      disease_name: { kind: 'hierarchical', primary: [], secondary: ['Shigella'] },
    });
    expect(out).toEqual([
      { column: 'disease_name', kind: 'HIERARCHICAL', primary_values: [], secondary_values: ['Shigella'] },
    ]);
  });
});
