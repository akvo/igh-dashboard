/**
 * Fetches all portfolio candidates matching a filter by paginating
 * through the API in batches.
 *
 * The backend caps each request at MAX_LIMIT = 100 rows, so we issue
 * sequential requests, advancing the offset until all rows are collected.
 */

import { GET_PORTFOLIO_CANDIDATES } from '@/graphql/queries';

const BATCH_SIZE = 100;

/**
 * Transform the UI-level filter shape into the GraphQL variable format
 * expected by `GET_PORTFOLIO_CANDIDATES`. This mirrors the mapping in
 * `usePortfolioCandidates` so callers can pass the same filter object.
 */
function buildFilterVariables(filter) {
  return {
    global_health_areas:
      filter?.globalHealthAreas?.length > 0
        ? filter.globalHealthAreas
        : undefined,
    disease_names:
      filter?.diseaseNames?.length > 0 ? filter.diseaseNames : undefined,
    product_names:
      filter?.productNames?.length > 0 ? filter.productNames : undefined,
    candidate_type: filter?.candidateType || undefined,
    phase_names:
      filter?.phaseNames?.length > 0 ? filter.phaseNames : undefined,
    search: filter?.search || undefined,
  };
}

/**
 * Fetch all candidates matching `filter` using the Apollo Client
 * imperative `query()` API.
 *
 * @param {import('@apollo/client').ApolloClient} client
 * @param {Object} filter - Same shape accepted by `usePortfolioCandidates`.
 * @returns {Promise<Array>} All matching candidate rows.
 */
export async function fetchAllCandidates(client, filter) {
  const filterVars = buildFilterVariables(filter);
  let allNodes = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data } = await client.query({
      query: GET_PORTFOLIO_CANDIDATES,
      variables: {
        filter: filterVars,
        limit: BATCH_SIZE,
        offset,
      },
      fetchPolicy: 'network-only',
    });

    const result = data?.portfolioCandidates;
    const nodes = result?.nodes || [];
    allNodes = allNodes.concat(nodes);
    hasMore = result?.hasNextPage && nodes.length > 0;
    offset += BATCH_SIZE;
  }

  return allNodes;
}
