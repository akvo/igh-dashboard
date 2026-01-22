'use client';

import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Sector } from 'recharts';

const defaultColors = [
  '#f9a78d', // Peach/Neonates
  '#8c4028', // Dark brown/Infants
  '#fe7449', // Orange/Children
  '#cbafde', // Light purple/Adolescents
  '#e3d6c1', // Beige
  '#f0b456', // Gold/Yellow
  '#54a5c4', // Teal/Blue
  '#a78bfa', // Purple
];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0];
  const total = data.payload.total;
  const percentage = ((data.value / total) * 100).toFixed(1);

  return (
    <div className="bg-white border border-black-12 rounded-lg shadow-lg p-3">
      <div className="flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-full"
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

  const total = data.reduce((sum, item) => sum + item[valueKey], 0);

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
            className="w-3 h-3 rounded-full flex-shrink-0"
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
