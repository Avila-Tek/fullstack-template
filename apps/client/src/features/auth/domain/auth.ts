import { getEnumObjectFromArray } from '@repo/utils';

// ---- types & interfaces ----

export const userStatus = ['active', 'inactive'] as const;
export type TUserStatusEnum = (typeof userStatus)[number];
export const userStatusEnumObject = getEnumObjectFromArray(userStatus);

export const roleCodes = ['USER', 'ADMIN'] as const;
export type TRoleCode = (typeof roleCodes)[number];

export interface Role {
  id: string;
  code: TRoleCode;
  name: string;
  permissions: string[];
}

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  timezone?: string;
  status: TUserStatusEnum;
  role: Role | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface AuthError {
  code: string;
  message: string;
}

export type AuthState =
  | { status: 'unauthenticated' }
  | { status: 'loading' }
  | { status: 'authenticated'; session: Session };

export interface SignUpResult {
  user: User | null;
  requiresEmailConfirmation: boolean;
}

// ---- permission helpers ----

export function hasPermission(
  user: User | null | undefined,
  permissionCode: string
): boolean {
  if (!user?.role) return false;
  return user.role.permissions.includes(permissionCode);
}

export function hasAnyPermission(
  user: User | null | undefined,
  permissionCodes: string[]
): boolean {
  if (!user?.role) return false;
  return permissionCodes.some((code) => user.role!.permissions.includes(code));
}

export function hasRole(
  user: User | null | undefined,
  roleCode: TRoleCode
): boolean {
  return user?.role?.code === roleCode;
}

export function isAdmin(user: User | null | undefined): boolean {
  return hasRole(user, 'ADMIN');
}

// ---- constants ----

export const authSearchParam = [
  'token_hash',
  'type',
  'email',
  'reset',
] as const;
export type TAuthSearchParamEnum = (typeof authSearchParam)[number];
export const authSearchParamEnumObject = getEnumObjectFromArray(authSearchParam);

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
export const supabaseOtpTypeEnumObject = getEnumObjectFromArray(supabaseOtpType);

// ---- logic ----

export const passwordStrength = ['weak', 'fair', 'good', 'strong'] as const;
export type TPasswordStrength = (typeof passwordStrength)[number];
export const passwordStrengthEnumObject = getEnumObjectFromArray(passwordStrength);

export function isSessionValid(session: Session | null): session is Session {
  if (!session) return false;
  return !!session.accessToken && !!session.user;
}

export function evaluatePasswordStrength(password: string): {
  strength: TPasswordStrength;
  score: number;
} {
  let score = 0;

  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { strength: passwordStrengthEnumObject.weak, score };
  if (score === 2) return { strength: passwordStrengthEnumObject.fair, score };
  if (score === 3) return { strength: passwordStrengthEnumObject.good, score };
  return { strength: passwordStrengthEnumObject.strong, score };
}
