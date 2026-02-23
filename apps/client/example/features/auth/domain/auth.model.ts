import { getEnumObjectFromArray } from '@repo/utils';

/**
 * Auth domain models - frontend-friendly shapes
 * Aligned with backend schema (Better Auth + Supabase)
 *
 * NOTE: Form types are defined in infrastructure/auth.dto.ts
 * API input/output types come from @repo/schemas
 */

export const userStatus = ['Active', 'Disabled'] as const;
export type TUserStatusEnum = (typeof userStatus)[number];
export const userStatusEnumObject = getEnumObjectFromArray(userStatus);

export interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  timezone: string;
  status: TUserStatusEnum;
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

/**
 * Response types
 */

export interface SignUpResult {
  user: User | null;
  requiresEmailConfirmation: boolean;
}
