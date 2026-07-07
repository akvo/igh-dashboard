'use client';

// =========================================================
// Shared visual-insights chart primitives and constants
// =========================================================
//
// These presentational helpers and constants were extracted verbatim from
// the Analytical Insights page so the Visual Insights tab components can
// share them. They render from props only and hold no data-fetching logic.
//
// The three primitive components (MiniDonut, BarTooltip, DonutTooltip) are
// pure SVG / DOM and reference no recharts components, so no recharts import
// is needed here. Charts that consume these tooltips import recharts in their
// own modules.

// ---------- Constants ----------

export const GHA_COLORS = {
  'Neglected diseases': '#B28FC9',
  "Women's health": '#54A5C4',
  'Emerging infectious diseases': '#8DD6A9',
};

export const TAB_LABELS = {
  candidates: { disease: 'Top 5 diseases by candidate count', product: 'Top 5 product types by candidate count' },
  approved: { disease: 'Top 5 diseases by approved product count', product: 'Top 5 product types by approved product count' },
  trials: { disease: 'Top 5 diseases by clinical trial count', product: 'Top 5 product types by clinical trial count' },
};

// Sub-title copy shown beneath each Top-5 chart title. Parallels TAB_LABELS so a
// tab reads `TAB_LABELS[scope].disease` for the title and
// `TAB_DESCRIPTIONS[scope].disease` for the description.
export const TAB_DESCRIPTIONS = {
  candidates: {
    disease: 'Ranks the five diseases with the most candidates, with bars colour-coded by global health area. Reflects the active filters.',
    product: 'Ranks the five product types with the most candidates. Reflects the active filters.',
  },
  approved: {
    disease: 'Ranks the five diseases with the most approved products, with bars colour-coded by global health area. Reflects the active filters.',
    product: 'Ranks the five product types with the most approved products. Reflects the active filters.',
  },
  trials: {
    disease: 'Ranks the five diseases with the most clinical trials, with bars colour-coded by global health area. Reflects the active filters.',
    product: 'Ranks the five product types with the most clinical trials. Reflects the active filters.',
  },
};

// KPI stat-card tooltips. The `total` card copy is unique per tab; the three GHA
// cards are keyed by the GHA display name (exactly what displayHealthArea
// returns and what GHA_COLORS uses) and differ only by the tab's noun.
export const KPI_TOOLTIPS = {
  candidates: {
    total: 'The number of active candidates in development that match the current filters.',
    "Women's health": "The number of those candidates addressing women's health conditions.",
    'Neglected diseases': 'The number of those candidates addressing neglected diseases.',
    'Emerging infectious diseases': 'The number of those candidates addressing emerging infectious diseases.',
  },
  approved: {
    total: 'The number of approved health products that match the current filters.',
    "Women's health": "The number of those approved products addressing women's health conditions.",
    'Neglected diseases': 'The number of those approved products addressing neglected diseases.',
    'Emerging infectious diseases': 'The number of those approved products addressing emerging infectious diseases.',
  },
  trials: {
    total: 'The number of clinical trials linked to the pipeline that match the current filters.',
    "Women's health": "The number of those trials addressing women's health conditions.",
    'Neglected diseases': 'The number of those trials addressing neglected diseases.',
    'Emerging infectious diseases': 'The number of those trials addressing emerging infectious diseases.',
  },
};

export const APPROVING_AUTH_PHASES = [
  { key: 'who_prequalified', label: 'WHO prequalified', color: '#fe7449' },
  { key: 'no_who_listing', label: 'No formal WHO listing', color: '#f9a78d' },
];

export const TECH_PHASES = [
  { key: 'discovery', label: 'Discovery', color: '#AD5133' },
  { key: 'pre_clinical', label: 'Pre-clinical', color: '#FE7449' },
  { key: 'phase_1', label: 'Phase 1', color: '#F9A78D' },
  { key: 'phase_2', label: 'Phase 2', color: '#B28FC9' },
  { key: 'phase_3', label: 'Phase 3', color: '#CBAFDE' },
  { key: 'approved', label: 'Approved', color: '#F0B456' },
];

export const ITEMS_PER_PAGE = 25;

export const STATUS_COLORS = ['#54A5C4', '#F0B456', '#fe7449', '#6AB085', '#AD5133', '#B28FC9'];
export const AGE_COLORS = ['#f9a78d', '#54a5c4', '#fe7449', '#CBAFDE', '#f0b456', '#B28FC9'];

// ---------- Mini donut for stat cards ----------

export function MiniDonut({ percentage, color, size = 56 }) {
  const strokeW = 5;
  const radius = (size - strokeW) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (percentage / 100) * circumference;
  const gap = circumference - filled;

  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f3f3f3" strokeWidth={strokeW} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeW}
        strokeDasharray={`${filled} ${gap}`}
        strokeDashoffset={circumference / 4}
        strokeLinecap="round"
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central" fontSize="11" fontWeight="600" fill="#333">
        {percentage}%
      </text>
    </svg>
  );
}

export function BarTooltip({ active, payload, label, labelMap }) {
  if (!active || !payload?.length) return null;
  const total = payload.length > 1
    ? payload.reduce((sum, p) => sum + (p.value || 0), 0)
    : null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <div className="font-semibold text-black mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.fill || p.color }} />
          <span className="text-gray-600">{labelMap?.[p.dataKey] || p.name || p.dataKey}:</span>
          <span className="font-medium text-black">{p.value}</span>
        </div>
      ))}
      {total != null && (
        <div className="flex items-center gap-2 mt-1 pt-1 border-t border-gray-200">
          <span className="text-gray-600">Total:</span>
          <span className="font-medium text-black">{total}</span>
        </div>
      )}
    </div>
  );
}

export function DonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.payload.color || d.payload.fill }} />
        <span className="font-medium text-black">{d.name}</span>
      </div>
      <div className="mt-1 text-gray-600">{d.value}</div>
    </div>
  );
}
