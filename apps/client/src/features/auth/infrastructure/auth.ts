import type {
  TEmailCallbackQuery,
  TForgotPasswordInput,
  TResetPasswordWithOtpInput,
  TRole,
  TSendOtpInput,
  TSignInInput,
  TSignUpInput,
  TUser,
  TVerifyOtpInput,
} from '@repo/schemas';
import type { Role, Session, SignUpResult, User } from '../domain/auth';
import type { TEmailCallbackForm, TResetPasswordForm } from './auth.form';

// ---- DTOs & API contract ----

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

// ---- transforms ----

export function toRoleDomain(dto: TRole | null | undefined): Role | null {
  if (!dto) return null;
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    permissions: dto.permissions,
  };
}

export function toUserDomain(dto: AuthUserDto): User {
  return {
    id: dto.id,
    email: dto.email,
    firstName: dto.firstName,
    lastName: dto.lastName,
    timezone: dto.timezone,
    status: dto.status,
    role: toRoleDomain(dto.role),
    createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(),
    updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : new Date(),
  };
}

export function toSessionDomain(dto: AuthSessionDto): Session {
  return {
    user: toUserDomain(dto.user),
    accessToken: dto.accessToken,
    refreshToken: dto.refreshToken,
  };
}

export function toSignUpResultDomain(dto: SignUpResultDto): SignUpResult {
  return {
    user: dto.user ? toUserDomain(dto.user) : null,
    requiresEmailConfirmation: dto.requiresEmailConfirmation,
  };
}

export function toEmailCallbackQuery(
  form: TEmailCallbackForm
): TEmailCallbackQuery {
  return {
    token_hash: form.tokenHash,
    type: form.type,
  };
}

export function toResetPasswordInput(
  form: TResetPasswordForm
): TResetPasswordWithOtpInput {
  return {
    email: form.email,
    otp: form.otp,
    newPassword: form.newPassword,
  };
}

// ---- service ----

export class AuthServiceClass {
  constructor(private api: AuthApi) {}

  async signIn(input: TSignInInput): Promise<Session> {
    const result = await this.api.signIn(input);
    if (!result.success) {
      throw new Error(result.error);
    }
    return toSessionDomain(result.data);
  }

  async signUp(input: TSignUpInput): Promise<SignUpResult> {
    const result = await this.api.signUp(input);
    if (!result.success) {
      throw new Error(result.error || 'Error al registrar usuario');
    }
    return toSignUpResultDomain(result.data);
  }

  async signOut(): Promise<void> {
    const result = await this.api.signOut();
    if (!result.success) {
      throw new Error(result.error);
    }
  }

  async verifyEmailCallback(input: TEmailCallbackQuery): Promise<Session> {
    const result = await this.api.verifyEmailCallback(input);
    if (!result.success) {
      throw new Error(result.error);
    }
    return toSessionDomain(result.data);
  }

  async sendOtp(input: TSendOtpInput): Promise<void> {
    const result = await this.api.sendOtp(input);
    if (!result.success) {
      throw new Error(result.error);
    }
  }

  async verifyOtp(input: TVerifyOtpInput): Promise<Session> {
    const result = await this.api.verifyOtp(input);
    if (!result.success) {
      throw new Error(result.error);
    }
    return toSessionDomain(result.data);
  }

  async forgotPassword(input: TForgotPasswordInput): Promise<void> {
    const result = await this.api.forgotPassword(input);
    if (!result.success) {
      throw new Error(result.error);
    }
  }

  async resetPassword(input: TResetPasswordWithOtpInput): Promise<void> {
    const result = await this.api.resetPassword(input);
    if (!result.success) {
      throw new Error(result.error);
    }
  }

  getGoogleAuthUrl(callbackUrl?: string): string {
    return this.api.getGoogleAuthUrl(callbackUrl);
  }
}
