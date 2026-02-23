import { getEnumObjectFromArray } from '@repo/utils';

/**
 * Cookie keys for authentication and session management
 */
export const cookieKeys = [
  'accessToken',
  'refreshToken',
  'better-auth.session_token',
] as const;
export type TCookieKeyEnum = (typeof cookieKeys)[number];
export const cookieKeysEnumObject = getEnumObjectFromArray(cookieKeys);
