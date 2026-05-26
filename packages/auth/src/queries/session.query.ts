import { queryOptions } from '@tanstack/react-query';
import type { Session } from '../domain/auth.model';
import { authClient } from '../client/better-auth.client';

/**
 * React Query options for the active session.
 *
 * staleTime matches the BA cookie cache maxAge (5 min) — avoids redundant
 * GET /auth/session fetches while the cookie cache is warm.
 *
 * retry: false — a 401 is not a transient error; retrying makes the UX
 * flicker unnecessarily.
 */
export const sessionQueryOptions = () =>
  queryOptions<Session | null>({
    queryKey: ['auth', 'session'],
    queryFn: async (): Promise<Session | null> => {
      const result = await authClient.getSession();
      if (!result.data?.session || !result.data?.user) return null;

      const { session, user } = result.data;
      return {
        sessionId: session.id,
        expiresAt: new Date(session.expiresAt),
        user: {
          id:            user.id,
          email:         user.email,
          name:          user.name,
          emailVerified: user.emailVerified,
          image:         user.image ?? null,
          createdAt:     new Date(user.createdAt),
          updatedAt:     new Date(user.updatedAt),
        },
      };
    },
    staleTime: 1000 * 60 * 5,  // 5 minutes
    gcTime:    1000 * 60 * 10, // 10 minutes
    retry:     false,
  });
