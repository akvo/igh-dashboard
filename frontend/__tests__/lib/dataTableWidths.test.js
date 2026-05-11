// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { loadWidths, saveWidths, SCHEMA_VERSION } from '@/lib/dataTableWidths';

describe('loadWidths / saveWidths', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns empty object when no entry exists', () => {
    expect(loadWidths('candidates')).toEqual({});
  });

  it('round-trips an object', () => {
    saveWidths('candidates', { indication: 240, key_features: 180 });
    expect(loadWidths('candidates')).toEqual({
      indication: 240,
      key_features: 180,
    });
  });

  it('returns empty object when stored JSON is corrupt', () => {
    localStorage.setItem('dataTable.candidates', 'not-json');
    expect(loadWidths('candidates')).toEqual({});
  });

  it('returns empty object when schema version is older', () => {
    localStorage.setItem(
      'dataTable.candidates',
      JSON.stringify({ v: SCHEMA_VERSION - 1, widths: { foo: 100 } }),
    );
    expect(loadWidths('candidates')).toEqual({});
  });

  it('namespaces by tableId', () => {
    saveWidths('candidates', { a: 100 });
    saveWidths('trials', { a: 200 });
    expect(loadWidths('candidates')).toEqual({ a: 100 });
    expect(loadWidths('trials')).toEqual({ a: 200 });
  });

  it('saveWidths is a no-op on quota errors (does not throw)', () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    };
    expect(() => saveWidths('candidates', { foo: 100 })).not.toThrow();
    Storage.prototype.setItem = original;
  });
});
