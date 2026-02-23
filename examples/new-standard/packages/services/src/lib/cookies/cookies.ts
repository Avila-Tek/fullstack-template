'use server';

import { cookies } from 'next/headers';
import { cookieKeysEnumObject, TCookieKeyEnum } from './cookies-config';

export async function getCookie(
  name: TCookieKeyEnum
): Promise<string | undefined> {
  'use server';
  return (await cookies()).get(name)?.value;
}

export async function setCookie(
  name: TCookieKeyEnum,
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

export async function removeCookie(name: TCookieKeyEnum): Promise<void> {
  'use server';
  (await cookies()).delete(name);
}

export async function clearCookies(keys: TCookieKeyEnum[]): Promise<void> {
  'use server';
  const cookieStore = await cookies();
  for (const key of keys) {
    cookieStore.delete(key);
  }
}

export async function getAccessTokenCookie(): Promise<string | undefined> {
  'use server';
  return (await cookies()).get(cookieKeysEnumObject.accessToken)?.value;
}

export async function setAccessTokenCookie(token: string): Promise<void> {
  'use server';
  (await cookies()).set({
    name: cookieKeysEnumObject.accessToken,
    value: token,
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function removeAccessTokenCookie(): Promise<void> {
  'use server';
  (await cookies()).delete(cookieKeysEnumObject.accessToken);
}
