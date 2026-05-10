'use client';

import { useEffect, useRef, useState } from 'react';

// =========================================================
// NumberFilter — per-column numeric filter
// =========================================================
//
// Renders a compact operator dropdown plus 1–2 numeric inputs (2 only
// when operator is `between`). Local state updates per keystroke for
// instant visual feedback; the upward-bound onChange is **debounced**
// (400ms by default) so typing "12345" causes one filter update
// instead of five.
//
// Why internal debouncing rather than relying on the parent's
// `useUrlState`: an upstream debounce only batches URL writes; the
// orchestrator's filter prop and any server-side refetch still fire on
// every keystroke. Self-debouncing keeps NumberFilter cheap regardless
// of what the consumer wires in.
//
// Empty input on either side of a `between` clears that bound; both
// empty clears the filter entirely. Non-`between` operators with an
// empty input also clear the filter.
//
// Props:
//   value       — { kind, operator, value, valueEnd? } | null
//   onChange    — (entry|null) => void
//   operators   — optional ['eq','lt','gt','between']; defaults to all four
//   debounceMs  — debounce on outgoing onChange (default 400, set 0 to disable)

const ALL_OPERATORS = ['eq', 'lt', 'gt', 'between'];
const OPERATOR_LABEL = { eq: '=', lt: '<', gt: '>', between: 'between' };
const DEFAULT_DEBOUNCE_MS = 400;

export default function NumberFilter({
  value,
  onChange,
  operators = ALL_OPERATORS,
  debounceMs = DEFAULT_DEBOUNCE_MS,
}) {
  const [operator, setOperator] = useState(value?.operator ?? operators[0]);
  const [lo, setLo] = useState(
    value?.value == null ? '' : String(value.value),
  );
  const [hi, setHi] = useState(
    value?.valueEnd == null ? '' : String(value.valueEnd),
  );
  const debounceTimer = useRef(null);

  // Sync local state when the value prop changes from outside (e.g.
  // "Clear all filters" or hydration from URL). Without this, a
  // programmatic reset wouldn't clear the visible inputs.
  useEffect(() => {
    setOperator(value?.operator ?? operators[0]);
    setLo(value?.value == null ? '' : String(value.value));
    setHi(value?.valueEnd == null ? '' : String(value.valueEnd));
  }, [value, operators]);

  // Cleanup pending timer on unmount so an in-flight debounce never
  // fires onChange after the component is gone.
  useEffect(() => () => clearTimeout(debounceTimer.current), []);

  const fire = (nextOp, nextLo, nextHi) => {
    const compute = () => {
      const loNum = nextLo === '' ? null : Number(nextLo);
      const hiNum = nextHi === '' ? null : Number(nextHi);
      const loValid = loNum != null && Number.isFinite(loNum);
      const hiValid = hiNum != null && Number.isFinite(hiNum);
      if (nextOp === 'between') {
        if (!loValid && !hiValid) return null;
        return {
          kind: 'number',
          operator: 'between',
          value: loValid ? loNum : null,
          valueEnd: hiValid ? hiNum : null,
        };
      }
      if (!loValid) return null;
      return { kind: 'number', operator: nextOp, value: loNum };
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
    // When dropping into a single-bound operator, only `lo` matters;
    // when entering `between`, both bounds are visible.
    fire(nextOp, lo, nextOp === 'between' ? hi : '');
  };

  // Highlight the controls when a filter value is active. Narrow phase
  // columns clip the input contents, so the ring is the user's only
  // local cue that a filter is in effect.
  const isActive = lo !== '' || (operator === 'between' && hi !== '');
  const activeBorder = isActive
    ? 'border-orange-500 ring-1 ring-orange-300'
    : 'border-gray-200';
  return (
    <div className="flex items-center gap-1">
      <select
        value={operator}
        onChange={(e) => handleOperator(e.target.value)}
        className={`px-1 py-1 text-xs border rounded bg-white text-black focus:outline-none focus:border-orange-500 ${activeBorder}`}
        aria-label="Number filter operator"
      >
        {operators.map((op) => (
          <option key={op} value={op}>
            {OPERATOR_LABEL[op]}
          </option>
        ))}
      </select>
      <input
        type="number"
        value={lo}
        onChange={(e) => {
          setLo(e.target.value);
          fire(operator, e.target.value, hi);
        }}
        placeholder={operator === 'between' ? 'min' : 'value'}
        className={`w-full min-w-0 px-2 py-1 text-xs border rounded bg-white text-black placeholder:text-gray-400 focus:outline-none focus:border-orange-500 ${activeBorder}`}
      />
      {operator === 'between' && (
        <input
          type="number"
          value={hi}
          onChange={(e) => {
            setHi(e.target.value);
            fire(operator, lo, e.target.value);
          }}
          placeholder="max"
          className={`w-full min-w-0 px-2 py-1 text-xs border rounded bg-white text-black placeholder:text-gray-400 focus:outline-none focus:border-orange-500 ${activeBorder}`}
        />
      )}
    </div>
  );
}
