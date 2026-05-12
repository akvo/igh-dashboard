'use client';

import { useQuery } from '@apollo/client/react';
import { GET_SLIDE_IN_CANDIDATE } from '../queries';

export function useSlideInCandidate(candidateKey, options = {}) {
  const { data, loading, error } = useQuery(GET_SLIDE_IN_CANDIDATE, {
    variables: { candidateKey },
    skip: options.skip || candidateKey == null,
    // Slide-in detail is keyed and immutable during a session — cache it so
    // repeated opens of the same panel don't re-fetch.
    fetchPolicy: 'cache-first',
  });
  return { slideIn: data?.slideInCandidate || null, loading, error };
}
