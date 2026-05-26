import { createAuthClient } from 'better-auth/react';

/**
 * Shared better-auth browser client.
 * Used by both apps/client and apps/admin via @repo/auth.
 *
 * baseURL must be the API root (e.g. http://localhost:8080).
 * basePath must match the server's basePath config (/api/v1/auth).
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? '',
  basePath: '/api/v1/auth',
  fetchOptions: {
    // Forward browser locale to get translated error messages from the API
    headers:
      typeof navigator !== 'undefined'
        ? { 'Accept-Language': navigator.language }
        : { 'Accept-Language': 'es' },
  },
});
