import { getEnumObjectFromArray } from '@repo/utils';

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

/**
 * Application User — aligned with Better Auth's session endpoint response.
 *
 * Fields present in every BA response: id, email, name, emailVerified, image, createdAt, updatedAt.
 * Fields marked optional are not yet returned by BA; they will be populated once the backend
 * adds custom user fields in F3 / F7.
 */
export interface User {
  id: string;
  email: string;
  /** Full display name returned by Better Auth ("John Doe") */
  name: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Extended fields — optional until backend adds them
  firstName?: string | null;
  lastName?: string | null;
  timezone?: string;
  status?: TUserStatusEnum;
  role?: Role | null;
}

/**
 * Active session — cookie-based (Better Auth).
 * No JWT tokens are stored in the browser. The session is maintained via
 * an HTTPOnly cookie managed by Better Auth.
 */
export interface Session {
  user: User;
  sessionId: string;
  expiresAt: Date;
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
  requiresEmailVerification: true;
}

// ── Permission utilities ────────────────────────────────────────────────────

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
