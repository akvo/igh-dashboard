/**
 * Fetches all R&D priorities matching a filter by paginating
 * through the API in batches.
 *
 * Mirrors the pattern in fetchAllCandidates.js but targets the
 * priority queries used by the Extract tab.
 */

import { GET_RD_PRIORITIES_WITH_CANDIDATES, GET_RD_PRIORITIES } from '@/graphql/queries';
import { buildPriorityFilterVars } from '@/graphql/hooks/useRdPriorities';

const BATCH_SIZE = 100;

/**
 * Fetch all priorities with linked candidates (Tab 2).
 */
export async function fetchAllPrioritiesWithCandidates(client, filter) {
  const filterVars = buildPriorityFilterVars(filter);
  let allNodes = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data } = await client.query({
      query: GET_RD_PRIORITIES_WITH_CANDIDATES,
      variables: {
        filter: filterVars,
        limit: BATCH_SIZE,
        offset,
      },
      fetchPolicy: 'network-only',
    });

    const result = data?.rdPrioritiesWithCandidates;
    const nodes = result?.nodes || [];
    allNodes = allNodes.concat(nodes);
    hasMore = result?.hasNextPage && nodes.length > 0;
    offset += BATCH_SIZE;
  }

  return allNodes;
}

/**
 * Fetch all priorities without candidate data (Tab 4).
 */
export async function fetchAllPriorities(client, filter) {
  const filterVars = buildPriorityFilterVars(filter);
  let allNodes = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data } = await client.query({
      query: GET_RD_PRIORITIES,
      variables: {
        filter: filterVars,
        limit: BATCH_SIZE,
        offset,
      },
      fetchPolicy: 'network-only',
    });

    const result = data?.rdPriorities;
    const nodes = result?.nodes || [];
    allNodes = allNodes.concat(nodes);
    hasMore = result?.hasNextPage && nodes.length > 0;
    offset += BATCH_SIZE;
  }

  return allNodes;
}
