'use client';

import { useState, useMemo, useEffect, useRef, memo } from 'react';
import { geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { colors } from '@/lib/theme';

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

// Module-level cache so the CDN fetch happens exactly once per browser session,
// surviving component unmounts and page navigations.
let geoDataCache = null;
let geoDataPromise = null;

function fetchGeoData() {
  if (geoDataCache) return Promise.resolve(geoDataCache);
  if (!geoDataPromise) {
    geoDataPromise = fetch(geoUrl)
      .then((r) => r.json())
      .then((topology) => {
        geoDataCache = feature(topology, topology.objects.countries);
        return geoDataCache;
      })
      .catch((error) => {
        geoDataPromise = null; // allow retry on failure
        console.error('Error loading map data:', error);
        return null;
      });
  }
  return geoDataPromise;
}

const defaultColorScale = [
  colors.orange[50],
  colors.orange[100],
  colors.orange[200],
  colors.orange[300],
  colors.orange[400],
  colors.orange[500],
  colors.orange[600],
  colors.orange[700],
  colors.orange[800],
  colors.orange[900],
];

function WorldMap({
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
    fetchGeoData().then((data) => { if (data) setGeoData(data); });
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

  const maxValue = useMemo(() => {
    let max = 0;
    for (const v of Object.values(data)) {
      if (typeof v === 'number' && v > max) max = v;
    }
    return max;
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
    if (!value || maxValue <= 0) return defaultColor;

    // Logarithmic normalization: log(v) / log(max), clamped to [0, 1].
    // Matches the heatmap table approach — essential because map data is
    // heavily right-skewed, so linear scaling makes most countries
    // indistinguishable.
    const normalized = maxValue > 1
      ? Math.log(value) / Math.log(maxValue)
      : 0;
    const clamped = Math.max(0, Math.min(1, normalized));

    const colorIndex = Math.min(
      Math.round(clamped * (colorScale.length - 1)),
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
      <div className="w-full relative overflow-hidden">
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
          {geoData.features.map((country, index) => {
            const countryId = country.id != null ? String(country.id) : `country-${index}`;
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

export default memo(WorldMap);
