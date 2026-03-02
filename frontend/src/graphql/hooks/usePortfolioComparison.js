'use client';

import { useQuery } from '@apollo/client/react';
import { GET_TEMPORAL_SNAPSHOTS } from '../queries';

/**
 * Fetches temporal snapshot data for up to 4 portfolios in parallel.
 * Each portfolio is identified by a disease group name.
 * Empty strings in the array are skipped (no query fired).
 *
 * @param {string[]} portfolios - Array of 4 disease group names (empty = unused)
 * @returns {{ results: (Array|null)[], loading: boolean, error: any }}
 */
export function usePortfolioComparison(portfolios) {
  const q0 = useQuery(GET_TEMPORAL_SNAPSHOTS, {
    variables: { diseaseGroupNames: [portfolios[0]] },
    skip: !portfolios[0],
    fetchPolicy: 'network-only',
  });
  const q1 = useQuery(GET_TEMPORAL_SNAPSHOTS, {
    variables: { diseaseGroupNames: [portfolios[1]] },
    skip: !portfolios[1],
    fetchPolicy: 'network-only',
  });
  const q2 = useQuery(GET_TEMPORAL_SNAPSHOTS, {
    variables: { diseaseGroupNames: [portfolios[2]] },
    skip: !portfolios[2],
    fetchPolicy: 'network-only',
  });
  const q3 = useQuery(GET_TEMPORAL_SNAPSHOTS, {
    variables: { diseaseGroupNames: [portfolios[3]] },
    skip: !portfolios[3],
    fetchPolicy: 'network-only',
  });

  const queries = [q0, q1, q2, q3];
  const loading = queries.some((q, i) => portfolios[i] && q.loading);
  const error = queries.find((q, i) => portfolios[i] && q.error)?.error;

  const results = queries.map((q, i) => {
    if (!portfolios[i] || !q.data?.temporalSnapshots) return null;
    return q.data.temporalSnapshots;
  });

  return { results, loading, error };
}
