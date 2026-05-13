'use client';

import { useQuery } from '@apollo/client/react';
import { GET_SLIDE_IN_TRIAL } from '../queries';

export function useSlideInTrial(trialId, options = {}) {
  const { data, loading, error } = useQuery(GET_SLIDE_IN_TRIAL, {
    variables: { trialId },
    skip: options.skip || trialId == null,
    // Slide-in detail is keyed and immutable during a session — cache it so
    // repeated opens of the same panel don't re-fetch.
    fetchPolicy: 'cache-first',
  });
  return { slideIn: data?.slideInTrial || null, loading, error };
}
