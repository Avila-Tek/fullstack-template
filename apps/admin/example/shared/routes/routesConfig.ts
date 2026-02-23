import { ROUTES } from './routes';

export const PUBLIC_ROUTES = [
  ROUTES.LOGIN,
  ROUTES.SIGNUP,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.RESET_PASSWORD,
  ROUTES.VERIFY_EMAIL,
  ROUTES.CALLBACK,
] as const;

export const AUTH_ROUTES = [
  ROUTES.LOGIN,
  ROUTES.SIGNUP,
  ROUTES.FORGOT_PASSWORD,
  ROUTES.RESET_PASSWORD,
] as const;

export const PROTECTED_ROUTES = [
  ROUTES.DASHBOARD,
  ROUTES.SUBSCRIBE,
  ROUTES.PROFILE,
] as const;

export type TPublicRoute = (typeof PUBLIC_ROUTES)[number];
export type TAuthRoute = (typeof AUTH_ROUTES)[number];
export type TProtectedRoute = (typeof PROTECTED_ROUTES)[number];
