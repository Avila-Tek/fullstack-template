import { getEnumObjectFromArray } from '@repo/utils';

/**
 * Current User domain models
 * Frontend-friendly shapes aligned with backend schema
 */

// Current user with subscription
export interface CurrentUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  timezone: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User session model
 * Represents the authenticated session for the current user
 */
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
