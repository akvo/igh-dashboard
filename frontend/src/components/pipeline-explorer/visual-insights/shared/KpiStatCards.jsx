'use client';

import { useState } from 'react';
import { InfoIcon } from '@/components/icons';
import { MiniDonut } from './primitives';

// =========================================================
// KPI stat-cards row
// =========================================================
//
// Renders the row of KPI stat cards (a total plus one card per Global
// Health Area). Purely presentational: the parent resolves the data and
// passes already-built `cards`. Each card has the shape
// { title, value, percentage, color, tooltip? }; a null percentage hides
// the donut (the total card), and a card only shows the info icon + hover
// tooltip when it carries a `tooltip` string. The hover behaviour mirrors
// the shared StatCard component.

// Tooltip width in px; must match the `w-64` class on the popover below.
const TOOLTIP_WIDTH = 256;

function InfoTooltip({ text }) {
  // The popover is positioned `fixed` rather than `absolute`, on purpose: the
  // KPI cards live inside the Pipeline Explorer scroll container, which sets
  // `overflow-x-hidden` (layout.js). An absolutely-positioned popover that
  // extended past the leftmost card's edge got clipped against the sidebar.
  // Fixed positioning escapes that clip; we compute the coordinates from the
  // icon's bounding rect on hover and clamp them to the viewport so the box
  // stays fully visible for every card (leftmost and rightmost alike).
  const [pos, setPos] = useState(null);

  const show = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    // Right-align the box to the icon when there's room, but never let it slip
    // past either viewport edge (8px gutter).
    const left = Math.max(
      8,
      Math.min(rect.right - TOOLTIP_WIDTH, window.innerWidth - TOOLTIP_WIDTH - 8),
    );
    setPos({ top: rect.bottom + 6, left });
  };

  return (
    <>
      <InfoIcon
        className="w-5 h-5 text-gray-400 cursor-pointer"
        onMouseEnter={show}
        onMouseLeave={() => setPos(null)}
      />
      {pos && (
        <div
          className="fixed bg-black text-white text-xs leading-relaxed px-3 py-2 rounded-md z-50 w-64"
          style={{ top: `${pos.top}px`, left: `${pos.left}px` }}
        >
          {text}
        </div>
      )}
    </>
  );
}

export function KpiStatCards({ cards }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <div key={card.title} className="bg-white border border-gray-200 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-black">{card.title}</h3>
            {card.tooltip && <InfoTooltip text={card.tooltip} />}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[40px] font-extrabold text-black leading-tight" style={{ fontFamily: 'var(--font-align), system-ui, sans-serif' }}>
              {(card.value ?? 0).toLocaleString()}
            </span>
            {card.percentage !== null && (
              <MiniDonut percentage={card.percentage} color={card.color} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
