import { getEnumObjectFromArray } from '@repo/utils';

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

/**
 * Get item from localStorage with type safety
 */
export function getLocalStorageItem<T = string>(
  key: TLocalStorageKeyEnum
): T | null {
  if (typeof window === 'undefined') return null;
  const item = localStorage.getItem(key);
  if (!item) return null;

  try {
    return JSON.parse(item) as T;
  } catch {
    return item as T;
  }
}

/**
 * Set item in localStorage with type safety
 */
export function setLocalStorageItem<T>(
  key: TLocalStorageKeyEnum,
  value: T
): void {
  if (typeof window === 'undefined') return;
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  localStorage.setItem(key, serialized);
}

/**
 * Remove item from localStorage
 */
export function removeLocalStorageItem(key: TLocalStorageKeyEnum): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

/**
 * Clear multiple items from localStorage
 */
export function clearLocalStorage(keys: TLocalStorageKeyEnum[]): void {
  keys.forEach(removeLocalStorageItem);
}
