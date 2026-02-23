export const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/callback',
] as const;

export const AUTH_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
] as const;

export type TPublicRoute = (typeof PUBLIC_ROUTES)[number];
export type TAuthRoute = (typeof AUTH_ROUTES)[number];
