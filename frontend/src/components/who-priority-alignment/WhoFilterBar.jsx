'use client';

// =========================================================
// <WhoFilterBar/> — sticky filter row for the WHO page
// =========================================================
// A thin wrapper over the shared presentational <GlobalFilterBar/>.
// The WHO page has no R&D-phase axis, so it hides that column and
// feeds the bar its own filter state from useWhoPageFilters (same
// shape as useGlobalFilters minus the R&D fields).

import { GlobalFilterBar } from '@/components/global-filters';
import { useWhoPageFilters } from './useWhoPageFilters';

export default function WhoFilterBar() {
  const filters = useWhoPageFilters();
  return <GlobalFilterBar filters={filters} showRdPhase={false} />;
}
