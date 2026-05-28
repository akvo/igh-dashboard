'use client';

// =============================================================================
// BubbleChart — packed-circle scale chart for the "Scale of R&D by global
// health area" card. Replaces the previous hand-rolled positioner with
// d3-hierarchy.pack so we can render anywhere from 3 to ~40+ bubbles
// (Disease × Product Type view). Coloring, tooltip content, and legend chip
// labels are owned by the parent so the component stays presentational.
// =============================================================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { hierarchy, pack } from 'd3-hierarchy';

const DEFAULT_COLORS = [
  '#F0B456',
  '#CBAFDE',
  '#AD5133',
  '#54A5C4',
  '#6AB085',
  '#B28FC9',
];

// Radius thresholds (in SVG units, 1:1 with px at default viewport):
// below these, omit the category label / omit the value — the tooltip
// covers readability for small bubbles.
const LABEL_VISIBLE_RADIUS = 44;
const VALUE_VISIBLE_RADIUS = 22;

// Viewport we pack into. Square keeps the pack() output stable across
// responsive resizes — the SVG preserveAspectRatio handles scaling.
const VIEW_W = 600;
const VIEW_H = 420;

/**
 * Parse "#RRGGBB" → relative luminance (0..1). Used to flip the on-bubble
 * text color to dark on light shades.
 */
function hexLuminance(hex) {
  if (!hex) return 0;
  const m = hex.replace('#', '');
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function formatNumber(value) {
  return typeof value === 'number' && value >= 1000
    ? value.toLocaleString()
    : String(value);
}

/**
 * Split a long label across up to two lines that each fit within the
 * bubble's per-line character budget. Strategy:
 *   - If the whole label fits on one line, one line.
 *   - Else, break at the nearest word boundary to the midpoint so lines
 *     are reasonably balanced.
 *   - Any line still exceeding `maxPerLine` is truncated with an ellipsis
 *     so the value number below never gets crowded out.
 */
function splitLabel(label, maxPerLine) {
  if (!label) return [];
  if (label.length <= maxPerLine) return [label];

  const mid = Math.floor(label.length / 2);
  let breakAt = label.lastIndexOf(' ', mid);
  if (breakAt < 0) breakAt = label.indexOf(' ', mid);
  if (breakAt < 0) breakAt = mid; // hard break for single long token

  const rawLines = [label.slice(0, breakAt).trim(), label.slice(breakAt).trim()];
  return rawLines.map((line) =>
    line.length > maxPerLine ? `${line.slice(0, Math.max(1, maxPerLine - 1))}…` : line,
  );
}

export default function BubbleChart({
  data = [],
  // Legacy categorical colors — used when colorScale is not provided.
  colors = DEFAULT_COLORS,
  // Preferred shader: (datum, rank, total) => hexColor.
  // rank 0 = smallest bubble, total-1 = largest. Page callers usually
  // build this with `createBubbleColorScale(palette)` from
  // `@/lib/bubbleColorScale`, which snaps each rank onto a palette stop.
  colorScale,
  height = 400,
  gap = 4,
  showLegend = true,
  showValues = true,
  nameKey = 'name',
  valueKey = 'value',
  // (datum) => ReactNode — if provided, shown on bubble hover.
  tooltip,
}) {
  const [hoveredKey, setHoveredKey] = useState(null);
  const [tooltipState, setTooltipState] = useState(null); // { x, y, datum } | null
  const mountedRef = useRef(false);

  // react-portal target: must only mount client-side, so gate until mounted.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // -------------------------------------------------------------------------
  // Pack the data. d3-hierarchy.pack expects a tree; we wrap our flat list
  // in a synthetic root. .sum() drives bubble sizing by the valueKey.
  // -------------------------------------------------------------------------
  const bubbles = useMemo(() => {
    if (!data.length) return [];

    const root = hierarchy({ children: data })
      .sum((d) => Math.max(0, Number(d?.[valueKey]) || 0))
      .sort((a, b) => b.value - a.value);

    pack().size([VIEW_W, VIEW_H]).padding(gap)(root);

    const leaves = root.leaves();

    // rank: largest → total-1, smallest → 0. Leaves are already sorted
    // descending by .sort() above, so rank = (total - 1 - index).
    const total = leaves.length;
    // First pass: build bubble objects without fill so we can pass the
    // full list to group-aware color scales.
    const rawBubbles = leaves.map((leaf, i) => ({
      datum: leaf.data,
      x: leaf.x,
      y: leaf.y,
      r: leaf.r,
      rank: total - 1 - i,
    }));
    // Second pass: resolve fill. The 4th arg (`allBubbles`) lets
    // group-aware scales rank within a GHA group.
    return rawBubbles.map((b, i) => ({
      ...b,
      fill:
        typeof colorScale === 'function'
          ? colorScale(b.datum, b.rank, total, rawBubbles)
          : colors[i % colors.length],
    }));
  }, [data, colors, colorScale, gap, valueKey]);

  // Stable per-bubble key — prefer an explicit `key`/`id` field, else fall
  // back to nameKey. Duplicates fall back to index.
  const keyFor = (bubble, index) =>
    bubble.datum?.key ?? bubble.datum?.id ?? bubble.datum?.[nameKey] ?? index;

  const handleBubbleEnter = (bubble, index, e) => {
    const k = keyFor(bubble, index);
    setHoveredKey(k);
    if (tooltip) {
      setTooltipState({ x: e.clientX, y: e.clientY, datum: bubble.datum });
    }
  };
  const handleBubbleMove = (e) => {
    if (tooltip && tooltipState) {
      setTooltipState((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : prev));
    }
  };
  const handleBubbleLeave = () => {
    setHoveredKey(null);
    setTooltipState(null);
  };

  const chartHeight = Math.max(120, height - (showLegend ? 80 : 0));

  return (
    <div className="w-full">
      <div style={{ height: chartHeight }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {bubbles.map((bubble, i) => {
            const k = keyFor(bubble, i);
            const isHovered = hoveredKey === k;
            const anyHovered = hoveredKey !== null;
            const label = bubble.datum?.[nameKey];
            const value = bubble.datum?.[valueKey];
            const textColor = hexLuminance(bubble.fill) > 0.6 ? '#262626' : '#FFFFFF';

            // Label fit heuristic: allow ~0.3 chars per radius pixel per line,
            // clamped to a useful range. Keeps "Diagnostics" visible on mid
            // bubbles while dropping clutter on small ones.
            const maxCharsPerLine = Math.max(6, Math.floor(bubble.r * 0.3));
            const labelLines =
              bubble.r >= LABEL_VISIBLE_RADIUS
                ? splitLabel(String(label ?? ''), maxCharsPerLine)
                : [];
            const labelFontSize = Math.max(10, Math.min(bubble.r * 0.2, 18));
            const valueFontSize = Math.max(11, Math.min(bubble.r * 0.3, 26));

            // Vertical layout: treat label block + value as a single stack
            // centered on bubble.y, so the value can never sit underneath
            // the last label line. Per-line height uses 1.15× font-size to
            // leave breathing room between wrapped lines.
            const labelLineH = labelFontSize * 1.15;
            const labelBlockH = labelLines.length * labelLineH;
            const valueVisible = showValues && bubble.r >= VALUE_VISIBLE_RADIUS;
            const valueBlockH = valueVisible ? valueFontSize * 1.15 : 0;
            const stackGap = labelLines.length > 0 && valueVisible ? 4 : 0;
            const stackH = labelBlockH + stackGap + valueBlockH;
            const stackTop = bubble.y - stackH / 2;
            const firstLineCenterY = stackTop + labelLineH / 2;
            const valueCenterY = stackTop + labelBlockH + stackGap + valueBlockH / 2;

            return (
              <g
                key={k}
                onMouseEnter={(e) => handleBubbleEnter(bubble, i, e)}
                onMouseMove={handleBubbleMove}
                onMouseLeave={handleBubbleLeave}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={bubble.x}
                  cy={bubble.y}
                  r={bubble.r}
                  fill={bubble.fill}
                  opacity={!anyHovered || isHovered ? 1 : 0.55}
                  style={{ transition: 'opacity 0.15s' }}
                />
                {labelLines.length > 0 && (
                  <text
                    x={bubble.x}
                    y={firstLineCenterY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={textColor}
                    fontSize={labelFontSize}
                    fontWeight="500"
                    style={{ pointerEvents: 'none' }}
                  >
                    {labelLines.map((line, li) => (
                      <tspan
                        key={li}
                        x={bubble.x}
                        dy={li === 0 ? 0 : labelLineH}
                      >
                        {line}
                      </tspan>
                    ))}
                  </text>
                )}
                {valueVisible && (
                  <text
                    x={bubble.x}
                    y={valueCenterY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={textColor}
                    fontSize={valueFontSize}
                    fontWeight="700"
                    style={{ pointerEvents: 'none' }}
                  >
                    {formatNumber(value)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {showLegend && (
        <div
          className="flex flex-wrap gap-x-4 gap-y-2 justify-start mt-4 pr-1"
          style={{ maxHeight: 72, overflowY: 'auto' }}
        >
          {bubbles.map((bubble, i) => {
            const k = keyFor(bubble, i);
            const isHovered = hoveredKey === k;
            return (
              <div
                key={k}
                className="flex items-center gap-2 cursor-pointer"
                onMouseEnter={() => setHoveredKey(k)}
                onMouseLeave={() => setHoveredKey(null)}
              >
                <span
                  className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: bubble.fill }}
                />
                <span
                  className={`text-xs transition-colors ${
                    isHovered ? 'text-black font-medium' : 'text-gray-600'
                  }`}
                >
                  {bubble.datum?.[nameKey]}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {tooltip && tooltipState && mountedRef.current
        ? createPortal(
            <div
              style={{
                position: 'fixed',
                left: tooltipState.x + 12,
                top: tooltipState.y + 12,
                pointerEvents: 'none',
                zIndex: 9999,
                background: '#262626',
                color: '#FFFFFF',
                padding: '8px 10px',
                borderRadius: 6,
                fontSize: 12,
                lineHeight: 1.35,
                maxWidth: 260,
                boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
              }}
            >
              {tooltip(tooltipState.datum)}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
