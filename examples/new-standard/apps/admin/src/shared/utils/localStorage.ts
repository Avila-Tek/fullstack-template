type LocalStorageKey = 'accessToken' | 'user' | 'refreshToken';

export function getLocalStorageItem<T = string>(
  key: LocalStorageKey
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

export function setLocalStorageItem<T>(key: LocalStorageKey, value: T): void {
  if (typeof window === 'undefined') return;
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  localStorage.setItem(key, serialized);
}

export function removeLocalStorageItem(key: LocalStorageKey): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

export function clearLocalStorage(keys: LocalStorageKey[]): void {
  keys.forEach(removeLocalStorageItem);
}
