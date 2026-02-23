/**
 * Centralized application routes
 * All routes are accessed through routeBuilders for consistency and future-proofing.
 * Even static routes use builders to maintain a single pattern.
 */

// Internal route path constants (used for route classification)
const ROUTE_PATHS = {
  // Auth routes
  LOGIN: '/login',
  SIGNUP: '/signup',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  CALLBACK: '/callback',

  // App routes
  PLANS: '/plans',
  DASHBOARD: '/all-habits',
  PROFILE: '/settings/profile',
  SUBSCRIBE: '/subscribe',
  SUBSCRIBE_SUCCESS: '/subscribe/success',
  SUBSCRIBE_CANCEL: '/subscribe/cancel',

  // Legal routes
  TERMS: '/terms',
  PRIVACY: '/privacy',
} as const;

/**
 * Unified route builders - ALL routes go through builders for consistency.
 * This ensures no magic strings and makes it easy to add params later.
 */
export const routeBuilders = {
  // Static routes (no params needed, but can accept optional params for future-proofing)
  login: (params?: { callbackUrl?: string; reset?: string }) => {
    if (!params || Object.keys(params).length === 0) {
      return ROUTE_PATHS.LOGIN;
    }
    const url = new URL(ROUTE_PATHS.LOGIN, 'http://dummy');
    if (params.callbackUrl) {
      url.searchParams.set('callbackUrl', params.callbackUrl);
    }
    if (params.reset) {
      url.searchParams.set('reset', params.reset);
    }
    return url.pathname + url.search;
  },

  signup: () => ROUTE_PATHS.SIGNUP,

  forgotPassword: () => ROUTE_PATHS.FORGOT_PASSWORD,

  resetPassword: (params?: { email?: string }) => {
    if (!params?.email) {
      return ROUTE_PATHS.RESET_PASSWORD;
    }
    return `${ROUTE_PATHS.RESET_PASSWORD}?email=${encodeURIComponent(params.email)}`;
  },

  verifyEmail: (params?: { email?: string }) => {
    if (!params?.email) {
      return ROUTE_PATHS.VERIFY_EMAIL;
    }
    return `${ROUTE_PATHS.VERIFY_EMAIL}?email=${encodeURIComponent(params.email)}`;
  },

  callback: () => ROUTE_PATHS.CALLBACK,

  // App routes
  plans: () => ROUTE_PATHS.PLANS,

  dashboard: () => ROUTE_PATHS.DASHBOARD,

  profile: () => ROUTE_PATHS.PROFILE,

  subscribe: (params?: { planId?: string }) => {
    if (!params?.planId) {
      return ROUTE_PATHS.SUBSCRIBE;
    }
    return `${ROUTE_PATHS.SUBSCRIBE}?planId=${params.planId}`;
  },

  subscribeSuccess: () => ROUTE_PATHS.SUBSCRIBE_SUCCESS,

  subscribeCancel: () => ROUTE_PATHS.SUBSCRIBE_CANCEL,

  // Legal routes
  terms: () => ROUTE_PATHS.TERMS,

  privacy: () => ROUTE_PATHS.PRIVACY,
} as const;

/**
 * Route path constants exported for route classification
 * (PUBLIC_ROUTES, AUTH_ROUTES, PROTECTED_ROUTES, etc.)
 */
export const ROUTES = ROUTE_PATHS;
