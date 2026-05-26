import {
  type TForgotPasswordInput,
  type TResetPasswordInput,
  type TSignInEmailInput,
  type TSignUpEmailInput,
} from '@repo/schemas';
import type { Safe } from '@repo/utils';
import type {
  HttpClient,
  HttpRequestOptions,
} from '../http';

/**
 * AuthService - HTTP adapter for auth endpoints exposed by the API.
 *
 * NOTE: Sign-in, sign-up, sign-out, and session management are now handled
 * by the Better Auth browser client (@repo/auth → authClient). This class
 * is kept for any future server-side or server-action auth calls that cannot
 * use the browser client directly.
 */
export class AuthService {
  private readonly basePath = '/v1/auth';

  constructor(private readonly httpClient: HttpClient) {}

  /**
   * Request a password-reset email (fallback HTTP adapter).
   * Prefer authClient.requestPasswordReset() in browser contexts.
   */
  async forgotPassword(
    input: TForgotPasswordInput,
    options?: HttpRequestOptions
  ): Promise<Safe<void>> {
    return await this.httpClient.post(
      `${this.basePath}/request-password-reset`,
      input,
      undefined,
      { ...options, authorization: false }
    );
  }

  /**
   * Reset password with token (fallback HTTP adapter).
   * Prefer authClient.resetPassword() in browser contexts.
   */
  async resetPassword(
    input: TResetPasswordInput,
    options?: HttpRequestOptions
  ): Promise<Safe<void>> {
    return await this.httpClient.post(
      `${this.basePath}/reset-password`,
      input,
      undefined,
      { ...options, authorization: false }
    );
  }

  /**
   * Sign in (fallback HTTP adapter — for server-side use).
   * In browser contexts, use authClient.signIn.email() instead.
   */
  async signIn(
    input: TSignInEmailInput,
    options?: HttpRequestOptions
  ): Promise<Safe<void>> {
    return await this.httpClient.post(
      `${this.basePath}/sign-in/email`,
      input,
      undefined,
      { ...options, authorization: false }
    );
  }

  /**
   * Sign up (fallback HTTP adapter — for server-side use).
   * In browser contexts, use authClient.signUp.email() instead.
   */
  async signUp(
    input: TSignUpEmailInput,
    options?: HttpRequestOptions
  ): Promise<Safe<void>> {
    return await this.httpClient.post(
      `${this.basePath}/sign-up/email`,
      input,
      undefined,
      { ...options, authorization: false }
    );
  }

  /**
   * Sign out (fallback HTTP adapter — for server-side use).
   * In browser contexts, use authClient.signOut() instead.
   */
  async signOut(options?: HttpRequestOptions): Promise<Safe<void>> {
    return await this.httpClient.post(
      `${this.basePath}/sign-out`,
      undefined,
      undefined,
      options
    );
  }
}
