'use client';

import { useQuery } from '@apollo/client/react';
import { GET_SLIDE_IN_PRODUCT } from '../queries';

export function useSlideInProduct(candidateKey, options = {}) {
  const { data, loading, error } = useQuery(GET_SLIDE_IN_PRODUCT, {
    variables: { candidateKey },
    skip: options.skip || candidateKey == null,
    fetchPolicy: 'cache-first',
  });
  return { slideIn: data?.slideInProduct || null, loading, error };
}
