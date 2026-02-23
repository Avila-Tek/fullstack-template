/**
 * Current User domain models for admin
 * Uses types from @repo/auth
 */

export type { Role, User } from '@repo/auth';

export interface UserSession {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    timezone: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}
