import { describe, it, expect } from 'vitest';
import {
  arraySerializer,
  numberSerializer,
  stringSerializer,
} from '@/lib/url-serializers';

// =========================================================
// arraySerializer
// =========================================================

describe('arraySerializer', () => {
  describe('serialize', () => {
    it('returns null for an empty array', () => {
      expect(arraySerializer.serialize([])).toBe(null);
    });

    it('joins a single item', () => {
      expect(arraySerializer.serialize(['Candidate'])).toBe('Candidate');
    });

    it('joins multiple items with commas', () => {
      expect(arraySerializer.serialize(['a', 'b', 'c'])).toBe('a,b,c');
    });

    it('preserves values with spaces', () => {
      expect(arraySerializer.serialize(['Neglected disease', 'Womens Health'])).toBe(
        'Neglected disease,Womens Health',
      );
    });
  });

  describe('deserialize', () => {
    it('returns empty array for null', () => {
      expect(arraySerializer.deserialize(null)).toEqual([]);
    });

    it('returns empty array for undefined', () => {
      expect(arraySerializer.deserialize(undefined)).toEqual([]);
    });

    it('returns empty array for empty string', () => {
      expect(arraySerializer.deserialize('')).toEqual([]);
    });

    it('splits a single value', () => {
      expect(arraySerializer.deserialize('Candidate')).toEqual(['Candidate']);
    });

    it('splits comma-separated values', () => {
      expect(arraySerializer.deserialize('a,b,c')).toEqual(['a', 'b', 'c']);
    });

    it('preserves spaces within values', () => {
      expect(arraySerializer.deserialize('Neglected disease,Womens Health')).toEqual([
        'Neglected disease',
        'Womens Health',
      ]);
    });
  });

  describe('round-trip', () => {
    it('empty array survives round-trip via null', () => {
      const serialized = arraySerializer.serialize([]);
      // null means "absent from URL", which deserializes back to []
      expect(arraySerializer.deserialize(serialized)).toEqual([]);
    });

    it('non-empty array survives round-trip', () => {
      const original = ['Candidate', 'Product'];
      const serialized = arraySerializer.serialize(original);
      expect(arraySerializer.deserialize(serialized)).toEqual(original);
    });

    it('handles the bubbleCandidateTypes default', () => {
      const original = ['Candidate', 'Product'];
      expect(arraySerializer.serialize(original)).toBe('Candidate,Product');
      expect(arraySerializer.deserialize('Candidate,Product')).toEqual(original);
    });
  });
});

// =========================================================
// numberSerializer
// =========================================================

describe('numberSerializer', () => {
  describe('serialize', () => {
    it('converts a number to a string', () => {
      expect(numberSerializer.serialize(3)).toBe('3');
    });

    it('converts 1 to "1"', () => {
      expect(numberSerializer.serialize(1)).toBe('1');
    });

    it('converts 0 to "0"', () => {
      expect(numberSerializer.serialize(0)).toBe('0');
    });
  });

  describe('deserialize', () => {
    it('parses a numeric string', () => {
      expect(numberSerializer.deserialize('3')).toBe(3);
    });

    it('returns null for null input', () => {
      expect(numberSerializer.deserialize(null)).toBe(null);
    });

    it('returns null for undefined input', () => {
      expect(numberSerializer.deserialize(undefined)).toBe(null);
    });

    it('returns null for non-numeric string', () => {
      expect(numberSerializer.deserialize('abc')).toBe(null);
    });

    it('parses leading digits from mixed strings', () => {
      // parseInt('3abc') returns 3 — this is standard JS behavior
      expect(numberSerializer.deserialize('3abc')).toBe(3);
    });
  });

  describe('round-trip', () => {
    it('number survives round-trip', () => {
      const original = 5;
      expect(numberSerializer.deserialize(numberSerializer.serialize(original))).toBe(
        original,
      );
    });
  });
});

// =========================================================
// stringSerializer
// =========================================================

describe('stringSerializer', () => {
  describe('serialize', () => {
    it('returns the string as-is for non-empty values', () => {
      expect(stringSerializer.serialize('development')).toBe('development');
    });

    it('returns null for empty string', () => {
      expect(stringSerializer.serialize('')).toBe(null);
    });
  });

  describe('deserialize', () => {
    it('returns the string as-is when present', () => {
      expect(stringSerializer.deserialize('extract')).toBe('extract');
    });

    it('returns null for null input', () => {
      expect(stringSerializer.deserialize(null)).toBe(null);
    });

    it('returns null for undefined input', () => {
      expect(stringSerializer.deserialize(undefined)).toBe(null);
    });
  });

  describe('round-trip', () => {
    it('non-empty string survives round-trip', () => {
      const original = 'explore';
      expect(stringSerializer.deserialize(stringSerializer.serialize(original))).toBe(
        original,
      );
    });

    it('empty string round-trips to null (caller provides default)', () => {
      const serialized = stringSerializer.serialize('');
      expect(stringSerializer.deserialize(serialized)).toBe(null);
    });
  });
});
