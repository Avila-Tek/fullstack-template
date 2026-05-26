import type { NextRequest } from 'next/server';

/**
 * Better Auth sets an HTTPOnly session cookie named `better-auth.session_token`.
 * This is the only auth signal the middleware needs to check.
 */
const BA_SESSION_COOKIE = 'better-auth.session_token';

export function getSessionToken(request: NextRequest): string | null {
  return request.cookies.get(BA_SESSION_COOKIE)?.value ?? null;
}

export function isAuthenticated(request: NextRequest): boolean {
  return !!getSessionToken(request);
}
