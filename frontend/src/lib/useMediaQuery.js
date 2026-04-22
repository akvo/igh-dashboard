'use client';

import { useEffect, useState } from 'react';

// =========================================================
// SSR-safe media query hook
// =========================================================
//
// Returns `false` on the server and during the first client render, then
// updates to `window.matchMedia(query).matches` after mount. Keeping the
// initial value constant across server and first client render is what
// prevents React hydration mismatches — both sides agree on `false`
// regardless of the actual viewport. The real value arrives in a follow-up
// render triggered by the effect below.

export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQueryList = window.matchMedia(query);

    // Sync once on mount in case the current viewport already matches.
    setMatches(mediaQueryList.matches);

    // Subscribe so the value flips live when the user resizes across the
    // threshold (e.g. drags a desktop window narrower than 1024px).
    const handleChange = (event) => setMatches(event.matches);
    mediaQueryList.addEventListener('change', handleChange);
    return () => mediaQueryList.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
}
