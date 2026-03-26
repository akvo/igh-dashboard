'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { wrapLabel } from '@/lib/chart-utils';

const defaultPhases = [
  { key: 'discovery', label: 'Discovery', color: '#AD5133', sortOrder: 10 },
  { key: 'preClinical', label: 'Pre-clinical', color: '#FE7449', sortOrder: 20 },
  { key: 'phase1', label: 'Phase 1', color: '#F9A78D', sortOrder: 30 },
  { key: 'phase2', label: 'Phase 2', color: '#B28FC9', sortOrder: 40 },
  { key: 'phase3', label: 'Phase 3', color: '#CBAFDE', sortOrder: 50 },
  { key: 'approved', label: 'Approved', color: '#F0B456', sortOrder: 90 },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);

  return (
    <div className="bg-white border border-black-12 rounded-lg shadow-lg p-3 relative z-50">
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
            ({total > 0 ? ((entry.value / total) * 100).toFixed(1) : 0}%)
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
  barRadius = 0,
  yAxisWidth = 120,
  hideXAxisTicks = false,
  maxTickChars = 25,
  // Controlled mode: parent manages phase visibility via URL state.
  // When omitted, the component manages its own internal state.
  visiblePhases: controlledVisiblePhases,
  onVisiblePhasesChange,
}) {
  const [internalVisiblePhases, setInternalVisiblePhases] = useState(
    phases.reduce((acc, phase) => ({ ...acc, [phase.key]: true }), {})
  );

  const isControlled = controlledVisiblePhases !== undefined;
  const visiblePhases = isControlled ? controlledVisiblePhases : internalVisiblePhases;

  useEffect(() => {
    if (!isControlled && phases.length > 0) {
      setInternalVisiblePhases(prev => {
        const next = { ...prev };
        phases.forEach(phase => {
          if (!(phase.key in next)) {
            next[phase.key] = true;
          }
        });
        return next;
      });
    }
  }, [phases, isControlled]);

  const togglePhase = (phaseKey) => {
    const next = { ...visiblePhases, [phaseKey]: !visiblePhases[phaseKey] };
    if (isControlled && onVisiblePhasesChange) {
      onVisiblePhasesChange(next);
    } else {
      setInternalVisiblePhases(next);
    }
  };

  // Enforce R&D lifecycle ordering via sortOrder so the chart and
  // legend always read Discovery → … → Approved regardless of
  // selection sequence or data arrival order.
  const sortedPhases = useMemo(
    () => [...phases].sort((a, b) => (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity)),
    [phases]
  );

  const filteredPhases = useMemo(
    () => sortedPhases.filter((phase) => visiblePhases[phase.key]),
    [sortedPhases, visiblePhases]
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

  const hasLongLabels = useMemo(
    () => data.some((item) => String(item[categoryKey] || '').replace(/\n/g, ' ').length > maxTickChars),
    [data, categoryKey, maxTickChars]
  );

  // Index of the last visible phase within sortedPhases, used for
  // rounding the outermost bar segment's corners.
  const lastVisibleIndex = useMemo(() => {
    for (let i = sortedPhases.length - 1; i >= 0; i--) {
      if (visiblePhases[sortedPhases[i].key]) return i;
    }
    return -1;
  }, [sortedPhases, visiblePhases]);

  const getBarRadius = (sortedIndex) => {
    if (sortedIndex !== lastVisibleIndex) return [0, 0, 0, 0];

    if (isHorizontalBars) {
      return [0, barRadius, barRadius, 0]; // Right side rounded for horizontal bars
    }
    return [barRadius, barRadius, 0, 0]; // Top rounded for vertical bars
  };

  return (
    <div className="w-full overflow-visible">
      {showFilters && (
        <div className="flex flex-wrap gap-4 mb-6 items-center">
          {sortedPhases.length >= 3 && (
            <div className="flex gap-1 mr-2">
              <button
                type="button"
                onClick={() => {
                  const next = sortedPhases.reduce((acc, p) => ({ ...acc, [p.key]: true }), {});
                  if (isControlled && onVisiblePhasesChange) onVisiblePhasesChange(next);
                  else setInternalVisiblePhases(next);
                }}
                className="text-xs text-orange-500 hover:underline cursor-pointer bg-transparent border-0 p-0"
              >
                Select all
              </button>
              <span className="text-xs text-black-24">|</span>
              <button
                type="button"
                onClick={() => {
                  const next = sortedPhases.reduce((acc, p) => ({ ...acc, [p.key]: false }), {});
                  if (isControlled && onVisiblePhasesChange) onVisiblePhasesChange(next);
                  else setInternalVisiblePhases(next);
                }}
                className="text-xs text-orange-500 hover:underline cursor-pointer bg-transparent border-0 p-0"
              >
                Clear all
              </button>
            </div>
          )}
          {sortedPhases.map((phase) => (
            <label
              key={phase.key}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <div className="relative">
                <input
                  type="checkbox"
                  checked={!!visiblePhases[phase.key]}
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

      <div className="flex" style={{ height }}>
        {yAxisLabel && (
          <div className="flex items-center justify-center shrink-0" style={{ width: 24 }}>
            <span
              className="text-sm text-black-64 whitespace-nowrap"
              style={{ transform: 'rotate(-90deg)' }}
            >
              {yAxisLabel}
            </span>
          </div>
        )}

        <div className="relative flex-1 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout={layout}
              margin={{
                top: 10,
                right: 10,
                left: 5,
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
                    tick={hideXAxisTicks ? false : { fill: 'rgba(38, 38, 38, 0.64)', fontSize: 12 }}
                  />
                  <YAxis
                    type="category"
                    dataKey={categoryKey}
                    interval={0}
                    axisLine={false}
                    tickLine={false}
                    tick={({ x, y, payload }) => {
                      const label = payload.value;
                      const lines = wrapLabel(label, maxTickChars);
                      const lineHeight = 14;
                      const startY = y - ((lines.length - 1) * lineHeight) / 2;
                      return (
                        <text x={x - 4} y={startY} textAnchor="end" fill="rgba(38, 38, 38, 0.88)" fontSize={12}>
                          <title>{label}</title>
                          {lines.map((line, i) => (
                            <tspan key={i} x={x - 4} dy={i === 0 ? 0 : lineHeight} dominantBaseline="central">
                              {line}
                            </tspan>
                          ))}
                        </text>
                      );
                    }}
                    width={yAxisWidth}
                  />
                </>
              ) : (
                <>
                  <XAxis
                    type="category"
                    dataKey={categoryKey}
                    interval={0}
                    axisLine={{ stroke: 'rgba(38, 38, 38, 0.24)' }}
                    tickLine={false}
                    tick={({ x, y, payload }) => {
                      const label = String(payload.value).replace(/\n/g, ' ');
                      const lines = wrapLabel(label, Math.min(maxTickChars, 15));
                      const lineHeight = 14;
                      return (
                        <text
                          x={x}
                          y={y + 10}
                          textAnchor="middle"
                          fill="rgba(38, 38, 38, 0.88)"
                          fontSize={12}
                        >
                          {lines.map((line, i) => (
                            <tspan key={i} x={x} dy={i === 0 ? 0 : lineHeight}>
                              {line}
                            </tspan>
                          ))}
                        </text>
                      );
                    }}
                    height={80}
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
                offset={20}
                allowEscapeViewBox={{ x: false, y: false }}
                isAnimationActive={false}
              />

              {/* Render ALL phases so Recharts maintains a stable React
                  tree — toggling checkboxes uses the `hide` prop instead
                  of adding/removing <Bar> children, which prevents
                  Recharts from reordering the stack. */}
              {sortedPhases.map((phase, index) => (
                <Bar
                  key={phase.key}
                  dataKey={phase.key}
                  name={phase.label}
                  stackId="stack"
                  fill={phase.color}
                  radius={getBarRadius(index)}
                  hide={!visiblePhases[phase.key]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>

          {xAxisLabel && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-sm text-black-64 z-10">
              {xAxisLabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
