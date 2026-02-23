import { getEnumObjectFromArray } from '@repo/utils';

/**
 * Current user constants - object enums
 * Following the auth feature pattern
 */

// Query keys for React Query
export const currentUserQueryKey = ['currentUser'] as const;
export type TCurrentUserQueryKey = (typeof currentUserQueryKey)[number];
export const currentUserQueryKeyEnumObject =
  getEnumObjectFromArray(currentUserQueryKey);

// Routes
export const currentUserRoutes = {} as const;

// Subscription status that indicates an active subscription
export const activeSubscriptionStatuses = ['active', 'trialing'] as const;
export type TActiveSubscriptionStatusEnum =
  (typeof activeSubscriptionStatuses)[number];
export const activeSubscriptionStatusEnumObject = getEnumObjectFromArray(
  activeSubscriptionStatuses
);

/**
 * Auth status values for UserContext state management
 */
export const authStatus = [
  'loading',
  'authenticated',
  'unauthenticated',
] as const;
export type TAuthStatusEnum = (typeof authStatus)[number];
export const authStatusEnumObject = getEnumObjectFromArray(authStatus);

/**
 * LocalStorage keys for user session data
 */
export const localStorageKeys = [
  'accessToken',
  'user',
  'refreshToken',
] as const;
export type TLocalStorageKeyEnum = (typeof localStorageKeys)[number];
export const localStorageKeysEnumObject =
  getEnumObjectFromArray(localStorageKeys);
