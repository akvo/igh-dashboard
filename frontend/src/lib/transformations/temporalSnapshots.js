/**
 * Temporal Snapshots transformation functions
 * Transforms raw API response into stacked bar chart format for temporal analysis
 */

import { PHASE_COLORS, SIMPLIFIED_PHASE_NAMES, PHASE_CANONICAL_ORDER } from './constants';

/**
 * Convert phase name to a safe key for chart data
 * @param {string} phaseName - Original phase name
 * @returns {string} Safe key string
 */
function phaseNameToKey(phaseName) {
  return phaseName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
}

/**
 * Extract unique phases sorted by sort_order
 * @param {Array} data - Raw API response
 * @returns {Array} Phase configuration for charts
 */
export function extractPhases(data) {
  if (!data || data.length === 0) return [];

  // Use the frontend canonical order as the primary sort key so that
  // chart stacking always follows the R&D lifecycle, falling back to
  // the backend's sort_order for phases not in the canonical map.
  const canonicalOrder = (name) => PHASE_CANONICAL_ORDER[name] ?? 500;

  const uniquePhases = [...new Map(
    [...data]
      .sort((a, b) => canonicalOrder(a.phase_name) - canonicalOrder(b.phase_name)
                    || a.sort_order - b.sort_order)
      .map(r => [r.phase_name, r])
  ).values()];

  return uniquePhases.map(phase => ({
    key: phaseNameToKey(phase.phase_name),
    label: SIMPLIFIED_PHASE_NAMES[phase.phase_name] || phase.phase_name,
    fullLabel: phase.phase_name,
    color: PHASE_COLORS[phase.phase_name] || '#cccccc',
    sortOrder: phase.sort_order,
  }));
}

/**
 * Group temporal data by year for stacked bar chart
 * @param {Array} data - Raw API response
 * @returns {Array} Chart-ready grouped data sorted by year
 */
export function groupByYear(data) {
  if (!data || data.length === 0) return [];

  const grouped = data.reduce((acc, row) => {
    const yearKey = String(row.year);
    if (!acc[yearKey]) {
      acc[yearKey] = { category: yearKey };
    }
    const key = phaseNameToKey(row.phase_name);
    acc[yearKey][key] = row.candidateCount;
    return acc;
  }, {});

  // Sort by year descending (latest first)
  return Object.values(grouped).sort((a, b) =>
    parseInt(b.category) - parseInt(a.category)
  );
}

/**
 * Full transformation pipeline for temporal snapshots
 * @param {Array} data - Raw API response
 * @returns {{ chartData: Array, phases: Array }}
 */
export function transformTemporalSnapshots(data) {
  return {
    chartData: groupByYear(data),
    phases: extractPhases(data),
  };
}

/**
 * Mapping of phase names to 3 aggregated R&D stage categories
 */
export const AGGREGATE_PHASE_MAPPING = {
  'Discovery': 'earlyDevelopment',
  'Discovery & Preclinical': 'earlyDevelopment',
  'Discovery and preclinical': 'earlyDevelopment',
  'Discovery & Preclinical': 'earlyDevelopment',
  'Discovery & preclinical': 'earlyDevelopment',
  'Primary and secondary screening and optimisation': 'earlyDevelopment',
  'Preclinical': 'earlyDevelopment',
  'Development': 'earlyDevelopment',
  'Early development': 'earlyDevelopment',
  'Early development (concept and research)': 'earlyDevelopment',
  'Early development (feasibility and planning)': 'earlyDevelopment',
  'Phase I': 'earlyDevelopment',
  'Phase II': 'lateDevelopment',
  'Phase III': 'lateDevelopment',
  'Clinical evaluation': 'lateDevelopment',
  'Late development': 'lateDevelopment',
  'Late development (design and development)': 'lateDevelopment',
  'Late development (clinical validation and launch readiness)': 'lateDevelopment',
  'Regulatory filing': 'lateDevelopment',
  'PQ listing and regulatory approval': 'approved',
  'Approved': 'approved',
  'Phase IV': 'approved',
  'Post-marketing surveillance': 'approved',
  'Post-marketing human safety/efficacy studies (without prior clinical studies)': 'approved',
  'Human safety & efficacy': 'approved',
  'Operational research for diagnostics': 'approved',
};

export const AGGREGATE_STAGE_LABELS = {
  earlyDevelopment: 'Early development',
  lateDevelopment: 'Late development',
  approved: 'Approved products',
};

export const AGGREGATE_STAGE_COLORS = {
  earlyDevelopment: '#FE7449',
  lateDevelopment: '#B28FC9',
  approved: '#F0B456',
};

/**
 * Aggregate raw temporal data into 3 R&D stage categories per year
 * @param {Array} rawData - Raw API response [{year, phase_name, sort_order, candidateCount}]
 * @returns {Array} [{year: 2019, earlyDevelopment: 91, lateDevelopment: 73, approved: 12}, ...]
 */
export function aggregateTemporalPhases(rawData) {
  if (!rawData || rawData.length === 0) return [];

  const grouped = rawData.reduce((acc, row) => {
    const yearKey = String(row.year);
    if (!acc[yearKey]) {
      acc[yearKey] = { year: parseInt(yearKey), earlyDevelopment: 0, lateDevelopment: 0, approved: 0 };
    }
    const stage = AGGREGATE_PHASE_MAPPING[row.phase_name];
    if (stage) {
      acc[yearKey][stage] += row.candidateCount;
    }
    return acc;
  }, {});

  return Object.values(grouped).sort((a, b) => a.year - b.year);
}

/**
 * Compute growth table from aggregated temporal data
 * Shows year-on-year change % and total growth from baseline
 * @param {Array} aggregatedData - Output from aggregateTemporalPhases
 * @returns {{ rows: Array, years: Array }}
 */
export function computeGrowthTable(aggregatedData) {
  if (!aggregatedData || aggregatedData.length === 0) return { rows: [], years: [] };

  const years = aggregatedData.map(d => d.year);
  const stages = ['earlyDevelopment', 'lateDevelopment', 'approved'];
  const baseline = aggregatedData[0];

  const rows = stages.map(stage => {
    const row = {
      stage,
      label: AGGREGATE_STAGE_LABELS[stage],
      values: {},
    };

    aggregatedData.forEach((yearData, idx) => {
      const value = yearData[stage];
      const prev = idx > 0 ? aggregatedData[idx - 1][stage] : null;
      let yoyChange = null;
      if (prev !== null) {
        if (prev > 0) {
          yoyChange = (((value - prev) / prev) * 100).toFixed(1);
        } else if (prev === 0 && value > 0) {
          // From 0 to something — show as null (no meaningful %)
          yoyChange = null;
        }
      }
      let totalGrowth = null;
      if (baseline[stage] > 0) {
        totalGrowth = (((value - baseline[stage]) / baseline[stage]) * 100).toFixed(1);
      }

      row.values[yearData.year] = {
        count: value,
        yoyChange: idx > 0 ? yoyChange : null,
        isBaseline: idx === 0,
      };

      if (idx === aggregatedData.length - 1) {
        row.totalGrowth = totalGrowth;
      }
    });

    return row;
  });

  return { rows, years };
}
