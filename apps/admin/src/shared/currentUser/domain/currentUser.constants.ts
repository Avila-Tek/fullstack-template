import { getEnumObjectFromArray } from '@repo/utils';

/**
 * Current user constants for admin
 */

export const currentUserQueryKey = ['currentUser'] as const;
export type TCurrentUserQueryKey = (typeof currentUserQueryKey)[number];
export const currentUserQueryKeyEnumObject =
  getEnumObjectFromArray(currentUserQueryKey);

export const currentUserRoutes = {
  login: '/login',
  dashboard: '/admin/dashboard',
} as const;

export const authStatus = [
  'loading',
  'authenticated',
  'unauthenticated',
] as const;
export type TAuthStatusEnum = (typeof authStatus)[number];
export const authStatusEnumObject = getEnumObjectFromArray(authStatus);

export const localStorageKeys = [
  'accessToken',
  'user',
  'refreshToken',
] as const;
export type TLocalStorageKeyEnum = (typeof localStorageKeys)[number];
export const localStorageKeysEnumObject =
  getEnumObjectFromArray(localStorageKeys);
