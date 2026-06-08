import { describe, it, expect } from 'vitest';
import {
  specificDiseaseLabel,
  buildCandidateColumns,
  buildApprovedProductColumns,
} from '@/lib/exploreColumnConfig';

describe('specificDiseaseLabel', () => {
  it('shows the secondary (specific) disease when present', () => {
    expect(
      specificDiseaseLabel({ disease_name: 'Diarrhoeal diseases', secondary_disease_name: 'Cholera' }),
    ).toBe('Cholera');
  });

  it('falls back to the parent when there is no secondary disease', () => {
    expect(
      specificDiseaseLabel({ disease_name: 'Dengue', secondary_disease_name: null }),
    ).toBe('Dengue');
  });

  it('returns an empty string when neither is present', () => {
    expect(specificDiseaseLabel({})).toBe('');
  });
});

describe('Disease column shows the specific disease with a flat category filter', () => {
  const row = { disease_name: 'Diarrhoeal diseases', secondary_disease_name: 'Cholera' };

  for (const [name, build] of [
    ['candidates', buildCandidateColumns],
    ['approved products', buildApprovedProductColumns],
  ]) {
    it(`uses the specific disease for CSV and stays a flat category filter (${name})`, () => {
      const col = build().find((c) => c.header === 'Disease');
      expect(col.csvAccessor(row)).toBe('Cholera');
      expect(col.filter).toEqual({ kind: 'category' });
    });
  }
});
