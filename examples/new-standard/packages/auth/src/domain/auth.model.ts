import { getEnumObjectFromArray } from '@repo/utils';

/**
 * Auth domain models - frontend-friendly shapes
 * Aligned with backend schema (Better Auth + Supabase)
 */

export const userStatus = ['Active', 'Disabled'] as const;
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
  timezone: string;
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

/**
 * Permission check utilities
 */
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
