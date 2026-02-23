export const COOKIE_KEYS = {
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  betterAuthSession: 'better-auth.session_token',
} as const;

export type TCookieKey = (typeof COOKIE_KEYS)[keyof typeof COOKIE_KEYS];
