'use client';

import { useQuery } from '@tanstack/react-query';
import type { Session } from '../domain/auth.model';
import { sessionQueryOptions } from '../queries/session.query';

export interface UseSessionResult {
  session:         Session | null;
  isAuthenticated: boolean;
  isPending:       boolean;
  isError:         boolean;
}

/**
 * Returns the current session from React Query cache.
 *
 * Note: requires QueryClientProvider to be present in the component tree.
 * Use sessionQueryOptions() directly in Server Components (prefetch/dehydrate).
 */
export function useSession(): UseSessionResult {
  const query = useQuery(sessionQueryOptions());

  return {
    session:         query.data ?? null,
    isAuthenticated: query.data !== null && query.data !== undefined,
    isPending:       query.isPending,
    isError:         query.isError,
  };
}
