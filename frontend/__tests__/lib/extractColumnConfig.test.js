import { describe, it, expect } from 'vitest';
import { EXTRACT_TAB_COLUMNS } from '@/lib/extractColumnConfig';

describe('Extract candidates-approved Disease column shows the canonical label', () => {
  it('is labeled "Disease" and its CSV value is the canonical disease label', () => {
    const col = EXTRACT_TAB_COLUMNS['candidates-approved'].find((c) => c.id === 'primaryDisease');
    expect(col).toBeDefined();
    expect(col.label).toBe('Disease');
    // The backend returns the computed label as disease_name (here a
    // Malaria combined label and a plain primary group).
    expect(col.csvAccessor({ disease_name: 'Malaria – P. falciparum' })).toBe(
      'Malaria – P. falciparum',
    );
    expect(col.csvAccessor({ disease_name: 'Dengue' })).toBe('Dengue');
    expect(col.filter).toEqual({ kind: 'category' });
  });
});

describe('Extract Product columns show the raw sub-VCP (no consolidation)', () => {
  for (const tab of ['candidates-approved', 'rd-priorities', 'rd-only']) {
    it(`exposes the raw product_name on the ${tab} tab`, () => {
      const col = EXTRACT_TAB_COLUMNS[tab].find((c) => c.id === 'product');
      expect(col).toBeDefined();
      expect(col.render).toBeUndefined();
      expect(col.csvAccessor).toBeUndefined();
      expect(col.accessor).toBe('product_name');
      expect(col.filter).toEqual({ kind: 'category' });
    });
  }
});
