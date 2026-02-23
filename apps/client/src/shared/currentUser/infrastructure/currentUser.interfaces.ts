import type { TUser } from '@repo/schemas';
import type { CurrentUser, UserSession } from '../domain/currentUser.model';

/**
 * Current User API response types (DTOs)
 * Aligned with backend schema
 */

// Current user DTO (re-exported from schemas)
export type { TUser };
export type CurrentUserDto = TUser;

export interface CurrentUserErrorResponse {
  success: false;
  error: string;
}

export type CurrentUserResponse =
  | { success: true; data: CurrentUserDto }
  | CurrentUserErrorResponse;

// Session DTO
export interface SessionDto {
  user: TUser;
  accessToken: string;
  refreshToken: string;
}

export interface SessionErrorResponse {
  success: false;
  error: string;
}

export type SessionResponse =
  | { success: true; data: SessionDto }
  | SessionErrorResponse;

/**
 * Contract for Current User API operations
 */
export interface CurrentUserApi {
  getCurrentUser(): Promise<CurrentUserResponse>;
  getSession(): Promise<SessionResponse>;
}
