import type {
  TEmailCallbackQuery,
  TForgotPasswordInput,
  TResetPasswordWithOtpInput,
  TSendOtpInput,
  TSignInInput,
  TSignUpInput,
  TUser,
  TVerifyOtpInput,
} from '@repo/schemas';

/**
 * Auth API response types (DTOs)
 * Aligned with backend Better Auth + Supabase schema
 */
export type AuthUserDto = TUser;

export interface AuthSessionDto {
  user: AuthUserDto;
  accessToken: string;
  refreshToken: string;
}

export interface SignUpResultDto {
  user: AuthUserDto | null;
  requiresEmailConfirmation: boolean;
}

export interface AuthErrorResponse {
  success: false;
  error: string;
}

export type AuthResponse<T> = { success: true; data: T } | AuthErrorResponse;

/**
 * Contract for Auth API operations.
 * Implemented with better-auth + supabase.
 */
export interface AuthApi {
  signIn(input: TSignInInput): Promise<AuthResponse<AuthSessionDto>>;
  signUp(input: TSignUpInput): Promise<AuthResponse<SignUpResultDto>>;
  signOut(): Promise<AuthResponse<void>>;
  verifyEmailCallback(
    input: TEmailCallbackQuery
  ): Promise<AuthResponse<AuthSessionDto>>;
  sendOtp(input: TSendOtpInput): Promise<AuthResponse<void>>;
  verifyOtp(input: TVerifyOtpInput): Promise<AuthResponse<AuthSessionDto>>;
  forgotPassword(input: TForgotPasswordInput): Promise<AuthResponse<void>>;
  resetPassword(input: TResetPasswordWithOtpInput): Promise<AuthResponse<void>>;
  getGoogleAuthUrl(callbackUrl?: string): string;
}
