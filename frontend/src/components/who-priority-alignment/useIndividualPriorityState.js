'use client';

// =========================================================
// useIndividualPriorityState — section-local Apply/Clear state
// =========================================================
// Owns the WHO Priority dropdown's selection in two layers:
//   - committedPriority: synced to `?priority=<key>` in the URL.
//                        Drives every priority-scoped data fetch.
//   - pendingPriority:   local React state. The dropdown writes to
//                        this; Apply commits it to the URL.
//
// Apply / Clear semantics:
//   - Apply  : pendingPriority → URL (no-op when equal to committed).
//   - Clear  : wipe both pendingPriority and the URL key.

import { useState, useEffect, useCallback } from 'react';
import { useUrlState } from '@/lib/useUrlState';
import { numberSerializer } from '@/lib/url-serializers';

export function useIndividualPriorityState() {
  const [committedPriority, setCommittedPriority] = useUrlState(
    'priority',
    null,
    numberSerializer,
  );

  const [pendingPriority, setPendingPriority] = useState(committedPriority);

  useEffect(() => {
    setPendingPriority(committedPriority);
  }, [committedPriority]);

  const apply = useCallback(() => {
    setCommittedPriority(pendingPriority);
  }, [pendingPriority, setCommittedPriority]);

  const clear = useCallback(() => {
    setPendingPriority(null);
    setCommittedPriority(null);
  }, [setCommittedPriority]);

  const hasPending = pendingPriority !== committedPriority;
  const hasCommitted = committedPriority != null;

  return {
    committedPriority,
    pendingPriority,
    setPending: setPendingPriority,
    apply,
    clear,
    hasPending,
    hasCommitted,
  };
}
