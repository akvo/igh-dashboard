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

function InfoTooltip({ text }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className="relative">
      <InfoIcon
        className="w-5 h-5 text-gray-400 cursor-pointer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />
      {hovered && (
        <div className="absolute top-7 right-0 bg-black text-white text-xs leading-relaxed px-3 py-2 rounded-md z-10 w-64">
          {text}
        </div>
      )}
    </div>
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
