// =========================================================
// URL Serializers
// =========================================================
//
// Pure serialization helpers for converting between JavaScript
// values and URL query parameter strings. Used by useUrlState
// to persist filter/tab state in the URL.
//
// These serializers handle FORMAT CONVERSION only (array ↔ string,
// number ↔ string, etc.). Default-value elision (omitting a key
// from the URL when the value equals the default) is handled by
// useUrlState, not here.
//
// Assumption: array values in this project (health area names,
// disease names, product names, phase keys) do not contain
// commas, so comma-delimited encoding is safe.

/**
 * Serialize/deserialize arrays as comma-separated strings.
 *
 *   [] → null (empty array has no meaningful URL representation)
 *   ['a', 'b'] → 'a,b'
 *   'a,b' → ['a', 'b']
 *   null/undefined → []
 */
export const arraySerializer = {
  serialize: (arr) => (arr.length === 0 ? null : arr.join(',')),
  deserialize: (str) => (str ? str.split(',') : []),
};

/**
 * Serialize/deserialize numbers.
 *
 *   3 → '3'
 *   '3' → 3
 *   null → null (caller provides the default)
 *   'abc' → null (invalid input)
 */
export const numberSerializer = {
  serialize: (n) => String(n),
  deserialize: (str) => {
    if (str == null) return null;
    const parsed = parseInt(str, 10);
    return Number.isNaN(parsed) ? null : parsed;
  },
};

/**
 * Serialize/deserialize strings (identity transform).
 *
 *   'foo' → 'foo'
 *   '' → null (empty string has no meaningful URL representation)
 *   null → null (caller provides the default)
 */
export const stringSerializer = {
  serialize: (s) => (s === '' ? null : s),
  deserialize: (str) => str ?? null,
};

/**
 * Serialize/deserialize booleans.
 *
 *   true → '1' (present in the URL)
 *   false → null (absent from the URL)
 *   '1' → true
 *   anything else → false
 *
 * Pair with a `false` default in useUrlState so false elides from the URL.
 */
export const booleanSerializer = {
  serialize: (value) => (value ? '1' : null),
  deserialize: (str) => str === '1',
};
