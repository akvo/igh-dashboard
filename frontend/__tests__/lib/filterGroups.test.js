import { describe, it, expect } from 'vitest';
import {
  isVcpOnlySelection,
  VECTOR_CONTROL_PRODUCT_NAMES,
  VECTOR_CONTROL_CONSOLIDATED_NAME,
  expandProductKeySelection,
  normalizeProductName,
  mergeVectorControlChartData,
  mergeVectorControlStackedData,
  vcpMemberKeys,
} from '../../src/lib/filterGroups';

// ── Product helpers ─────────────────────────────────────────────

describe('expandProductKeySelection', () => {
  it('splits pipe-separated keys', () => {
    const result = expandProductKeySelection(['1', '2|3|4']);
    expect(result).toEqual(['1', '2', '3', '4']);
  });

  it('returns unchanged when no pipes', () => {
    expect(expandProductKeySelection(['1', '2'])).toEqual(['1', '2']);
  });

  it('handles empty/null', () => {
    expect(expandProductKeySelection([])).toEqual([]);
    expect(expandProductKeySelection(null)).toBeNull();
  });
});

describe('normalizeProductName', () => {
  it('replaces VC subtypes with consolidated name', () => {
    expect(normalizeProductName('Biological vector control products')).toBe(VECTOR_CONTROL_CONSOLIDATED_NAME);
    expect(normalizeProductName('Chemical vector control products')).toBe(VECTOR_CONTROL_CONSOLIDATED_NAME);
  });

  it('leaves other names unchanged', () => {
    expect(normalizeProductName('Vaccines')).toBe('Vaccines');
  });
});

describe('mergeVectorControlStackedData', () => {
  it('returns null/empty as-is', () => {
    expect(mergeVectorControlStackedData(null)).toBeNull();
    expect(mergeVectorControlStackedData([])).toEqual([]);
  });

  it('returns input unchanged when no VC rows', () => {
    const input = [
      { category: 'Vaccines', phase1: 5, phase2: 3 },
      { category: 'Diagnostics', phase1: 2, phase2: 1 },
    ];
    expect(mergeVectorControlStackedData(input)).toEqual(input);
  });

  it('sums phase counts from multiple VC rows into one consolidated row', () => {
    const input = [
      { category: 'Vaccines', phase1: 10, phase2: 5 },
      { category: 'Biological vector control products', phase1: 2, phase2: 1 },
      { category: 'Chemical vector control products', phase1: 3, phase2: 4 },
      { category: 'Vector control products', phase1: 1, phase2: 0 },
      { category: 'Diagnostics', phase1: 7, phase2: 2 },
    ];
    const result = mergeVectorControlStackedData(input);
    expect(result).toHaveLength(3);
    expect(result.find(r => r.category === 'Vaccines')).toEqual({ category: 'Vaccines', phase1: 10, phase2: 5 });
    expect(result.find(r => r.category === 'Diagnostics')).toEqual({ category: 'Diagnostics', phase1: 7, phase2: 2 });
    const vc = result.find(r => r.category === VECTOR_CONTROL_CONSOLIDATED_NAME);
    expect(vc).toEqual({ category: VECTOR_CONTROL_CONSOLIDATED_NAME, phase1: 6, phase2: 5 });
  });

  it('preserves non-VC rows unchanged', () => {
    const input = [
      { category: 'Vaccines', discovery: 3 },
      { category: 'Chemical vector control products', discovery: 1 },
    ];
    const result = mergeVectorControlStackedData(input);
    expect(result.find(r => r.category === 'Vaccines')).toEqual({ category: 'Vaccines', discovery: 3 });
  });

  it('handles partial phase keys across VC rows', () => {
    const input = [
      { category: 'Biological vector control products', phase1: 2 },
      { category: 'Chemical vector control products', phase2: 3 },
    ];
    const result = mergeVectorControlStackedData(input);
    const vc = result.find(r => r.category === VECTOR_CONTROL_CONSOLIDATED_NAME);
    expect(vc.phase1).toBe(2);
    expect(vc.phase2).toBe(3);
  });
});

describe('vcpMemberKeys', () => {
  it('returns string keys for products whose name is a VC subtype', () => {
    const products = [
      { product_key: 30, product_name: 'Drugs' },
      { product_key: 35, product_name: 'Chemical vector control products' },
      { product_key: 58, product_name: 'Vector control products' },
    ];
    expect(vcpMemberKeys(products)).toEqual(['35', '58']);
  });

  it('handles empty/null', () => {
    expect(vcpMemberKeys(null)).toEqual([]);
    expect(vcpMemberKeys([])).toEqual([]);
  });
});

describe('mergeVectorControlChartData', () => {
  it('sums VC subtype values into one row', () => {
    const input = [
      { name: 'Vaccines', value: 10 },
      { name: 'Biological vector control products', value: 3 },
      { name: 'Chemical vector control products', value: 2 },
      { name: 'Diagnostics', value: 5 },
    ];
    const result = mergeVectorControlChartData(input);
    expect(result).toHaveLength(3);
    const vc = result.find(r => r.name === VECTOR_CONTROL_CONSOLIDATED_NAME);
    expect(vc.value).toBe(5);
    expect(result.find(r => r.name === 'Vaccines').value).toBe(10);
  });

  it('returns unchanged when no VC subtypes', () => {
    const input = [{ name: 'Vaccines', value: 10 }];
    expect(mergeVectorControlChartData(input)).toEqual(input);
  });

  it('handles empty/null', () => {
    expect(mergeVectorControlChartData([])).toEqual([]);
    expect(mergeVectorControlChartData(null)).toBeNull();
  });
});

describe('isVcpOnlySelection', () => {
  it('returns false for an empty selection (the "All" case)', () => {
    expect(isVcpOnlySelection([])).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isVcpOnlySelection(null)).toBe(false);
    expect(isVcpOnlySelection(undefined)).toBe(false);
  });

  it('returns true when every selected product is a VCP subtype', () => {
    expect(
      isVcpOnlySelection([
        'Biological vector control products',
        'Chemical vector control products',
      ]),
    ).toBe(true);
  });

  it('returns true when all four VCP subtypes are selected (whole group)', () => {
    expect(isVcpOnlySelection([...VECTOR_CONTROL_PRODUCT_NAMES])).toBe(true);
  });

  it('returns true for the consolidated VCP name alone', () => {
    expect(isVcpOnlySelection(['Vector control products'])).toBe(true);
  });

  it('returns false for a mixed VCP + non-VCP selection', () => {
    expect(
      isVcpOnlySelection(['Vaccine', 'Biological vector control products']),
    ).toBe(false);
  });

  it('returns false when no VCP subtype is present', () => {
    expect(isVcpOnlySelection(['Vaccine', 'Diagnostic'])).toBe(false);
  });
});
