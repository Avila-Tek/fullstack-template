import { getEnumObjectFromArray } from '@repo/utils';

/**
 * Purchase result type constants
 * Used for determining the type of subscription result
 */
export const purchaseResultType = ['free', 'checkout'] as const;
export type TPurchaseResultTypeEnum = (typeof purchaseResultType)[number];
export const purchaseResultTypeEnumObject =
  getEnumObjectFromArray(purchaseResultType);

/**
 * Query keys for React Query
 */
export const purchaseSubscriptionQueryKeys = {
  plan: ['purchase-subscription', 'plan'] as const,
  subscribe: ['purchase-subscription', 'subscribe'] as const,
} as const;

/**
 * Routes for purchase subscription flow
 */
export const PURCHASE_SUBSCRIPTION_ROUTES = {
  subscribe: '/subscribe',
  dashboard: '/all-habits',
} as const;

export type TPurchaseSubscriptionRoute =
  (typeof PURCHASE_SUBSCRIPTION_ROUTES)[keyof typeof PURCHASE_SUBSCRIPTION_ROUTES];

/**
 * Response type constants from backend
 */
export const FREE_SUBSCRIPTION_CREATED = 'free_subscription_created' as const;
export const CHECKOUT_REDIRECT = 'checkout_redirect' as const;

export const subscriptionResponseType = [
  FREE_SUBSCRIPTION_CREATED,
  CHECKOUT_REDIRECT,
] as const;
export type TSubscriptionResponseTypeEnum =
  (typeof subscriptionResponseType)[number];
export const subscriptionResponseTypeEnumObject = getEnumObjectFromArray(
  subscriptionResponseType
);

export const purchaseSubscriptionSearchParams = ['planId'] as const;
export type TPurchaseSubscriptionSearchParams =
  (typeof purchaseSubscriptionSearchParams)[number];
export const purchaseSubscriptionSearchParamsEnumObject =
  getEnumObjectFromArray(purchaseSubscriptionSearchParams);
