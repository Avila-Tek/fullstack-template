import type { User } from '@repo/auth';
import type { TUser } from '@repo/schemas';

/**
 * Current User API response types (DTOs) for admin
 */

export type CurrentUserDto = TUser;

export interface CurrentUserErrorResponse {
  success: false;
  error: string;
}

export type CurrentUserResponse =
  | { success: true; data: CurrentUserDto }
  | CurrentUserErrorResponse;

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

export interface CurrentUserApi {
  getCurrentUser(): Promise<CurrentUserResponse>;
  getSession(): Promise<SessionResponse>;
}
