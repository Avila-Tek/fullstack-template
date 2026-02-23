import type { TSignInInput, TUser } from '@repo/schemas';

export type AuthUserDto = TUser;

export interface AuthSessionDto {
  user: AuthUserDto;
  accessToken: string;
  refreshToken: string;
}

export interface AuthErrorResponse {
  success: false;
  error: string;
}

export type AuthResponse<T> = { success: true; data: T } | AuthErrorResponse;

export interface AuthApi {
  signIn(input: TSignInInput): Promise<AuthResponse<AuthSessionDto>>;
  signOut(): Promise<AuthResponse<void>>;
}
