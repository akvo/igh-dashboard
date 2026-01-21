'use client';

import { useState, useMemo } from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const defaultColors = [
  '#fe7449', // Orange
  '#8c4028', // Dark brown
  '#f9a78d', // Peach
  '#f0b456', // Gold
  '#cbafde', // Light purple
  '#a78bfa', // Purple
  '#54a5c4', // Teal
  '#8dd6a9', // Green
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white border border-black-12 rounded-lg shadow-lg p-3">
      <p className="font-medium text-black mb-1">{payload[0].payload.name || label}</p>
      <p className="text-sm text-black-64">
        Value: <span className="font-semibold text-black">{payload[0].value}</span>
      </p>
    </div>
  );
};

export default function BarChart({
  data = [],
  layout = 'horizontal', // 'horizontal' = vertical bars, 'vertical' = horizontal bars
  colors = defaultColors,
  showFilters = true,
  height = 400,
  xAxisLabel = '',
  yAxisLabel = '',
  nameKey = 'name',
  valueKey = 'value',
  barRadius = 4,
  barSize,
}) {
  const [visibleItems, setVisibleItems] = useState(
    data.reduce((acc, item) => ({ ...acc, [item[nameKey]]: true }), {})
  );

  const toggleItem = (name) => {
    setVisibleItems((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const chartData = useMemo(() => {
    return data
      .filter((item) => visibleItems[item[nameKey]])
      .map((item, index) => ({
        ...item,
        fill: colors[data.findIndex((d) => d[nameKey] === item[nameKey]) % colors.length],
      }));
  }, [data, visibleItems, nameKey, colors]);

  const allData = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      fill: colors[index % colors.length],
    }));
  }, [data, colors]);

  const maxValue = useMemo(() => {
    return Math.max(...chartData.map((item) => item[valueKey]));
  }, [chartData, valueKey]);

  const axisTicks = useMemo(() => {
    const step = maxValue > 100 ? 50 : maxValue > 10 ? Math.ceil(maxValue / 5) : 1;
    const max = Math.ceil(maxValue / step) * step + step;
    const ticks = [];
    for (let i = 0; i <= max; i += step) {
      ticks.push(i);
    }
    return ticks;
  }, [maxValue]);

  const isHorizontalBars = layout === 'vertical';

  return (
    <div className="w-full">
      {showFilters && (
        <div className="flex flex-wrap gap-4 mb-6">
          {allData.map((item) => (
            <label
              key={item[nameKey]}
              className="flex items-center gap-2 cursor-pointer select-none"
            >
              <div className="relative">
                <input
                  type="checkbox"
                  checked={visibleItems[item[nameKey]]}
                  onChange={() => toggleItem(item[nameKey])}
                  className="sr-only"
                />
                <div
                  className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: visibleItems[item[nameKey]]
                      ? item.fill
                      : 'transparent',
                    borderColor: item.fill,
                  }}
                >
                  {visibleItems[item[nameKey]] && (
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
              <span className="text-sm text-black-88">{item[nameKey]}</span>
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
          <RechartsBarChart
            data={chartData}
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
              horizontal={isHorizontalBars ? false : true}
              vertical={isHorizontalBars ? true : false}
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
                  dataKey={nameKey}
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
                  dataKey={nameKey}
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

            <Bar
              dataKey={valueKey}
              radius={
                isHorizontalBars
                  ? [0, barRadius, barRadius, 0]
                  : [barRadius, barRadius, 0, 0]
              }
              barSize={barSize}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </RechartsBarChart>
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
