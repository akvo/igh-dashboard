'use client';

import { useEffect, useRef, useState } from 'react';

// =========================================================
// DateFilter — per-column date filter
// =========================================================
//
// Same shape as NumberFilter — operator dropdown + 1–2 inputs — but
// the operator vocabulary is `eq`, `before`, `after`, `between` and
// the inputs are native `<input type="date">` pickers.
//
// `eq` matches whole calendar days regardless of any time component
// on the underlying value (the orchestrator's client-mode helper and
// the backend's SQL builder both wrap the column in `DATE()` to
// achieve this).
//
// Empty input on either side of `between` clears that bound; both
// empty (or non-between with empty) clears the filter entirely. The
// component validates inputs as ISO `yyyy-mm-dd` before firing
// onChange so partial picks (e.g. while the user types) don't
// trigger spurious filters.
//
// onChange is **debounced** (400ms by default) for the same reason as
// NumberFilter: native date inputs can fire onChange per keystroke in
// some browsers, and either way the consumer shouldn't pay for the
// chatter.
//
// Props:
//   value      — { kind, operator, value, valueEnd? } | null
//   onChange   — (entry|null) => void
//   operators  — optional ['eq','before','after','between']
//   debounceMs — debounce on outgoing onChange (default 400, set 0 to disable)

const ALL_OPERATORS = ['eq', 'before', 'after', 'between'];
const OPERATOR_LABEL = {
  eq: 'on',
  before: 'before',
  after: 'after',
  between: 'between',
};
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_DEBOUNCE_MS = 400;

export default function DateFilter({
  value,
  onChange,
  operators = ALL_OPERATORS,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}) {
  const [operator, setOperator] = useState(value?.operator ?? operators[0]);
  const [lo, setLo] = useState(value?.value ?? '');
  const [hi, setHi] = useState(value?.valueEnd ?? '');
  const debounceTimer = useRef(null);

  useEffect(() => {
    setOperator(value?.operator ?? operators[0]);
    setLo(value?.value ?? '');
    setHi(value?.valueEnd ?? '');
  }, [value, operators]);

  useEffect(() => () => clearTimeout(debounceTimer.current), []);

  const fire = (nextOp, nextLo, nextHi) => {
    const compute = () => {
      const loValid = nextLo && ISO.test(nextLo);
      const hiValid = nextHi && ISO.test(nextHi);
      if (nextOp === 'between') {
        if (!loValid && !hiValid) return null;
        return {
          kind: 'date',
          operator: 'between',
          value: loValid ? nextLo : null,
          valueEnd: hiValid ? nextHi : null,
        };
      }
      if (!loValid) return null;
      return { kind: 'date', operator: nextOp, value: nextLo };
    };

    if (debounceMs > 0) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => onChange(compute()), debounceMs);
    } else {
      onChange(compute());
    }
  };

  const handleOperator = (nextOp) => {
    setOperator(nextOp);
    fire(nextOp, lo, nextOp === 'between' ? hi : '');
  };

  // Highlight the controls when a filter value is active. Mirrors the
  // pattern in NumberFilter / TextFilter so users have a consistent
  // visual cue across kinds.
  const isActive = (lo && ISO.test(lo)) || (operator === 'between' && hi && ISO.test(hi));
  const activeBorder = isActive
    ? 'border-orange-500 ring-1 ring-orange-300'
    : 'border-gray-200';
  return (
    <div className="flex items-center gap-1">
      <select
        value={operator}
        onChange={(e) => handleOperator(e.target.value)}
        className={`px-1 py-1 text-xs border rounded bg-white text-black focus:outline-none focus:border-orange-500 ${activeBorder}`}
        aria-label="Date filter operator"
      >
        {operators.map((op) => (
          <option key={op} value={op}>
            {OPERATOR_LABEL[op]}
          </option>
        ))}
      </select>
      <input
        type="date"
        value={lo}
        onChange={(e) => {
          setLo(e.target.value);
          fire(operator, e.target.value, hi);
        }}
        className={`w-full min-w-[7.5rem] px-2 py-1 text-xs border rounded bg-white text-black focus:outline-none focus:border-orange-500 ${activeBorder}`}
      />
      {operator === 'between' && (
        <input
          type="date"
          value={hi}
          onChange={(e) => {
            setHi(e.target.value);
            fire(operator, lo, e.target.value);
          }}
          className={`w-full min-w-[7.5rem] px-2 py-1 text-xs border rounded bg-white text-black focus:outline-none focus:border-orange-500 ${activeBorder}`}
        />
      )}
    </div>
  );
}
