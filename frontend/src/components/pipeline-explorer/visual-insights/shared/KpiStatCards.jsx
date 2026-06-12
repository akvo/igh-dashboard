'use client';

import { MiniDonut } from './primitives';

// =========================================================
// KPI stat-cards row
// =========================================================
//
// Renders the row of KPI stat cards (a total plus one card per Global
// Health Area). It is purely presentational: the parent resolves the data
// and passes already-built `cards`, so unlike the original page block there
// is no loading guard here — values render directly. Each card has the
// shape { title, value, percentage, color }; a null percentage hides the
// donut (used by the total card).

export function KpiStatCards({ cards }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <div key={card.title} className="bg-white border border-gray-200 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-black">{card.title}</h3>
            <span className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 text-xs cursor-pointer">i</span>
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
