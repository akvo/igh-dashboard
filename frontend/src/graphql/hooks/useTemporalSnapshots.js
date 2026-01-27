'use client';

import { useQuery } from '@apollo/client/react';
import { GET_TEMPORAL_SNAPSHOTS } from '../queries';
import { temporalSnapshotsFixture } from '@/data/fixtures';

// Phase color mapping (same as usePhaseDistribution)
const phaseColors = {
  'Discovery': '#8c4028',
  'Preclinical': '#b45038',
  'Phase I': '#fe7449',
  'Phase II': '#f9a78d',
  'Phase III': '#ffd4c7',
  'Phase IV': '#b090e0',
};

// Simplified phase names
const simplifiedPhaseNames = {
  'Discovery': 'Discovery',
  'Preclinical': 'Preclinical',
  'Phase I': 'Phase I',
  'Phase II': 'Phase II',
  'Phase III': 'Phase III',
  'Phase IV': 'Phase IV',
};

function transformTemporalData(data) {
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

  // Group by year
  const grouped = data.reduce((acc, row) => {
    const yearKey = String(row.year);
    if (!acc[yearKey]) {
      acc[yearKey] = { category: yearKey };
    }
    const key = row.phase_name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    acc[yearKey][key] = row.candidateCount;
    return acc;
  }, {});

  // Sort by year
  const chartData = Object.values(grouped).sort((a, b) =>
    parseInt(a.category) - parseInt(b.category)
  );

  return { chartData, phases };
}

export function useTemporalSnapshots(years) {
  const { data, loading, error } = useQuery(GET_TEMPORAL_SNAPSHOTS, {
    variables: { years: years?.length > 0 ? years : undefined },
  });

  const { chartData, phases } = transformTemporalData(data?.temporalSnapshots);

  return {
    chartData,
    phases,
    loading,
    error,
    raw: data?.temporalSnapshots,
  };
}

// Hook with fixture fallback
export function useTemporalSnapshotsWithFallback(years) {
  const { chartData, phases, loading, error, raw } = useTemporalSnapshots(years);

  if (error || (!loading && chartData.length === 0)) {
    let fixture = temporalSnapshotsFixture.temporalSnapshots;

    // Filter by years if provided
    if (years && years.length > 0) {
      fixture = fixture.filter(item => years.includes(item.year));
    }

    const transformed = transformTemporalData(fixture);
    return {
      ...transformed,
      loading: false,
      error: null,
      usingFixture: true,
    };
  }

  return { chartData, phases, loading, error, usingFixture: false };
}
