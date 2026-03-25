'use client';

// =========================================================
// Chart-type-specific SVG placeholder graphics
// =========================================================
// Each variant renders a ghosted version of the chart type
// in muted grays, giving visual context for what data would
// look like while clearly communicating "no data."

const grays = {
  light: '#F3F4F6',
  mid: '#E5E7EB',
  dark: '#D1D5DB',
};

// Helper to compute SVG arc path for donut segments.
// Angles in degrees, measured clockwise from 12 o'clock.
function describeArc(cx, cy, innerR, outerR, startAngle, endAngle) {
  const toRad = (deg) => ((deg - 90) * Math.PI) / 180;
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  const outerStart = {
    x: cx + outerR * Math.cos(toRad(startAngle)),
    y: cy + outerR * Math.sin(toRad(startAngle)),
  };
  const outerEnd = {
    x: cx + outerR * Math.cos(toRad(endAngle)),
    y: cy + outerR * Math.sin(toRad(endAngle)),
  };
  const innerStart = {
    x: cx + innerR * Math.cos(toRad(endAngle)),
    y: cy + innerR * Math.sin(toRad(endAngle)),
  };
  const innerEnd = {
    x: cx + innerR * Math.cos(toRad(startAngle)),
    y: cy + innerR * Math.sin(toRad(startAngle)),
  };

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerEnd.x} ${innerEnd.y}`,
    'Z',
  ].join(' ');
}

const DonutPlaceholder = () => {
  const cx = 60, cy = 60, innerR = 32, outerR = 54;
  // Four segments with small gaps (4deg each)
  const segments = [
    { start: 0, end: 140, fill: grays.mid },
    { start: 144, end: 230, fill: grays.dark },
    { start: 234, end: 300, fill: grays.light },
    { start: 304, end: 356, fill: grays.mid },
  ];

  return (
    <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
      {segments.map((s, i) => (
        <path
          key={i}
          d={describeArc(cx, cy, innerR, outerR, s.start, s.end)}
          fill={s.fill}
        />
      ))}
    </svg>
  );
};

const BarPlaceholder = () => (
  <svg width="140" height="80" viewBox="0 0 140 80" aria-hidden="true">
    <line x1="10" y1="75" x2="130" y2="75" stroke={grays.mid} strokeWidth="1" />
    <rect x="15" y="30" width="16" height="45" rx="2" fill={grays.mid} />
    <rect x="39" y="12" width="16" height="63" rx="2" fill={grays.dark} />
    <rect x="63" y="40" width="16" height="35" rx="2" fill={grays.light} />
    <rect x="87" y="8" width="16" height="67" rx="2" fill={grays.mid} />
    <rect x="111" y="48" width="16" height="27" rx="2" fill={grays.dark} />
  </svg>
);

const StackedBarPlaceholder = () => (
  <svg width="140" height="80" viewBox="0 0 140 80" aria-hidden="true">
    <line x1="10" y1="75" x2="130" y2="75" stroke={grays.mid} strokeWidth="1" />
    {/* Bar 1: two stacked segments */}
    <rect x="15" y="40" width="20" height="35" rx="2" fill={grays.mid} />
    <rect x="15" y="18" width="20" height="22" rx="2" fill={grays.light} />
    {/* Bar 2 */}
    <rect x="45" y="30" width="20" height="45" rx="2" fill={grays.dark} />
    <rect x="45" y="10" width="20" height="20" rx="2" fill={grays.mid} />
    {/* Bar 3 */}
    <rect x="75" y="45" width="20" height="30" rx="2" fill={grays.mid} />
    <rect x="75" y="28" width="20" height="17" rx="2" fill={grays.light} />
    {/* Bar 4 */}
    <rect x="105" y="35" width="20" height="40" rx="2" fill={grays.dark} />
    <rect x="105" y="15" width="20" height="20" rx="2" fill={grays.mid} />
  </svg>
);

const BubblePlaceholder = () => (
  <svg width="120" height="100" viewBox="0 0 120 100" aria-hidden="true">
    <circle cx="45" cy="55" r="28" fill={grays.light} />
    <circle cx="78" cy="40" r="20" fill={grays.mid} />
    <circle cx="65" cy="70" r="14" fill={grays.dark} />
    <circle cx="30" cy="35" r="10" fill={grays.mid} />
  </svg>
);

const GenericPlaceholder = () => (
  <svg width="120" height="80" viewBox="0 0 120 80" aria-hidden="true">
    <line x1="10" y1="70" x2="110" y2="70" stroke={grays.mid} strokeWidth="1" />
    <polyline
      points="15,55 35,30 55,45 75,15 95,35 110,25"
      fill="none"
      stroke={grays.dark}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="35" cy="30" r="3" fill={grays.dark} />
    <circle cx="55" cy="45" r="3" fill={grays.dark} />
    <circle cx="75" cy="15" r="3" fill={grays.dark} />
    <circle cx="95" cy="35" r="3" fill={grays.dark} />
  </svg>
);

const placeholders = {
  donut: DonutPlaceholder,
  bar: BarPlaceholder,
  stackedBar: StackedBarPlaceholder,
  bubble: BubblePlaceholder,
  generic: GenericPlaceholder,
};

export default function ChartEmptyState({
  variant = 'generic',
  height = 280,
  title = 'No data available',
  description,
}) {
  const Placeholder = placeholders[variant] || GenericPlaceholder;

  return (
    <div
      style={{ height }}
      className="flex flex-col items-center justify-center"
    >
      <div className="opacity-60 mb-3">
        <Placeholder />
      </div>
      <p className="text-sm font-semibold text-gray-400 m-0">{title}</p>
      {description && (
        <p className="text-xs text-gray-400 mt-1 m-0 text-center max-w-xs">
          {description}
        </p>
      )}
    </div>
  );
}
