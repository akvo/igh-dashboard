'use client';

import { useQuery } from '@apollo/client/react';
import { GET_SLIDE_IN_PRODUCT } from '../queries';

export function useSlideInProduct(candidateKey, options = {}) {
  const { data, loading, error } = useQuery(GET_SLIDE_IN_PRODUCT, {
    variables: { candidateKey },
    skip: options.skip || candidateKey == null,
    // Slide-in detail is keyed and immutable during a session — cache it so
    // repeated opens of the same panel don't re-fetch.
    fetchPolicy: 'cache-first',
  });
  return { slideIn: data?.slideInProduct || null, loading, error };
}
