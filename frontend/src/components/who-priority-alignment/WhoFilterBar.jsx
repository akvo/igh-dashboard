'use client';

// =========================================================
// <WhoFilterBar/> — sticky filter row for the WHO page
// =========================================================
// A thin wrapper over the shared presentational <GlobalFilterBar/>,
// fed the WHO page's filter state from useWhoPageFilters (now the full
// set including R&D phase).

import { GlobalFilterBar } from '@/components/global-filters';
import { useWhoPageFilters } from './useWhoPageFilters';

export default function WhoFilterBar() {
  const filters = useWhoPageFilters();
  return <GlobalFilterBar filters={filters} />;
}
