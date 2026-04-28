// Legacy URL parameter migration shim.
//
// Pre-PR2 URLs used a single `?disease=Malaria,HIV/AIDS` parameter
// that mixed primary diseases and sub-diseases. The new
// HierarchicalDiseaseFilter splits the selection into two URL
// parameters: `?primary=...&secondary=...`. Existing bookmarks
// shared by users still carry `?disease=`; this helper rewrites
// them to `?primary=` on first mount so charts hydrate correctly.
//
// Behavior: if the URL has `disease` and does NOT have `primary`,
// move the value to `primary` and remove `disease` from the URL.
// We treat the legacy value as a primary list -- the old sidebar
// (the only place that produced multi-value `?disease=` URLs)
// passed parents and children together as a comma-separated list.
// Migrating them all to `primary` over-fetches slightly (a
// "P. falciparum" treated as primary won't match any
// `disease_filter` row) but the cross-filter prune effect drops
// stale entries on the next render, so the URL self-heals.

export function migrateLegacyDiseaseUrl({ setPrimary }) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (!params.has('disease') || params.has('primary')) return;

  const legacy = params.get('disease') || '';
  const list = legacy
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  params.delete('disease');
  if (list.length > 0) {
    params.set('primary', list.join(','));
  }

  const next = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', next);

  if (list.length > 0) {
    setPrimary(list);
  }
}
