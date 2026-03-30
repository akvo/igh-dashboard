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
import { wrapLabel } from '@/lib/chart-utils';
import ChartLegend from './ChartLegend';

const defaultColors = [
  '#54A5C4', // Blue
  '#F0B456', // Gold
  '#6AB085', // Green
  '#B28FC9', // Violet
  '#F9A78D', // Peach
  '#AD5133', // Rust
  '#CBAFDE', // Light Purple
  '#CC9949', // Dark Gold
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
  barRadius = 0,
  barSize,
  maxTickChars = 25,
  // Controlled mode: parent manages item visibility via URL state.
  // When omitted, the component manages its own internal state.
  visibleItems: controlledVisibleItems,
  onVisibleItemsChange,
}) {
  const [internalVisibleItems, setInternalVisibleItems] = useState(
    data.reduce((acc, item) => ({ ...acc, [item[nameKey]]: true }), {})
  );

  const isControlled = controlledVisibleItems !== undefined;
  const visibleItems = isControlled ? controlledVisibleItems : internalVisibleItems;

  const toggleItem = (name) => {
    const next = { ...visibleItems, [name]: !visibleItems[name] };
    if (isControlled && onVisibleItemsChange) {
      onVisibleItemsChange(next);
    } else {
      setInternalVisibleItems(next);
    }
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

  const hasLongLabels = useMemo(
    () => data.some((item) => String(item[nameKey] || '').length > maxTickChars),
    [data, nameKey, maxTickChars]
  );

  return (
    <div className="w-full">
      {showFilters && (
        <ChartLegend
          items={allData.map(item => ({ key: item[nameKey], label: item[nameKey], color: item.fill }))}
          visibleItems={visibleItems}
          onToggle={toggleItem}
          onSelectAll={() => {
            const next = allData.reduce((acc, item) => ({ ...acc, [item[nameKey]]: true }), {});
            if (isControlled && onVisibleItemsChange) onVisibleItemsChange(next);
            else setInternalVisibleItems(next);
          }}
          onClearAll={() => {
            const next = allData.reduce((acc, item) => ({ ...acc, [item[nameKey]]: false }), {});
            if (isControlled && onVisibleItemsChange) onVisibleItemsChange(next);
            else setInternalVisibleItems(next);
          }}
        />
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

        <div className="flex-1 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart
              data={chartData}
              layout={layout}
              margin={{
                top: 10,
                right: 10,
                left: isHorizontalBars ? 80 : 5,
                bottom: hasLongLabels ? 10 : (xAxisLabel ? 40 : 20),
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
                    label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -10, style: { fill: 'rgba(38, 38, 38, 0.64)', fontSize: 14 } } : undefined}
                  />
                  <YAxis
                    type="category"
                    dataKey={nameKey}
                    interval={0}
                    axisLine={false}
                    tickLine={false}
                    tick={({ x, y, payload }) => {
                      const label = payload.value;
                      const lines = wrapLabel(label, maxTickChars);
                      const lineHeight = 16;
                      const startY = y - ((lines.length - 1) * lineHeight) / 2;
                      return (
                        <text x={x} y={startY} textAnchor="end" fill="rgba(38, 38, 38, 0.88)" fontSize={14}>
                          <title>{label}</title>
                          {lines.map((line, i) => (
                            <tspan key={i} x={x} dy={i === 0 ? 0 : lineHeight} dominantBaseline="central">
                              {line}
                            </tspan>
                          ))}
                        </text>
                      );
                    }}
                    width={75}
                  />
                </>
              ) : (
                <>
                  <XAxis
                    type="category"
                    dataKey={nameKey}
                    interval={0}
                    axisLine={{ stroke: 'rgba(38, 38, 38, 0.24)' }}
                    tickLine={false}
                    tick={({ x, y, payload }) => {
                      const label = String(payload.value);
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
                    label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -10, style: { fill: 'rgba(38, 38, 38, 0.64)', fontSize: 14 } } : undefined}
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
                isAnimationActive={false}
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

        </div>
      </div>
    </div>
  );
}
