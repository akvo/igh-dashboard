'use client';

// =========================================================
// HierarchicalCategoryFilter
// =========================================================
//
// Column-header adapter that drops the global Disease picker into a
// DataTable filter cell. It reuses the fully prop-driven
// HierarchicalDiseaseFilter for the menu + six-state toggle logic, and
// sources the full disease tree from the cached useDiseaseHierarchy
// hook (the same query the global filter uses). Selection is held in
// the table's column-filter state as
// `{ kind: 'hierarchical', primary: string[], secondary: string[] }`,
// or `null` when empty.
//
// Options are the FULL hierarchy (not narrowed to the currently-
// filtered rows). That trades the contextual narrowing the flat
// CategoryFilter columns get for zero extra option plumbing; the tree
// is small. Narrowing is a possible future enhancement.

import HierarchicalDiseaseFilter from '@/components/filters/HierarchicalDiseaseFilter';
import { useDiseaseHierarchy } from '@/graphql/hooks/useDiseaseHierarchy';

export default function HierarchicalCategoryFilter({ value, onChange }) {
  // The hierarchy is tiny and effectively always cached, so we don't
  // surface the hook's `loading` state — HierarchicalDiseaseFilter has
  // no loading affordance and an empty tree simply renders no options
  // for the brief first-load window (same as the global filter bar).
  const { hierarchy } = useDiseaseHierarchy();
  const primarySelected = value?.primary ?? [];
  const secondarySelected = value?.secondary ?? [];

  return (
    <HierarchicalDiseaseFilter
      hierarchy={hierarchy}
      primarySelected={primarySelected}
      secondarySelected={secondarySelected}
      onChange={({ primarySelected: p, secondarySelected: s }) => {
        // Collapse an empty selection to null so the column filter is
        // dropped (and elided from the URL) rather than persisted empty.
        if (p.length === 0 && s.length === 0) {
          onChange(null);
        } else {
          onChange({ kind: 'hierarchical', primary: p, secondary: s });
        }
      }}
      placeholder="All"
      compact
      variant="outlined"
    />
  );
}
