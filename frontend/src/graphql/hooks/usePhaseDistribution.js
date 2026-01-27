'use client';

import { useQuery } from '@apollo/client/react';
import { GET_PHASE_DISTRIBUTION } from '../queries';
import { phaseDistributionFixture } from '@/data/fixtures';

// Phase color mapping
const phaseColors = {
  'Discovery': '#8c4028',
  'Primary and secondary screening and optimisation': '#a04830',
  'Preclinical': '#b45038',
  'Development': '#c86040',
  'Early development (concept and research)': '#dc7048',
  'Early development (feasibility and planning)': '#f08050',
  'Phase I': '#fe7449',
  'Phase II': '#f9a78d',
  'Phase III': '#ffd4c7',
  'Late development (design and development)': '#ffe0d5',
  'Late development (clinical validation and launch readiness)': '#ffece5',
  'Regulatory filing': '#e8d5ff',
  'PQ listing and regulatory approval': '#d0b0ff',
  'Phase IV': '#b090e0',
};

// Simplified phase names for display
const simplifiedPhaseNames = {
  'Discovery': 'Discovery',
  'Primary and secondary screening and optimisation': 'Screening',
  'Preclinical': 'Preclinical',
  'Development': 'Development',
  'Early development (concept and research)': 'Early Dev',
  'Early development (feasibility and planning)': 'Feasibility',
  'Phase I': 'Phase I',
  'Phase II': 'Phase II',
  'Phase III': 'Phase III',
  'Late development (design and development)': 'Late Dev',
  'Late development (clinical validation and launch readiness)': 'Validation',
  'Regulatory filing': 'Reg Filing',
  'PQ listing and regulatory approval': 'PQ/Approval',
  'Phase IV': 'Phase IV',
};

function transformPhaseDistribution(data) {
  if (!data || data.length === 0) return { chartData: [], phases: [] };

  // Get unique phases sorted by sort_order
  const uniquePhases = [...new Map(
    [...data]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(r => [r.phase_name, r])
  ).values()];

  // Create phases config for chart
  const phases = uniquePhases.map(phase => ({
    key: phase.phase_name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
    label: simplifiedPhaseNames[phase.phase_name] || phase.phase_name,
    fullLabel: phase.phase_name,
    color: phaseColors[phase.phase_name] || '#cccccc',
    sortOrder: phase.sort_order,
  }));

  // Group by health area
  const grouped = data.reduce((acc, row) => {
    if (!acc[row.global_health_area]) {
      acc[row.global_health_area] = { category: row.global_health_area };
    }
    const key = row.phase_name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    acc[row.global_health_area][key] = row.candidateCount;
    return acc;
  }, {});

  return {
    chartData: Object.values(grouped),
    phases,
  };
}

export function usePhaseDistribution(globalHealthArea, productKey) {
  const { data, loading, error } = useQuery(GET_PHASE_DISTRIBUTION, {
    variables: {
      globalHealthArea: globalHealthArea || undefined,
      productKey: productKey || undefined,
    },
  });

  const { chartData, phases } = transformPhaseDistribution(data?.phaseDistribution);

  return {
    chartData,
    phases,
    loading,
    error,
    raw: data?.phaseDistribution,
  };
}

// Hook with fixture fallback
export function usePhaseDistributionWithFallback(globalHealthArea, productKey) {
  const { chartData, phases, loading, error, raw } = usePhaseDistribution(globalHealthArea, productKey);

  if (error || (!loading && chartData.length === 0)) {
    const fixture = phaseDistributionFixture.phaseDistribution;
    const transformed = transformPhaseDistribution(fixture);
    return {
      ...transformed,
      loading: false,
      error: null,
      usingFixture: true,
    };
  }

  return { chartData, phases, loading, error, usingFixture: false };
}
