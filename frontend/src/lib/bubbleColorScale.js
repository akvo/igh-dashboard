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
