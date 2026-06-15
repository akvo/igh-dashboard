'use client';

// =========================================================
// useFilterPreservingHref — hook wrapper over buildHref
// =========================================================
//
// Binds the pure buildHref to the live route (usePathname) and query
// params (useQueryParams), returning a `(targetHref) => href` builder.
// Matches the lib/ convention of useQueryParams / useUrlState.

import { usePathname } from 'next/navigation';
import { useQueryParams } from './useQueryParams';
import { buildHref } from './filterPreservingHref';

export function useFilterPreservingHref() {
  const pathname = usePathname();
  const [params] = useQueryParams();
  return (targetHref) => buildHref(targetHref, { pathname, params });
}
