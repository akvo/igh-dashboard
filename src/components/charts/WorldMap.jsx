'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const defaultColorScale = [
  '#fff1ed',
  '#ffd4c7',
  '#f9a78d',
  '#fe7449',
  '#b45234',
  '#8c4028',
];

export default function WorldMap({
  data = {},
  colorScale = defaultColorScale,
  height = 400,
  showLegend = true,
  legendTitle = 'Value',
  defaultColor = '#f5f5f5',
  hoverColor = '#fe7449',
  strokeColor = '#ffffff',
  strokeWidth = 0.5,
}) {
  const [geoData, setGeoData] = useState(null);
  const [tooltipContent, setTooltipContent] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [hoveredCountry, setHoveredCountry] = useState(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

  useEffect(() => {
    fetch(geoUrl)
      .then((response) => response.json())
      .then((topology) => {
        const countries = feature(topology, topology.objects.countries);
        setGeoData(countries);
      })
      .catch((error) => console.error('Error loading map data:', error));
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setDimensions({
            width: entry.contentRect.width || 800,
            height: height,
          });
        }
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, [height]);

  const { minValue, valueRange } = useMemo(() => {
    const values = Object.values(data).filter((v) => typeof v === 'number');
    if (values.length === 0) return { minValue: 0, valueRange: 1 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { minValue: min, valueRange: max - min || 1 };
  }, [data]);

  const projection = useMemo(() => {
    return geoMercator()
      .scale(dimensions.width / 6)
      .center([0, 20])
      .translate([dimensions.width / 2, dimensions.height / 2]);
  }, [dimensions]);

  const pathGenerator = useMemo(() => geoPath().projection(projection), [projection]);

  const getColor = (countryId) => {
    const id = String(countryId);
    const value = data[id];
    if (value === undefined || value === null) return defaultColor;

    const normalizedValue = (value - minValue) / valueRange;
    const colorIndex = Math.min(
      Math.floor(normalizedValue * (colorScale.length - 1)),
      colorScale.length - 1
    );
    return colorScale[colorIndex];
  };

  const getRelativePosition = (evt) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = evt.clientX ?? evt.nativeEvent?.clientX ?? 0;
    const clientY = evt.clientY ?? evt.nativeEvent?.clientY ?? 0;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handleMouseOver = (country, evt) => {
    const countryId = String(country.id);
    const value = data[countryId];

    setHoveredCountry(countryId);
    setTooltipContent({
      name: country.properties?.name || `Country ${countryId}`,
      value: value !== undefined ? value : 'No data',
    });

    setTooltipPosition(getRelativePosition(evt));
  };

  const handleMouseMove = (evt) => {
    if (hoveredCountry) {
      setTooltipPosition(getRelativePosition(evt));
    }
  };

  const handleMouseOut = () => {
    setHoveredCountry(null);
    setTooltipContent(null);
  };

  if (!geoData) {
    return (
      <div className="w-full relative">
        <div
          style={{ height }}
          className="flex items-center justify-center bg-cream-100 rounded-lg"
        >
          <span className="text-black-48">Loading map...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full relative overflow-hidden" ref={containerRef}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        onMouseMove={handleMouseMove}
      >
        <g>
          {geoData.features.map((country) => {
            const countryId = String(country.id);
            const isHovered = hoveredCountry === countryId;
            return (
              <path
                key={countryId}
                d={pathGenerator(country)}
                fill={isHovered ? hoverColor : getColor(countryId)}
                stroke={isHovered ? hoverColor : strokeColor}
                strokeWidth={isHovered ? strokeWidth + 0.5 : strokeWidth}
                onMouseOver={(evt) => handleMouseOver(country, evt)}
                onMouseOut={handleMouseOut}
                style={{ cursor: 'pointer', transition: 'fill 0.1s ease, stroke 0.1s ease' }}
              />
            );
          })}
        </g>
      </svg>

      {tooltipContent && (
        <div
          className="bg-white border border-black-12 rounded-lg shadow-lg px-3 py-2 pointer-events-none whitespace-nowrap"
          style={{
            position: 'absolute',
            left: `${Math.min(Math.max(tooltipPosition.x + 12, 0), dimensions.width - 140)}px`,
            top: `${Math.min(Math.max(tooltipPosition.y - 50, 0), height - 60)}px`,
            zIndex: 1000,
          }}
        >
          <p className="font-medium text-black text-sm">{tooltipContent.name}</p>
          <p className="text-xs text-black-64">
            {legendTitle}:{' '}
            <span className="font-semibold text-black">{tooltipContent.value}</span>
          </p>
        </div>
      )}

      {showLegend && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <span className="text-sm text-black-64">Low</span>
          <div className="flex h-3 rounded overflow-hidden">
            {colorScale.map((color, index) => (
              <div
                key={index}
                className="w-8 h-full"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <span className="text-sm text-black-64">High</span>
        </div>
      )}
    </div>
  );
}
