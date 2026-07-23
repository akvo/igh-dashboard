import { describe, it, expect } from 'vitest';
import { sortSerializer, makeFilterSerializer } from '@/lib/dataTableUrl';

const COLUMNS = [
  { accessor: 'name', filter: { kind: 'text' } },
  { accessor: 'gha', filter: { kind: 'category' } },
];

describe('sortSerializer', () => {
  it('round-trips a sort descriptor', () => {
    const sort = [{ column: 'name', direction: 'asc' }];
    const encoded = sortSerializer.serialize(sort);
    expect(encoded).toBe('name:asc');
    expect(sortSerializer.deserialize(encoded)).toEqual(sort);
  });

  it('serializes null sort to null (URL key elided)', () => {
    expect(sortSerializer.serialize(null)).toBeNull();
  });

  it('deserializes null/empty to null', () => {
    expect(sortSerializer.deserialize(null)).toBeNull();
    expect(sortSerializer.deserialize('')).toBeNull();
  });
});

describe('makeFilterSerializer', () => {
  it('hydrates a text column back to a text entry against its columns', () => {
    const ser = makeFilterSerializer(COLUMNS);
    const encoded = ser.serialize({ name: { kind: 'text', text: 'acme' } });
    expect(ser.deserialize(encoded)).toEqual({ name: { kind: 'text', text: 'acme' } });
  });

  it('hydrates a category column back to a category entry', () => {
    const ser = makeFilterSerializer(COLUMNS);
    const encoded = ser.serialize({ gha: { kind: 'category', values: ['Sub-Saharan Africa'] } });
    expect(ser.deserialize(encoded)).toEqual({ gha: { kind: 'category', values: ['Sub-Saharan Africa'] } });
  });

  it('defaults debounceMs to 500 and accepts an override', () => {
    expect(makeFilterSerializer(COLUMNS).debounceMs).toBe(500);
    expect(makeFilterSerializer(COLUMNS, 0).debounceMs).toBe(0);
  });
});
