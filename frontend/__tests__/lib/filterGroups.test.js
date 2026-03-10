import { describe, it, expect } from 'vitest';
import {
  MALARIA_GROUP,
  VECTOR_CONTROL_PRODUCT_NAMES,
  VECTOR_CONTROL_CONSOLIDATED_NAME,
  expandDiseaseSelection,
  addMalariaOption,
  consolidateProductOptionsByKey,
  consolidateProductOptionsByName,
  expandProductKeySelection,
  expandProductNameSelection,
  normalizeProductName,
  mergeVectorControlChartData,
  mergeVectorControlStackedData,
} from '../../src/lib/filterGroups';

// ── Disease helpers ─────────────────────────────────────────────

describe('expandDiseaseSelection', () => {
  it('returns input unchanged when Malaria is not selected', () => {
    expect(expandDiseaseSelection(['HIV', 'TB'])).toEqual(['HIV', 'TB']);
  });

  it('returns input unchanged when empty', () => {
    expect(expandDiseaseSelection([])).toEqual([]);
  });

  it('returns null/undefined as-is', () => {
    expect(expandDiseaseSelection(null)).toBeNull();
    expect(expandDiseaseSelection(undefined)).toBeUndefined();
  });

  it('expands Malaria to all members', () => {
    const result = expandDiseaseSelection(['Malaria']);
    expect(result).toContain('P. falciparum');
    expect(result).toContain('P. vivax');
    expect(result).toContain('Multiple / other malaria strains');
    // "Malaria" is both the composite label and a member, so it stays
    expect(result).toContain('Malaria');
    expect(result).toHaveLength(MALARIA_GROUP.members.length);
  });

  it('deduplicates when individual strain is also selected', () => {
    const result = expandDiseaseSelection(['Malaria', 'P. falciparum', 'HIV']);
    const falciparumCount = result.filter(d => d === 'P. falciparum').length;
    expect(falciparumCount).toBe(1);
    expect(result).toContain('HIV');
    expect(result).toContain('P. vivax');
  });
});

describe('addMalariaOption', () => {
  it('adds Malaria when strain members are present', () => {
    const result = addMalariaOption(['P. falciparum', 'HIV']);
    expect(result[0]).toBe('Malaria');
    expect(result).toContain('P. falciparum');
    expect(result).toContain('HIV');
  });

  it('does not add Malaria when no strains present', () => {
    const result = addMalariaOption(['HIV', 'TB']);
    expect(result).not.toContain('Malaria');
  });

  it('does not duplicate Malaria if already present', () => {
    const result = addMalariaOption(['Malaria', 'P. vivax']);
    const count = result.filter(d => d === 'Malaria').length;
    expect(count).toBe(1);
  });
});

// ── Product helpers ─────────────────────────────────────────────

describe('consolidateProductOptionsByKey', () => {
  it('merges VC subtypes into one option', () => {
    const input = [
      { label: 'Vaccines', value: '1' },
      { label: 'Biological vector control products', value: '2' },
      { label: 'Chemical vector control products', value: '3' },
      { label: 'Vector control products', value: '4' },
      { label: 'Vector control products Reservoir targeted vaccines', value: '5' },
    ];
    const result = consolidateProductOptionsByKey(input);
    expect(result).toHaveLength(2);
    const vc = result.find(o => o.label === VECTOR_CONTROL_CONSOLIDATED_NAME);
    expect(vc).toBeDefined();
    expect(vc.value).toBe('2|3|4|5');
  });

  it('returns input unchanged when no VC subtypes', () => {
    const input = [{ label: 'Vaccines', value: '1' }];
    expect(consolidateProductOptionsByKey(input)).toEqual(input);
  });
});

describe('consolidateProductOptionsByName', () => {
  it('merges VC subtypes into one name', () => {
    const input = ['Vaccines', 'Biological vector control products', 'Chemical vector control products'];
    const result = consolidateProductOptionsByName(input);
    expect(result).toContain('Vaccines');
    expect(result).toContain(VECTOR_CONTROL_CONSOLIDATED_NAME);
    expect(result).not.toContain('Biological vector control products');
    expect(result).not.toContain('Chemical vector control products');
  });
});

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

describe('expandProductNameSelection', () => {
  it('expands consolidated name to all VC subtypes', () => {
    const result = expandProductNameSelection([VECTOR_CONTROL_CONSOLIDATED_NAME, 'Vaccines']);
    expect(result).toContain('Vaccines');
    for (const name of VECTOR_CONTROL_PRODUCT_NAMES) {
      expect(result).toContain(name);
    }
    // "Vector control products" is both the consolidated name and a member, so it stays
    expect(result).toContain('Vector control products');
  });

  it('returns unchanged when consolidated name not present', () => {
    expect(expandProductNameSelection(['Vaccines'])).toEqual(['Vaccines']);
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
