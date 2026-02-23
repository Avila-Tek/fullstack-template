import { cookieKeysEnumObject } from '@repo/services';
import type { NextRequest } from 'next/server';

export function getSessionToken(request: NextRequest): string | null {
  const betterAuthCookie = request.cookies.get(
    cookieKeysEnumObject['better_auth.session_token']
  )?.value;
  if (betterAuthCookie) return betterAuthCookie;

  const accessTokenCookie = request.cookies.get(
    cookieKeysEnumObject.accessToken
  )?.value;
  if (accessTokenCookie) return accessTokenCookie;

  return null;
}

export function isAuthenticated(request: NextRequest): boolean {
  return !!getSessionToken(request);
}
