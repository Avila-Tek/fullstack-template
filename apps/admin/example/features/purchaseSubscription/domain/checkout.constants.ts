import { getEnumObjectFromArray } from '@repo/utils';

/**
 * Checkout status values
 */
export const checkoutStatus = [
  'loading',
  'success',
  'error',
  'cancelled',
] as const;
export type TCheckoutStatusEnum = (typeof checkoutStatus)[number];
export const checkoutStatusEnumObject = getEnumObjectFromArray(checkoutStatus);

/**
 * Checkout result types
 */
export const checkoutResultType = ['free', 'paid', 'cancelled'] as const;
export type TCheckoutResultTypeEnum = (typeof checkoutResultType)[number];
export const checkoutResultTypeEnumObject =
  getEnumObjectFromArray(checkoutResultType);

/**
 * Routes for checkout flow
 */
export const checkoutRoutes = {
  success: '/subscribe/success',
  cancel: '/subscribe/cancel',
  plans: '/plans',
  dashboard: '/all-habits',
} as const;

/**
 * Checkout session status values
 */
export const checkoutSessionStatus = ['open', 'complete', 'expired'] as const;
export type TCheckoutSessionStatusEnum = (typeof checkoutSessionStatus)[number];
export const checkoutSessionStatusEnumObject = getEnumObjectFromArray(
  checkoutSessionStatus
);

/**
 * Query parameter keys for checkout routes
 */
export const checkoutQueryParams = {
  planId: 'planId',
  sessionId: 'session_id',
} as const;
export type TCheckoutQueryParamEnum =
  (typeof checkoutQueryParams)[keyof typeof checkoutQueryParams];

/**
 * Query keys for checkout
 */
export const checkoutQueryKeys = {
  checkout: ['checkout'] as const,
  verify: ['checkout', 'verify'] as const,
} as const;
export type TCheckoutQueryKey = (typeof checkoutQueryKeys.checkout)[number];
export const checkoutQueryKeyEnumObject = getEnumObjectFromArray(
  checkoutQueryKeys.checkout
);
