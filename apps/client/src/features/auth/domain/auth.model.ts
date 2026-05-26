import { getEnumObjectFromArray } from '@repo/utils';

/**
 * Auth domain models — aligned with Better Auth session endpoint response.
 *
 * Form types live in domain/auth.form.ts
 * Service input/output contracts are re-exported from @repo/schemas below.
 */

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
 * Core fields (always present): id, email, name, emailVerified, image, createdAt, updatedAt.
 * Extended fields (optional until backend adds them in F3/F7): firstName, lastName, etc.
 */
export interface User {
  id: string;
  email: string;
  /** Full display name returned by Better Auth */
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
 * No JWT tokens are stored in JS. The session is maintained via an HTTPOnly cookie.
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

// ── Service input/output contracts ──────────────────────────────────────────
// Sourced from @repo/schemas (single source of truth for endpoint shapes).

export type {
  TForgotPasswordInput as ForgetPasswordInput,
  TResetPasswordInput as ResetPasswordInput,
  TSendVerificationEmailInput as SendVerificationEmailInput,
  TSignInEmailInput as SignInInput,
  TSignInSocialInput as SignInSocialInput,
  TSignUpEmailInput as SignUpInput,
  TSignUpResult as SignUpResult,
  TVerifyEmailInput as VerifyEmailInput,
} from '@repo/schemas';

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
