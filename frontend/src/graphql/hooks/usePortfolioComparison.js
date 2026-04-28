'use client';

import { useQuery } from '@apollo/client/react';
import { GET_TEMPORAL_SNAPSHOTS } from '../queries';
import { expandDiseaseSelection, expandProductKeySelection } from '@/lib/filterGroups';

/**
 * Build query variables from a portfolio object { disease, product }.
 * Returns { variables, skip } for useQuery.
 */
function buildQuery(portfolio) {
  if (!portfolio) return { variables: {}, skip: true };
  const variables = {};
  // Comparison portfolios carry primary diseases and (optionally)
  // secondary diseases. The legacy single `disease` field maps to
  // `primaryDiseaseNames` -- the comparison UI does not yet expose
  // a secondary picker, so the secondary list is forwarded only if
  // the caller has built it.
  const primaries = Array.isArray(portfolio.primaryDisease)
    ? portfolio.primaryDisease
    : (portfolio.primaryDisease ? [portfolio.primaryDisease] : []);
  const legacyDiseases = Array.isArray(portfolio.disease)
    ? portfolio.disease
    : (portfolio.disease ? [portfolio.disease] : []);
  const allPrimaries = primaries.length > 0
    ? primaries
    : expandDiseaseSelection(legacyDiseases);
  const secondaries = Array.isArray(portfolio.secondaryDisease)
    ? portfolio.secondaryDisease
    : (portfolio.secondaryDisease ? [portfolio.secondaryDisease] : []);
  const products = Array.isArray(portfolio.product) ? portfolio.product : (portfolio.product ? [portfolio.product] : []);
  if (allPrimaries.length > 0) {
    variables.primaryDiseaseNames = allPrimaries;
  }
  if (secondaries.length > 0) {
    variables.secondaryDiseaseNames = secondaries;
  }
  if (products.length > 0) {
    const keys = expandProductKeySelection(products);
    variables.productKeys = keys.map(v => parseInt(v));
  }
  const skip =
    allPrimaries.length === 0 && secondaries.length === 0 && products.length === 0;
  return { variables, skip };
}

/**
 * Fetches temporal snapshot data for up to 4 portfolios in parallel.
 * Each portfolio is an object { disease, product, label }.
 *
 * @param {{ disease: string, product: string, label: string }[]} portfolios
 * @returns {{ results: (Array|null)[], loading: boolean, error: any }}
 */
export function usePortfolioComparison(portfolios) {
  const c0 = buildQuery(portfolios[0]);
  const c1 = buildQuery(portfolios[1]);
  const c2 = buildQuery(portfolios[2]);
  const c3 = buildQuery(portfolios[3]);

  const q0 = useQuery(GET_TEMPORAL_SNAPSHOTS, { ...c0, fetchPolicy: 'network-only' });
  const q1 = useQuery(GET_TEMPORAL_SNAPSHOTS, { ...c1, fetchPolicy: 'network-only' });
  const q2 = useQuery(GET_TEMPORAL_SNAPSHOTS, { ...c2, fetchPolicy: 'network-only' });
  const q3 = useQuery(GET_TEMPORAL_SNAPSHOTS, { ...c3, fetchPolicy: 'network-only' });

  const configs = [c0, c1, c2, c3];
  const queries = [q0, q1, q2, q3];
  const loading = queries.some((q, i) => !configs[i].skip && q.loading);
  const error = queries.find((q, i) => !configs[i].skip && q.error)?.error;

  const results = queries.map((q, i) => {
    if (configs[i].skip || !q.data?.temporalSnapshots) return null;
    return q.data.temporalSnapshots;
  });

  return { results, loading, error };
}
