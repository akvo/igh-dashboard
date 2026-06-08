import { describe, it, expect } from 'vitest';
import { EXTRACT_TAB_COLUMNS } from '@/lib/extractColumnConfig';

describe('Extract candidates-approved Disease column shows the specific disease', () => {
  it('is labeled "Disease" and its CSV value is the specific disease', () => {
    const col = EXTRACT_TAB_COLUMNS['candidates-approved'].find((c) => c.id === 'primaryDisease');
    expect(col).toBeDefined();
    expect(col.label).toBe('Disease');
    expect(
      col.csvAccessor({ disease_name: 'Diarrhoeal diseases', secondary_disease_name: 'Cholera' }),
    ).toBe('Cholera');
    expect(
      col.csvAccessor({ disease_name: 'Dengue', secondary_disease_name: null }),
    ).toBe('Dengue');
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
