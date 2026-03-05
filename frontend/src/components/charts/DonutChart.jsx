'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from 'recharts';

const defaultColors = [
  '#F0B456', // Gold
  '#CBAFDE', // Light Purple
  '#B08888', // Mauve
  '#E3D6C1', // Beige
  '#F9A78D', // Peach
  '#CC9949', // Dark Gold
  '#6AB085', // Green
  '#54A5C4', // Blue
];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0];
  const total = data.payload.total;
  const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;

  return (
    <div className="bg-white border border-black-12 rounded-lg shadow-lg p-3 relative z-50">
      <div className="flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-sm"
          style={{ backgroundColor: data.payload.fill }}
        />
        <span className="font-medium text-black">{data.name}</span>
      </div>
      <div className="mt-1 text-sm text-black-64">
        <span className="font-semibold text-black">{data.value}</span>
        <span className="ml-1">({percentage}%)</span>
      </div>
    </div>
  );
};

const renderActiveShape = (props) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 2}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};

export default function DonutChart({
  data = [],
  colors = defaultColors,
  innerRadius = 60,
  outerRadius = 100,
  height = 300,
  showLegend = true,
  legendPosition = 'bottom',
  paddingAngle = 2,
  nameKey = 'name',
  valueKey = 'value',
}) {
  const [activeIndex, setActiveIndex] = useState(null);

  const total = data.reduce((sum, item) => sum + (item[valueKey] || 0), 0);
  const isEmpty = data.length === 0 || total === 0;

  const chartData = data.map((item, index) => ({
    ...item,
    fill: colors[index % colors.length],
    total,
  }));

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  const Legend = () => (
    <div
      className={`flex flex-wrap gap-x-6 gap-y-2 ${
        legendPosition === 'bottom' ? 'mt-4 justify-center' : 'ml-4'
      }`}
    >
      {chartData.map((item, index) => (
        <div
          key={index}
          className="flex items-center gap-2 cursor-pointer"
          onMouseEnter={() => setActiveIndex(index)}
          onMouseLeave={() => setActiveIndex(null)}
        >
          <span
            className="w-3 h-3 rounded-sm flex-shrink-0"
            style={{ backgroundColor: item.fill }}
          />
          <span
            className={`text-sm transition-colors ${
              activeIndex === index ? 'text-black font-medium' : 'text-black-64'
            }`}
          >
            {item[nameKey]}
          </span>
        </div>
      ))}
    </div>
  );

  const isHorizontal = legendPosition === 'right' || legendPosition === 'left';

  if (isEmpty) {
    return (
      <div className="w-full overflow-visible">
        <div
          style={{ height }}
          className="flex items-center justify-center"
        >
          <svg
            width={outerRadius * 2 + 12}
            height={outerRadius * 2 + 12}
            viewBox={`0 0 ${outerRadius * 2 + 12} ${outerRadius * 2 + 12}`}
          >
            <circle
              cx={outerRadius + 6}
              cy={outerRadius + 6}
              r={(innerRadius + outerRadius) / 2}
              fill="none"
              stroke="#E5E7EB"
              strokeWidth={outerRadius - innerRadius}
            />
            <text
              x={outerRadius + 6}
              y={outerRadius + 6}
              textAnchor="middle"
              dominantBaseline="central"
              className="text-sm"
              fill="currentColor"
              style={{ opacity: 0.48 }}
            >
              No data available
            </text>
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full overflow-hidden ${isHorizontal ? 'flex items-center' : ''} ${
        legendPosition === 'left' ? 'flex-row-reverse' : ''
      }`}
    >
      {showLegend && legendPosition === 'top' && <Legend />}
      {showLegend && legendPosition === 'left' && <Legend />}

      <div style={{ height, width: isHorizontal ? 'auto' : '100%', flexGrow: isHorizontal ? 1 : undefined }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={paddingAngle}
              dataKey={valueKey}
              nameKey={nameKey}
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.fill}
                  stroke="none"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {showLegend && legendPosition === 'bottom' && <Legend />}
      {showLegend && legendPosition === 'right' && <Legend />}
    </div>
  );
}
