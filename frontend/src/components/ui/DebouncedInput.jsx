'use client';

// =========================================================
// DebouncedInput — instant-feedback wrapper for debounced state
// =========================================================
//
// When an <input> is controlled by a debounced useUrlState hook,
// the hook's value only updates after the debounce fires and the
// URL changes. This makes the input feel laggy — keystrokes are
// invisible for the debounce duration.
//
// DebouncedInput solves this by maintaining its own local state
// for the display value. Each keystroke updates only this tiny
// component (not the whole page), giving instant visual feedback.
// The external value prop syncs back in when the URL updates
// (after debounce) or on back/forward navigation.

import { useState, useEffect } from 'react';

export default function DebouncedInput({ value: externalValue, onChange, ...props }) {
  const [localValue, setLocalValue] = useState(externalValue);

  // Sync when external value changes (URL update after debounce,
  // back/forward navigation, programmatic reset).
  useEffect(() => {
    setLocalValue(externalValue);
  }, [externalValue]);

  return (
    <input
      {...props}
      value={localValue}
      onChange={(e) => {
        setLocalValue(e.target.value);
        onChange?.(e);
      }}
    />
  );
}
