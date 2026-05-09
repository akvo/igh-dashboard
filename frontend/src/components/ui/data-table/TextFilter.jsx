'use client';

import DebouncedInput from '../DebouncedInput';

// =========================================================
// TextFilter — per-column free-text input
// =========================================================
//
// Always-visible inline input for text-kind column filters. Wraps
// DebouncedInput for instant visual feedback while the user types.
// Actual debouncing of the URL/server round-trip is handled by the
// orchestrator's useUrlState hook (debounceMs=500), keeping this
// component a pure controlled input.
//
// Props:
//   value       — current filter text (string)
//   onChange    — (text: string) => void  (called on every keystroke;
//                 debounce upstream if needed)
//   placeholder — optional input placeholder
export default function TextFilter({ value, onChange, placeholder = 'Filter…' }) {
  return (
    <DebouncedInput
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white text-black placeholder:text-gray-400 focus:outline-none focus:border-orange-500"
    />
  );
}
