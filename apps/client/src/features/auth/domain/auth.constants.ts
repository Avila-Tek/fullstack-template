import { getEnumObjectFromArray } from '@repo/utils';

export const authSearchParam = [
  'token_hash',
  'type',
  'email',
  'reset',
] as const;
export type TAuthSearchParamEnum = (typeof authSearchParam)[number];
export const authSearchParamEnumObject =
  getEnumObjectFromArray(authSearchParam);

export function getRandomTagline(taglines: readonly string[]): string {
  const index = Math.floor(Math.random() * taglines.length);
  return taglines[index] ?? taglines[0] ?? '';
}

export const authPageType = [
  'login',
  'signUp',
  'forgotPassword',
  'verifyEmail',
] as const;
export type TAuthPageTypeEnum = (typeof authPageType)[number];
export const authPageTypeEnumObject = getEnumObjectFromArray(authPageType);

export const supabaseOtpType = ['email'] as const;
export type TSupabaseOtpType = (typeof supabaseOtpType)[number];
export const supabaseOtpTypeEnumObject =
  getEnumObjectFromArray(supabaseOtpType);
