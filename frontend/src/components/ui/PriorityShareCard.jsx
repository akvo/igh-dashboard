'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { chartColors } from '@/lib/theme';

// =========================================================
// PriorityShareCard
// =========================================================
// Small stat card with a title, description, and a mini ring chart on
// the right showing a single share value (e.g. "Neglected diseases —
// 20% share with dedicated priority").
//
// Designed for the Home page's WHO Priority Alignment section. Three
// instances render side-by-side (one per GHA). Shape is intentionally
// narrow — title/description/loading/zero-denominator are the only
// states the section produces.
//
// Inputs:
//   title          — card heading (e.g. "Neglected diseases")
//   description    — single-line subtitle under the title
//   candidatesWithPriority / totalCandidates — drive the percentage and ring
//   accentColor    — filled-arc colour. Default matches the screenshot's
//                    ND card (light purple). Callers pass other tokens
//                    from `chartColors.primary` so each GHA card can
//                    have its own accent.
//   loading        — render an animated skeleton
//
// Special cases:
//   totalCandidates === 0 → render "—" + "No candidates in selection",
//   ring fills as a uniform light-gray circle.

// Default accent = chartColors.primary[1] (Light Purple, #CBAFDE).
// Pulled from the theme so this card stays in sync with the rest of the
// data-viz palette if a brand refresh tweaks the colour tokens.
const DEFAULT_ACCENT_COLOR = chartColors.primary[1];
const TRACK_COLOR = '#E5E7EB';    // gray-200 track for the unfilled portion

const RING_SIZE = 56;             // px, sized to the screenshot
const INNER_RADIUS = 18;
const OUTER_RADIUS = 26;

export default function PriorityShareCard({
  title,
  description,
  candidatesWithPriority = 0,
  totalCandidates = 0,
  loading = false,
  accentColor = DEFAULT_ACCENT_COLOR,
}) {
  if (loading) {
    return (
      <div className="bg-white border border-gray-200 p-4 flex items-center justify-between gap-3 animate-pulse">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div
          className="rounded-full bg-gray-200"
          style={{ width: RING_SIZE, height: RING_SIZE }}
        />
      </div>
    );
  }

  const hasData = totalCandidates > 0;
  // Clamp so a caller bug (or future data anomaly) can't produce a label like
  // "133%" alongside a visually-full ring. The backend SQL guarantees
  // candidatesWithPriority ≤ totalCandidates today, but a prop-driven
  // component shouldn't rely on that invariant holding everywhere it's
  // wired up.
  const filledCount = Math.min(Math.max(candidatesWithPriority, 0), totalCandidates);
  const sharePercent = hasData ? Math.round((filledCount / totalCandidates) * 100) : null;

  // Two-slice pie: filled portion + remaining track. When totalCandidates
  // is 0 we render the track only (uniform light-gray ring).
  const pieData = hasData
    ? [
        { name: 'filled', value: filledCount, color: accentColor },
        {
          name: 'rest',
          value: totalCandidates - filledCount,
          color: TRACK_COLOR,
        },
      ]
    : [{ name: 'empty', value: 1, color: TRACK_COLOR }];

  return (
    <div className="bg-white border border-gray-200 p-4 flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-black mb-1">{title}</h4>
        <p className="text-xs text-gray-500">
          {hasData ? description : 'No candidates in selection'}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-semibold text-black tabular-nums">
          {hasData ? `${sharePercent}%` : '—'}
        </span>
        {/* The ring is decorative — the share percentage is already in the
            <span> above. Hide from assistive tech so screen readers don't
            try to walk the recharts SVG. */}
        <div style={{ width: RING_SIZE, height: RING_SIZE }} aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={INNER_RADIUS}
                outerRadius={OUTER_RADIUS}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                stroke="none"
                isAnimationActive={false}
              >
                {pieData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
