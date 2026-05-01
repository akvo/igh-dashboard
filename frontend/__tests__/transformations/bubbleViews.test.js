import { describe, it, expect } from 'vitest';
import {
  transformGhaProductTypeSummaries,
  transformDiseaseSummaries,
  transformDiseaseProductTypeSummaries,
} from '@/lib/transformations';

describe('GHA × Product Type transformation', () => {
  it('returns empty array for null / empty input', () => {
    expect(transformGhaProductTypeSummaries(null)).toEqual([]);
    expect(transformGhaProductTypeSummaries([])).toEqual([]);
  });

  it('flattens each (area, product_type) bucket into a chart row', () => {
    const raw = [
      { global_health_area: 'Neglected disease', product_type: 'Drugs', candidateCount: 900, productCount: 53 },
      { global_health_area: 'Womens Health', product_type: 'Diagnostics', candidateCount: 340, productCount: 45 },
    ];

    const result = transformGhaProductTypeSummaries(raw);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      key: 'Neglected disease|Drugs',
      group: 'Neglected diseases',   // mapped through HEALTH_AREA_DISPLAY_NAMES
      productType: 'Drugs',
      value: 953,
      candidateCount: 900,
      productCount: 53,
    });
    expect(result[0].label).toContain('Drugs');
    expect(result[1].group).toBe("Women's health");
  });

  it("uses a stable composite key so bubbles don't remount across refetches", () => {
    const raw = [
      { global_health_area: 'Neglected disease', product_type: 'Drugs', candidateCount: 10, productCount: 1 },
    ];
    const once = transformGhaProductTypeSummaries(raw);
    const twice = transformGhaProductTypeSummaries(raw);
    expect(once[0].key).toBe(twice[0].key);
  });
});

describe('Disease transformation', () => {
  it('returns empty array for null / empty input', () => {
    expect(transformDiseaseSummaries(null)).toEqual([]);
    expect(transformDiseaseSummaries([])).toEqual([]);
  });

  it('exposes the display-friendly GHA under `group` for table sorting', () => {
    const raw = [
      { disease_group_name: 'Malaria', global_health_area: 'Neglected disease', candidateCount: 180, productCount: 20 },
    ];
    const result = transformDiseaseSummaries(raw);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      key: 'Malaria',
      name: 'Malaria',
      group: 'Neglected diseases',
      value: 200,
    });
  });
});

describe('Disease × Product Type transformation', () => {
  it('returns empty array for null / empty input', () => {
    expect(transformDiseaseProductTypeSummaries(null)).toEqual([]);
    expect(transformDiseaseProductTypeSummaries([])).toEqual([]);
  });

  it('keeps disease, productType, and group as separate fields so the table can address each column', () => {
    const raw = [
      {
        disease_group_name: 'Tuberculosis',
        global_health_area: 'Neglected disease',
        product_type: 'Vaccines',
        candidateCount: 80,
        productCount: 14,
      },
    ];
    const result = transformDiseaseProductTypeSummaries(raw);
    expect(result[0]).toMatchObject({
      key: 'Tuberculosis|Vaccines',
      disease: 'Tuberculosis',
      productType: 'Vaccines',
      group: 'Neglected diseases',
      value: 94,
    });
  });
});
