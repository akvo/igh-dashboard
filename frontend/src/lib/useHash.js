'use client';

import { useEffect, useState } from 'react';

// Returns the current location hash without the leading `#`.
// SSR-safe: returns '' on the server / before mount.
//
// We do NOT seed useState from window.location.hash because the
// same App Router timing race that affects pathname during a
// client-side transition affects the hash — reading window during
// the useState initializer can return the stale hash. Subscribing
// in useEffect runs after commit, after Next.js has settled the
// new URL, so the read is always consistent with the route the
// component is rendering for.
export function useHash() {
  const [hash, setHash] = useState('');

  useEffect(() => {
    const read = () => setHash(window.location.hash.replace(/^#/, ''));
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  return hash;
}
