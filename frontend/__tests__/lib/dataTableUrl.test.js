import { describe, it, expect } from 'vitest';
import {
  encodeFilters,
  decodeFilters,
  encodeSort,
  decodeSort,
} from '@/lib/dataTableUrl';

describe('encodeFilters / decodeFilters', () => {
  it('encodes empty object as null', () => {
    expect(encodeFilters({})).toBeNull();
  });

  it('round-trips a single text filter', () => {
    const filters = { indication: { kind: 'text', text: 'tuberculosis' } };
    const encoded = encodeFilters(filters);
    expect(encoded).toBe('indication:tuberculosis');
    expect(decodeFilters(encoded)).toEqual({
      indication: { kind: 'category', values: ['tuberculosis'] },
    });
  });

  it('round-trips a single category filter with multiple values', () => {
    const filters = {
      technology_type: { kind: 'category', values: ['Diagnostic', 'Vaccine'] },
    };
    const encoded = encodeFilters(filters);
    expect(encoded).toBe('technology_type:Diagnostic|Vaccine');
    expect(decodeFilters(encoded)).toEqual(filters);
  });

  it('round-trips multiple filters mixing text and category', () => {
    const filters = {
      technology_type: { kind: 'category', values: ['Diagnostic', 'Vaccine'] },
      indication: { kind: 'text', text: 'tuberculosis' },
    };
    const encoded = encodeFilters(filters);
    // Decoder produces category-shaped entries; consumer uses
    // hydrateFiltersFromUrl to reconcile against column config.
    expect(decodeFilters(encoded)).toEqual({
      technology_type: { kind: 'category', values: ['Diagnostic', 'Vaccine'] },
      indication: { kind: 'category', values: ['tuberculosis'] },
    });
  });

  it('URL-encodes values containing special characters', () => {
    const filters = {
      status: { kind: 'category', values: ['Phase III', 'Phase II/III'] },
    };
    const encoded = encodeFilters(filters);
    // : | , must be encoded; spaces and slashes too.
    expect(encoded).toBe(
      'status:Phase%20III|Phase%20II%2FIII',
    );
    expect(decodeFilters(encoded)).toEqual(filters);
  });

  it('decodes null/empty/undefined as empty object', () => {
    expect(decodeFilters(null)).toEqual({});
    expect(decodeFilters('')).toEqual({});
    expect(decodeFilters(undefined)).toEqual({});
  });

  it('decodes single-value category as a 1-element array', () => {
    expect(decodeFilters('phase:III')).toEqual({
      phase: { kind: 'category', values: ['III'] },
    });
  });

  it('drops malformed entries (column without :)', () => {
    expect(decodeFilters('indication')).toEqual({});
    expect(decodeFilters(',phase:III,')).toEqual({
      phase: { kind: 'category', values: ['III'] },
    });
  });

  // -------- NUMBER --------
  // Encoded as `column:n.<op>:value(s)`. NUMBER and DATE both carry an
  // explicit kind prefix on the operator segment so the decoder can
  // disambiguate without consulting the column config.

  it('round-trips NUMBER eq', () => {
    const filters = { enrollment_count: { kind: 'number', operator: 'eq', value: 50 } };
    const encoded = encodeFilters(filters);
    expect(encoded).toBe('enrollment_count:n.eq:50');
    expect(decodeFilters(encoded)).toEqual(filters);
  });

  it('round-trips NUMBER lt / gt', () => {
    expect(decodeFilters(encodeFilters({ x: { kind: 'number', operator: 'lt', value: 100 } })))
      .toEqual({ x: { kind: 'number', operator: 'lt', value: 100 } });
    expect(decodeFilters(encodeFilters({ x: { kind: 'number', operator: 'gt', value: 0 } })))
      .toEqual({ x: { kind: 'number', operator: 'gt', value: 0 } });
  });

  it('round-trips NUMBER between with both bounds', () => {
    const filters = { x: { kind: 'number', operator: 'between', value: 10, valueEnd: 20 } };
    const encoded = encodeFilters(filters);
    expect(encoded).toBe('x:n.bt:10|20');
    expect(decodeFilters(encoded)).toEqual(filters);
  });

  it('round-trips NUMBER between with one bound open', () => {
    const filters = { x: { kind: 'number', operator: 'between', value: 10, valueEnd: null } };
    expect(decodeFilters(encodeFilters(filters))).toEqual({
      x: { kind: 'number', operator: 'between', value: 10, valueEnd: null },
    });
  });

  // -------- DATE --------

  it('round-trips DATE eq / before / after', () => {
    const eq = { d: { kind: 'date', operator: 'eq', value: '2025-01-15' } };
    expect(decodeFilters(encodeFilters(eq))).toEqual(eq);

    const before = { d: { kind: 'date', operator: 'before', value: '2024-12-31' } };
    expect(decodeFilters(encodeFilters(before))).toEqual(before);

    const after = { d: { kind: 'date', operator: 'after', value: '2024-01-01' } };
    expect(decodeFilters(encodeFilters(after))).toEqual(after);
  });

  it('round-trips DATE between', () => {
    const filters = {
      d: { kind: 'date', operator: 'between', value: '2024-01-01', valueEnd: '2024-12-31' },
    };
    const encoded = encodeFilters(filters);
    expect(encoded).toBe('d:d.bt:2024-01-01|2024-12-31');
    expect(decodeFilters(encoded)).toEqual(filters);
  });

  it('round-trips a mixed-kind URL (text + category + number + date)', () => {
    const filters = {
      indication: { kind: 'text', text: 'tb' },
      technology_type: { kind: 'category', values: ['Vaccine'] },
      enrollment_count: { kind: 'number', operator: 'gt', value: 100 },
      start_date: { kind: 'date', operator: 'between', value: '2024-01-01', valueEnd: '2024-12-31' },
    };
    // Decoder returns category-shape for text/category (the hydrator
    // resolves the right kind from column config). NUMBER and DATE
    // come back in their proper kind because their encoded form
    // self-describes.
    const decoded = decodeFilters(encodeFilters(filters));
    expect(decoded.indication).toEqual({ kind: 'category', values: ['tb'] });
    expect(decoded.technology_type).toEqual({ kind: 'category', values: ['Vaccine'] });
    expect(decoded.enrollment_count).toEqual({ kind: 'number', operator: 'gt', value: 100 });
    expect(decoded.start_date).toEqual({
      kind: 'date',
      operator: 'between',
      value: '2024-01-01',
      valueEnd: '2024-12-31',
    });
  });

  it('drops NUMBER with malformed value', () => {
    expect(decodeFilters('x:n.eq:not-a-number')).toEqual({});
  });

  it('drops DATE with malformed value', () => {
    expect(decodeFilters('d:d.eq:not-a-date')).toEqual({});
  });
});

describe('encodeSort / decodeSort', () => {
  it('encodes null as null', () => {
    expect(encodeSort(null)).toBeNull();
  });

  it('round-trips ASC', () => {
    const sort = { column: 'candidate_name', direction: 'asc' };
    const encoded = encodeSort(sort);
    expect(encoded).toBe('candidate_name:asc');
    expect(decodeSort(encoded)).toEqual(sort);
  });

  it('round-trips DESC', () => {
    const sort = { column: 'start_date', direction: 'desc' };
    expect(decodeSort(encodeSort(sort))).toEqual(sort);
  });

  it('decodes null/empty/undefined as null', () => {
    expect(decodeSort(null)).toBeNull();
    expect(decodeSort('')).toBeNull();
    expect(decodeSort(undefined)).toBeNull();
  });

  it('returns null on malformed sort string', () => {
    expect(decodeSort('candidate_name')).toBeNull();
    expect(decodeSort('candidate_name:bogus')).toBeNull();
  });
});
