import { colors } from './theme';

// =========================================================
// Heatmap Utility
//
// Produces per-cell background styles that map numeric values
// onto the orange colour palette using logarithmic scaling.
// Log scaling is essential because the real data is extremely
// right-skewed (median ≈ 1, max ≈ 600) — a linear scale
// would make 95 % of cells indistinguishable.
// =========================================================

const ORANGE_STOPS = [
  colors.orange[50],
  colors.orange[100],
  colors.orange[200],
  colors.orange[300],
  colors.orange[400],
  colors.orange[500],
  colors.orange[600],
  colors.orange[700],
  colors.orange[800],
  colors.orange[900],
];

/**
 * WCAG relative luminance of an sRGB hex colour.
 * Used to decide whether white or dark text provides sufficient contrast.
 */
function relativeLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Scan `data` across the given `accessors` (column keys), find the
 * global max of non-zero values, and return a `getHeatmapStyle(value)`
 * function that maps any cell value to a `{ backgroundColor, color }`
 * style object.
 *
 * Zero / falsy values → empty object (no heatmap colouring).
 */
export function createHeatmapScale(data, accessors) {
  let max = 0;
  for (const row of data) {
    for (const key of accessors) {
      const v = row[key];
      if (typeof v === 'number' && v > max) max = v;
    }
  }

  return function getHeatmapStyle(value) {
    if (!value || max <= 0) return {};

    // Logarithmic normalization: log(v) / log(max), clamped to [0, 1].
    // When max === 1 every non-zero value maps to the lightest stop.
    const normalized = max > 1
      ? Math.log(value) / Math.log(max)
      : 0;
    const clamped = Math.max(0, Math.min(1, normalized));

    // Map the 0–1 range onto the discrete ORANGE_STOPS array.
    const index = Math.min(
      Math.round(clamped * (ORANGE_STOPS.length - 1)),
      ORANGE_STOPS.length - 1,
    );
    const bg = ORANGE_STOPS[index];

    // Flip to white text when the background is too dark for black text.
    const textColor = relativeLuminance(bg) < 0.4 ? '#ffffff' : undefined;

    return textColor
      ? { backgroundColor: bg, color: textColor }
      : { backgroundColor: bg };
  };
}
