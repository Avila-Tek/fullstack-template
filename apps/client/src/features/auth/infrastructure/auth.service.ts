import type {
  TEmailCallbackQuery,
  TForgotPasswordInput,
  TResetPasswordInput,
  TSendOtpInput,
  TSignInInput,
  TSignUpInput,
  TVerifyOtpInput,
} from '@repo/schemas';
import type { Session, SignUpResult } from '../domain/auth.model';
import type { AuthApi } from './auth.interfaces';
import { toSessionDomain, toSignUpResultDomain } from './auth.transform';

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

  async resetPassword(input: TResetPasswordInput): Promise<void> {
    const result = await this.api.resetPassword(input);
    if (!result.success) {
      throw new Error(result.error);
    }
  }

  getGoogleAuthUrl(callbackUrl?: string): string {
    return this.api.getGoogleAuthUrl(callbackUrl);
  }
}
