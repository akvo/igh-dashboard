'use client';

import { useState, useMemo } from 'react';

const defaultColors = [
  '#fe7449', // Orange
  '#f9a78d', // Peach
  '#8c4028', // Dark brown
  '#f0b456', // Gold
  '#cbafde', // Light purple
  '#54a5c4', // Teal
];

export default function BubbleChart({
  data = [],
  colors = defaultColors,
  height = 400,
  minRadius = 60,
  maxRadius = 140,
  gap = 15,
  showLegend = true,
  showValues = true,
  nameKey = 'name',
  valueKey = 'value',
}) {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const bubbles = useMemo(() => {
    if (!data.length) return [];

    const values = data.map((d) => d[valueKey]);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const valueRange = maxValue - minValue || 1;

    // Calculate radii based on values (area proportional to value)
    const bubblesWithRadius = data.map((item, index) => {
      const normalizedValue = (item[valueKey] - minValue) / valueRange;
      // Use square root for area-proportional sizing
      const radius = minRadius + Math.sqrt(normalizedValue) * (maxRadius - minRadius);
      return {
        ...item,
        radius,
        color: colors[index % colors.length],
        index,
      };
    });

    // Sort by radius descending for better packing
    const sorted = [...bubblesWithRadius].sort((a, b) => b.radius - a.radius);

    // Simple packing algorithm - position bubbles
    const positioned = [];
    const containerWidth = 500;
    const containerHeight = height - (showLegend ? 80 : 0);
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;

    sorted.forEach((bubble, i) => {
      if (i === 0) {
        // First (largest) bubble goes slightly left of center
        positioned.push({
          ...bubble,
          x: centerX - bubble.radius * 0.3,
          y: centerY - bubble.radius * 0.2,
        });
      } else if (i === 1) {
        // Second bubble goes to the right with gap
        const prev = positioned[0];
        positioned.push({
          ...bubble,
          x: prev.x + prev.radius + bubble.radius + gap,
          y: centerY - bubble.radius * 0.3,
        });
      } else if (i === 2) {
        // Third bubble goes below and between with gap
        const first = positioned[0];
        const second = positioned[1];
        positioned.push({
          ...bubble,
          x: (first.x + second.x) / 2 + bubble.radius * 0.3,
          y: Math.max(first.y, second.y) + Math.max(first.radius, second.radius) * 0.6 + bubble.radius + gap,
        });
      } else {
        // Additional bubbles - find a spot with gap
        const angle = (i - 3) * (Math.PI / 3) + Math.PI / 6;
        const distance = maxRadius * 1.8 + gap;
        positioned.push({
          ...bubble,
          x: centerX + Math.cos(angle) * distance,
          y: centerY + Math.sin(angle) * distance,
        });
      }
    });

    // Re-sort by original index for consistent legend ordering
    return positioned.sort((a, b) => a.index - b.index);
  }, [data, colors, minRadius, maxRadius, gap, height, showLegend, nameKey, valueKey]);

  // Calculate viewBox to fit all bubbles
  const viewBox = useMemo(() => {
    if (!bubbles.length) return '0 0 500 400';

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    bubbles.forEach((b) => {
      minX = Math.min(minX, b.x - b.radius);
      minY = Math.min(minY, b.y - b.radius);
      maxX = Math.max(maxX, b.x + b.radius);
      maxY = Math.max(maxY, b.y + b.radius);
    });

    const padding = 20;
    const width = maxX - minX + padding * 2;
    const svgHeight = maxY - minY + padding * 2;

    return `${minX - padding} ${minY - padding} ${width} ${svgHeight}`;
  }, [bubbles]);

  const formatValue = (value) => {
    if (value >= 1000) {
      return value.toLocaleString();
    }
    return value;
  };

  return (
    <div className="w-full">
      <div style={{ height: height - (showLegend ? 60 : 0) }}>
        <svg
          width="100%"
          height="100%"
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
        >
          {bubbles.map((bubble, index) => (
            <g
              key={index}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={bubble.x}
                cy={bubble.y}
                r={bubble.radius}
                fill={bubble.color}
                opacity={hoveredIndex === null || hoveredIndex === index ? 1 : 0.6}
                style={{
                  transition: 'opacity 0.2s, transform 0.2s',
                  transform: hoveredIndex === index ? 'scale(1.02)' : 'scale(1)',
                  transformOrigin: `${bubble.x}px ${bubble.y}px`,
                }}
              />
              {showValues && (
                <text
                  x={bubble.x}
                  y={bubble.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={bubble.radius * 0.28}
                  fontWeight="600"
                  style={{ pointerEvents: 'none' }}
                >
                  {formatValue(bubble[valueKey])}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>

      {showLegend && (
        <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center mt-4">
          {bubbles.map((bubble, index) => (
            <div
              key={index}
              className="flex items-center gap-2 cursor-pointer"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: bubble.color }}
              />
              <span
                className={`text-sm transition-colors ${
                  hoveredIndex === index ? 'text-black font-medium' : 'text-black-64'
                }`}
              >
                {bubble[nameKey]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
