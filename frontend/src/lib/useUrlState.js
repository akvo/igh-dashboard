// =========================================================
// useUrlState — Drop-in useState replacement with URL sync
// =========================================================
//
// Replaces useState for values that should be reflected in the
// browser URL as query parameters. Supports arrays, numbers,
// and strings via pluggable serializers.
//
// Default-value elision: when the current value equals the
// default, the key is removed from the URL to keep URLs clean.
// Comparison uses shallow array equality for arrays and strict
// equality (===) for primitives.

import { useCallback, useRef, useEffect } from 'react';
import { useQueryParams } from './useQueryParams';

// ---- Helpers ----

function shallowArrayEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function isEqualToDefault(value, defaultValue) {
  if (Array.isArray(defaultValue)) {
    return shallowArrayEqual(value, defaultValue);
  }
  return value === defaultValue;
}

/**
 * @param {string} key           — URL parameter name
 * @param {*} defaultValue       — value when key is absent from URL
 * @param {object} options
 * @param {function} options.serialize    — (value) => string | null
 * @param {function} options.deserialize  — (urlString | null) => value
 * @param {'replace'|'push'} [options.historyMode='replace']
 * @param {number} [options.debounceMs=0]
 *
 * @returns {[value, setValue]}  — same API as useState
 */
export function useUrlState(key, defaultValue, options = {}) {
  const {
    serialize,
    deserialize,
    historyMode = 'replace',
    debounceMs = 0,
  } = options;

  const [params, setParams] = useQueryParams();
  const timerRef = useRef(null);

  // Read current value from URL, falling back to default.
  const raw = params.get(key);
  const deserialized = raw !== null && deserialize ? deserialize(raw) : null;

  // If the key is absent or deserialization returned null, use default.
  const value = deserialized !== null ? deserialized : defaultValue;

  const setValue = useCallback(
    (newValueOrFn) => {
      // Support functional updates: setValue(prev => ...)
      // Read the latest URL value at call time to avoid stale closures.
      const currentParams = new URLSearchParams(window.location.search);
      const currentRaw = currentParams.get(key);
      const currentDeserialized =
        currentRaw !== null && deserialize ? deserialize(currentRaw) : null;
      const currentValue =
        currentDeserialized !== null ? currentDeserialized : defaultValue;

      const resolved =
        typeof newValueOrFn === 'function'
          ? newValueOrFn(currentValue)
          : newValueOrFn;

      // Elide the key from the URL when the value matches the default.
      const serialized = isEqualToDefault(resolved, defaultValue)
        ? null
        : serialize
          ? serialize(resolved)
          : String(resolved);

      const doUpdate = () => {
        setParams({ [key]: serialized }, historyMode);
      };

      if (debounceMs > 0) {
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(doUpdate, debounceMs);
      } else {
        doUpdate();
      }
    },
    [key, defaultValue, serialize, deserialize, historyMode, debounceMs, setParams],
  );

  // Clean up debounce timer on unmount.
  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  return [value, setValue];
}
