/**
 * Fetches all portfolio candidates matching a filter by paginating
 * through the API in batches.
 *
 * The backend caps each request at MAX_LIMIT = 100 rows, so we issue
 * sequential requests, advancing the offset until all rows are collected.
 */

import { GET_PORTFOLIO_CANDIDATES } from '@/graphql/queries';
import { buildCandidateFilterVars } from '@/graphql/hooks/usePortfolioCandidates';

const BATCH_SIZE = 100;

/**
 * Fetch all candidates matching `filter` using the Apollo Client
 * imperative `query()` API.
 *
 * @param {import('@apollo/client').ApolloClient} client
 * @param {Object} filter - Same shape accepted by `usePortfolioCandidates`.
 * @returns {Promise<Array>} All matching candidate rows.
 */
export async function fetchAllCandidates(client, filter) {
  const filterVars = buildCandidateFilterVars(filter);
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
