import { describe, it, expect } from 'vitest';
import {
  specificDiseaseLabel,
  buildCandidateColumns,
  buildApprovedProductColumns,
  buildClinicalTrialColumns,
  toCSVColumns,
} from '@/lib/exploreColumnConfig';

describe('specificDiseaseLabel', () => {
  it('shows the canonical label the backend returns as disease_name', () => {
    expect(specificDiseaseLabel({ disease_name: 'Cholera' })).toBe('Cholera');
  });

  it('passes through the Malaria combined label unchanged', () => {
    expect(
      specificDiseaseLabel({ disease_name: 'Malaria – P. falciparum' }),
    ).toBe('Malaria – P. falciparum');
  });

  it('returns an empty string when no disease name is present', () => {
    expect(specificDiseaseLabel({})).toBe('');
  });
});

describe('Disease column shows the canonical label with a flat category filter', () => {
  const row = { disease_name: 'Cholera' };

  for (const [name, build] of [
    ['candidates', buildCandidateColumns],
    ['approved products', buildApprovedProductColumns],
  ]) {
    it(`uses the canonical label for CSV and stays a flat category filter (${name})`, () => {
      const col = build().find((c) => c.header === 'Disease');
      expect(col.csvAccessor(row)).toBe('Cholera');
      expect(col.filter).toEqual({ kind: 'category' });
    });
  }
});

describe('Product column shows the specific sub-VCP (no consolidation)', () => {
  const row = { product_name: 'Biological vector control products' };

  for (const [name, build] of [
    ['candidates', buildCandidateColumns],
    ['approved products', buildApprovedProductColumns],
  ]) {
    it(`exposes the raw product_name, not the consolidated umbrella (${name})`, () => {
      const cols = build();
      const col = cols.find((c) => c.header === 'Product');
      // No consolidating render/csvAccessor — the raw product name shows.
      expect(col.render).toBeUndefined();
      expect(col.csvAccessor).toBeUndefined();
      expect(col.accessor).toBe('product_name');
      expect(col.filter).toEqual({ kind: 'category' });
      // CSV maps the column to the raw accessor (csvAccessor || accessor).
      const csvCol = toCSVColumns(cols).find((c) => c.label === 'Product');
      expect(csvCol.accessor).toBe('product_name');
      // Sanity: the raw value is the specific sub-VCP, not the umbrella.
      expect(row.product_name).not.toBe('Vector control products');
    });
  }
});

describe('Clinical trial Source column links to each trial registration', () => {
  it('marks the Source column as a link so the cell is clickable', () => {
    const columns = buildClinicalTrialColumns();
    const source = columns.find((c) => c.accessor === 'source_text');
    expect(source).toBeTruthy();
    expect(source.type).toBe('link');
  });
});
