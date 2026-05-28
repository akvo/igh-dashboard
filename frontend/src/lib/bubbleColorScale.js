// =========================================================
// Bubble color scale
// =========================================================
//
// BubbleChart's `colorScale` prop expects a function with the
// signature `(datum, rank, total) => hexColor`, where rank 0 is
// the smallest bubble and `total - 1` is the largest.
//
// This helper turns an ordered palette (light → dark) into such
// a function. Bubbles snap to the nearest palette stop using
// proportional rank — so the smallest bubble always lands on
// the lightest stop and the largest always lands on the darkest,
// regardless of how many bubbles a given view has. With small N
// and a long palette (e.g. 3 GHA bubbles on a 7-stop ramp) the
// chosen stops spread across the full visual range. With large
// N adjacent ranks share a stop; the resulting banding is
// expected and groups nearby ranks visually.

export function createBubbleColorScale(palette) {
  const last = palette.length - 1;
  return (_datum, rank, total) => {
    if (total <= 1) return palette[last];
    const idx = Math.round((rank / (total - 1)) * last);
    return palette[idx];
  };
}

/**
 * GHA-aware color scale for sub-tab views (disease, product type, etc.).
 *
 * Each bubble is coloured according to its parent GHA's gradient ramp.
 * Within each GHA group the shade is proportional to the bubble's value
 * rank within that group — biggest bubble gets the darkest stop, smallest
 * gets the lightest.
 *
 * @param {Record<string, string[]>} ghaGradients  GHA display name → palette
 * @param {string[]} fallbackPalette                Used when a GHA has no entry
 * @param {string}   [groupKey='group']             Datum field holding the GHA name
 */
export function createGhaGroupColorScale(ghaGradients, fallbackPalette, groupKey = 'group') {
  return (datum, _rank, _total, allBubbles) => {
    const gha = datum?.[groupKey];
    const palette = (gha && ghaGradients[gha]) || fallbackPalette;
    const last = palette.length - 1;

    // If no allBubbles context, use middle stop.
    if (!allBubbles) return palette[Math.floor(last / 2)];

    // Rank within the GHA group by value (descending).
    const siblings = allBubbles
      .filter((b) => b.datum?.[groupKey] === gha)
      .sort((a, b) => b.datum.value - a.datum.value);
    const groupTotal = siblings.length;
    if (groupTotal <= 1) return palette[last];

    const idx = siblings.findIndex((b) => b.datum === datum);
    const rank = groupTotal - 1 - idx; // 0 = smallest, groupTotal-1 = largest
    return palette[Math.round((rank / (groupTotal - 1)) * last)];
  };
}
