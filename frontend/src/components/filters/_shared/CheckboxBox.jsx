'use client';

// =========================================================
// CheckboxBox — tri-state checkbox glyph
// =========================================================
// Shared by the hierarchical filters (disease, product). `state` is
// one of 'checked' | 'indeterminate' | 'unchecked'. Filled (orange)
// for checked/indeterminate, hollow otherwise.

export default function CheckboxBox({ state }) {
  const filled = state === 'checked' || state === 'indeterminate';
  return (
    <span
      className={`w-4 h-4 border rounded flex items-center justify-center shrink-0 ${
        filled ? 'border-orange-500 bg-orange-500' : 'border-gray-300 bg-white'
      }`}
      aria-hidden="true"
    >
      {state === 'checked' && (
        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path
            d="M1 4L3.5 6.5L9 1"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {state === 'indeterminate' && (
        <svg width="10" height="2" viewBox="0 0 10 2" fill="none">
          <path d="M1 1L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}
