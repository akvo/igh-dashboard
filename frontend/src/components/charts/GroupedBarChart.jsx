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
  LabelList,
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

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
        </div>
      ))}
    </div>
  );
};

export default function GroupedBarChart({
  data = [],
  series = [],
  categoryKey = 'category',
  height = 400,
  xAxisLabel = '',
  yAxisLabel = '',
  showFilters = true,
  showBarLabels = false,
  barRadius = 0,
}) {
  const [visibleSeries, setVisibleSeries] = useState(
    series.reduce((acc, s) => ({ ...acc, [s.key]: true }), {})
  );

  useEffect(() => {
    if (series.length > 0) {
      setVisibleSeries(prev => {
        const next = { ...prev };
        series.forEach(s => {
          if (!(s.key in next)) {
            next[s.key] = true;
          }
        });
        return next;
      });
    }
  }, [series]);

  const toggleSeries = (seriesKey) => {
    setVisibleSeries(prev => ({
      ...prev,
      [seriesKey]: !prev[seriesKey],
    }));
  };

  const filteredSeries = useMemo(
    () => series.filter(s => visibleSeries[s.key]),
    [series, visibleSeries]
  );

  const maxValue = useMemo(() => {
    if (data.length === 0 || filteredSeries.length === 0) return 10;
    return Math.max(
      ...data.map(item =>
        Math.max(...filteredSeries.map(s => item[s.key] || 0))
      )
    );
  }, [data, filteredSeries]);

  const axisTicks = useMemo(() => {
    const step = maxValue > 200 ? 50 : maxValue > 50 ? 25 : maxValue > 10 ? 5 : 1;
    const max = Math.ceil(maxValue / step) * step + step;
    const ticks = [];
    for (let i = 0; i <= max; i += step) {
      ticks.push(i);
    }
    return ticks;
  }, [maxValue]);

  return (
    <div className="w-full overflow-hidden">
      {showFilters && (
        <div className="flex flex-wrap gap-4 mb-6">
          {series.map(s => (
            <label
              key={s.key}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <div className="relative">
                <input
                  type="checkbox"
                  checked={!!visibleSeries[s.key]}
                  onChange={() => toggleSeries(s.key)}
                  className="sr-only"
                />
                <div
                  className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: visibleSeries[s.key] ? s.color : 'transparent',
                    borderColor: s.color,
                  }}
                >
                  {visibleSeries[s.key] && (
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
              <span className="text-sm text-black-88">{s.label}</span>
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
              margin={{
                top: 10,
                right: 10,
                left: 5,
                bottom: showBarLabels ? 55 : (xAxisLabel ? 40 : 20),
              }}
              barCategoryGap="20%"
              barGap={4}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(38, 38, 38, 0.12)"
              />

              <XAxis
                type="category"
                dataKey={categoryKey}
                axisLine={{ stroke: 'rgba(38, 38, 38, 0.24)' }}
                tickLine={false}
                tick={{ fill: 'rgba(38, 38, 38, 0.88)', fontSize: 12, dy: showBarLabels ? 20 : 0 }}
              />
              <YAxis
                type="number"
                ticks={axisTicks}
                domain={[0, axisTicks[axisTicks.length - 1]]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'rgba(38, 38, 38, 0.64)', fontSize: 12 }}
              />

              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'rgba(38, 38, 38, 0.04)' }}
              />

              {filteredSeries.map(s => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  fill={s.color}
                  radius={[barRadius, barRadius, 0, 0]}
                >
                  {showBarLabels && (
                    <LabelList
                      content={({ x, y, width, height: barHeight }) => {
                        const baseline = y + barHeight;
                        return (
                          <text
                            x={x + width / 2}
                            y={baseline + 14}
                            textAnchor="middle"
                            fontSize={11}
                            fill="rgba(38, 38, 38, 0.64)"
                          >
                            {s.label}
                          </text>
                        );
                      }}
                    />
                  )}
                </Bar>
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
    </div>
  );
}
