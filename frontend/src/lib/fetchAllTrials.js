/**
 * Fetches all clinical trials matching a filter by paginating
 * through the API in batches.
 *
 * Mirrors the pattern in fetchAllCandidates.js but targets the
 * `GET_CLINICAL_TRIALS` query used by the trials tab.
 */

import { GET_CLINICAL_TRIALS } from '@/graphql/queries';
import { buildClinicalTrialFilterVars } from '@/graphql/hooks/useClinicalTrials';

const BATCH_SIZE = 100;

/**
 * Fetch all clinical trials matching `filter` using the Apollo Client
 * imperative `query()` API.
 *
 * @param {import('@apollo/client').ApolloClient} client
 * @param {Object} filter - Same shape accepted by `useClinicalTrials`.
 * @returns {Promise<Array>} All matching trial rows.
 */
export async function fetchAllTrials(client, filter) {
  const filterVars = buildClinicalTrialFilterVars(filter);
  let allNodes = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data } = await client.query({
      query: GET_CLINICAL_TRIALS,
      variables: {
        filter: filterVars,
        limit: BATCH_SIZE,
        offset,
      },
      fetchPolicy: 'network-only',
    });

    const result = data?.clinicalTrials;
    const nodes = result?.nodes || [];
    allNodes = allNodes.concat(nodes);
    hasMore = result?.hasNextPage && nodes.length > 0;
    offset += BATCH_SIZE;
  }

  return allNodes;
}
