'use server';

import { cookies } from 'next/headers';
import {
  COOKIE_KEYS,
  type TCookieKey,
} from '@/src/shared/constants/cookiesConfig';

export async function getCookie(name: TCookieKey): Promise<string | undefined> {
  'use server';
  return (await cookies()).get(name)?.value;
}

export async function setCookie(
  name: TCookieKey,
  value: string
): Promise<void> {
  'use server';
  (await cookies()).set({
    name,
    value,
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function removeCookie(name: TCookieKey): Promise<void> {
  'use server';
  (await cookies()).delete(name);
}

export async function clearCookies(keys: TCookieKey[]): Promise<void> {
  'use server';
  const cookieStore = await cookies();
  for (const key of keys) {
    cookieStore.delete(key);
  }
}

export async function getAccessTokenCookie(): Promise<string | undefined> {
  'use server';
  return (await cookies()).get(COOKIE_KEYS.accessToken)?.value;
}

export async function setAccessTokenCookie(token: string): Promise<void> {
  'use server';
  (await cookies()).set({
    name: COOKIE_KEYS.accessToken,
    value: token,
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function removeAccessTokenCookie(): Promise<void> {
  'use server';
  (await cookies()).delete(COOKIE_KEYS.accessToken);
}
