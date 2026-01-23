'use client';

import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const defaultPhases = [
  { key: 'preClinical', label: 'Pre-clinical trial', color: '#8c4028' },
  { key: 'phase1', label: 'Phase 1', color: '#fe7449' },
  { key: 'phase2', label: 'Phase 2', color: '#fdba74' },
  { key: 'phase3', label: 'Phase 3', color: '#ddd6fe' },
  { key: 'phase4', label: 'Phase 4', color: '#a78bfa' },
  { key: 'approved', label: 'Approved', color: '#f0b456' },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);

  return (
    <div className="bg-white border border-black-12 rounded-lg shadow-lg p-3">
      <p className="font-semibold text-black mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-black-64">{entry.name}:</span>
          <span className="font-medium text-black">{entry.value}</span>
          <span className="text-black-48">
            ({((entry.value / total) * 100).toFixed(1)}%)
          </span>
        </div>
      ))}
      <div className="border-t border-black-12 mt-2 pt-2 text-sm font-semibold">
        Total: {total}
      </div>
    </div>
  );
};

export default function StackedBarChart({
  data = [],
  phases = defaultPhases,
  categoryKey = 'category',
  layout = 'vertical', // 'vertical' = horizontal bars, 'horizontal' = vertical bars
  xAxisLabel = '',
  yAxisLabel = '',
  showFilters = true,
  height = 400,
  barRadius = 4,
}) {
  const [visiblePhases, setVisiblePhases] = useState(
    phases.reduce((acc, phase) => ({ ...acc, [phase.key]: true }), {})
  );

  const togglePhase = (phaseKey) => {
    setVisiblePhases((prev) => ({
      ...prev,
      [phaseKey]: !prev[phaseKey],
    }));
  };

  const filteredPhases = useMemo(
    () => phases.filter((phase) => visiblePhases[phase.key]),
    [phases, visiblePhases]
  );

  const maxValue = useMemo(() => {
    return Math.max(
      ...data.map((item) =>
        filteredPhases.reduce((sum, phase) => sum + (item[phase.key] || 0), 0)
      )
    );
  }, [data, filteredPhases]);

  const axisTicks = useMemo(() => {
    const step = maxValue > 200 ? 50 : maxValue > 50 ? 25 : maxValue > 10 ? 5 : 1;
    const max = Math.ceil(maxValue / step) * step + step;
    const ticks = [];
    for (let i = 0; i <= max; i += step) {
      ticks.push(i);
    }
    return ticks;
  }, [maxValue]);

  const isHorizontalBars = layout === 'vertical';

  const getBarRadius = (index) => {
    const isLast = index === filteredPhases.length - 1;
    if (!isLast) return [0, 0, 0, 0];

    if (isHorizontalBars) {
      return [0, barRadius, barRadius, 0]; // Right side rounded for horizontal bars
    }
    return [barRadius, barRadius, 0, 0]; // Top rounded for vertical bars
  };

  return (
    <div className="w-full">
      {showFilters && (
        <div className="flex flex-wrap gap-4 mb-6">
          {phases.map((phase) => (
            <label
              key={phase.key}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <div className="relative">
                <input
                  type="checkbox"
                  checked={visiblePhases[phase.key]}
                  onChange={() => togglePhase(phase.key)}
                  className="sr-only"
                />
                <div
                  className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: visiblePhases[phase.key]
                      ? phase.color
                      : 'transparent',
                    borderColor: phase.color,
                  }}
                >
                  {visiblePhases[phase.key] && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm text-black-88">{phase.label}</span>
            </label>
          ))}
        </div>
      )}

      <div className="relative" style={{ height }}>
        {yAxisLabel && (
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 -rotate-90 text-sm text-black-64 whitespace-nowrap"
            style={{ transformOrigin: 'center' }}
          >
            {yAxisLabel}
          </div>
        )}

        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout={layout}
            margin={{
              top: 10,
              right: 20,
              left: isHorizontalBars ? 80 : 20,
              bottom: xAxisLabel ? 40 : 20,
            }}
            barCategoryGap="20%"
          >
            <CartesianGrid
              strokeDasharray="3 3"
              horizontal={!isHorizontalBars}
              vertical={isHorizontalBars}
              stroke="rgba(38, 38, 38, 0.12)"
            />

            {isHorizontalBars ? (
              <>
                <XAxis
                  type="number"
                  ticks={axisTicks}
                  domain={[0, axisTicks[axisTicks.length - 1]]}
                  axisLine={{ stroke: 'rgba(38, 38, 38, 0.24)' }}
                  tickLine={false}
                  tick={{ fill: 'rgba(38, 38, 38, 0.64)', fontSize: 12 }}
                />
                <YAxis
                  type="category"
                  dataKey={categoryKey}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(38, 38, 38, 0.88)', fontSize: 14 }}
                  width={75}
                />
              </>
            ) : (
              <>
                <XAxis
                  type="category"
                  dataKey={categoryKey}
                  axisLine={{ stroke: 'rgba(38, 38, 38, 0.24)' }}
                  tickLine={false}
                  tick={{ fill: 'rgba(38, 38, 38, 0.88)', fontSize: 12 }}
                />
                <YAxis
                  type="number"
                  ticks={axisTicks}
                  domain={[0, axisTicks[axisTicks.length - 1]]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgba(38, 38, 38, 0.64)', fontSize: 12 }}
                />
              </>
            )}

            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(38, 38, 38, 0.04)' }}
            />

            {filteredPhases.map((phase, index) => (
              <Bar
                key={phase.key}
                dataKey={phase.key}
                name={phase.label}
                stackId="stack"
                fill={phase.color}
                radius={getBarRadius(index)}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>

        {xAxisLabel && (
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-sm text-black-64">
            {xAxisLabel}
          </div>
        )}
      </div>
    </div>
  );
}
