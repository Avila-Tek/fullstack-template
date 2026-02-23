import {
  authDTO,
  authSearchParamEnumObject,
  TEmailCallbackQuery,
  TForgotPasswordInput,
  TResetPasswordInput,
  TSendOtpInput,
  TSignInInput,
  TSignUpInput,
  TVerifyOtpInput,
} from '@repo/schemas';
import type { Safe } from '@repo/utils';
import type {
  HttpClient,
  HttpRequestOptions,
  InferEnvelopeData,
} from '../http';

// Infer success data types from schemas
type SignInSuccessData = InferEnvelopeData<typeof authDTO.signInResponse>;
type SignUpSuccessData = InferEnvelopeData<typeof authDTO.signUpResponse>;
type EmailCallbackSuccessData = InferEnvelopeData<
  typeof authDTO.emailCallbackResponse
>;
type VerifyOtpSuccessData = InferEnvelopeData<typeof authDTO.verifyOtpResponse>;
type CurrentUserSuccessData = InferEnvelopeData<
  typeof authDTO.currentUserResponse
>;
type GetSessionSuccessData = InferEnvelopeData<
  typeof authDTO.getSessionResponse
>;

/**
 * AuthService - Authentication operations
 *
 * Uses HttpClient with optional schema for automatic:
 * - Zod schema validation
 * - API envelope unwrapping ({ success, data, error } -> data)
 * - Consistent error handling
 */
export class AuthService {
  private readonly basePath = '/v1/auth';

  constructor(
    private readonly httpClient: HttpClient,
    private readonly baseUrl: string
  ) {}

  /**
   * Constructs the Google OAuth URL
   */
  getGoogleAuthUrl(callbackUrl?: string): string {
    const callback =
      callbackUrl ??
      `${typeof window !== 'undefined' ? window.location.origin : ''}/callback`;
    const encodedCallback = encodeURIComponent(callback);
    return `${this.baseUrl}${this.basePath}/google?callbackUrl=${encodedCallback}`;
  }

  /**
   * Sign in with email and password
   */
  async signIn(
    input: TSignInInput,
    options?: HttpRequestOptions
  ): Promise<Safe<SignInSuccessData>> {
    return await this.httpClient.post(
      `${this.basePath}/sign-in`,
      input,
      undefined,
      {
        ...options,
        authorization: false,
      },
      authDTO.signInResponse
    );
  }

  /**
   * Create a new account
   */
  async signUp(
    input: TSignUpInput,
    options?: HttpRequestOptions
  ): Promise<Safe<SignUpSuccessData>> {
    return await this.httpClient.post(
      `${this.basePath}/sign-up`,
      input,
      undefined,
      {
        ...options,
        authorization: false,
      },
      authDTO.signUpResponse
    );
  }

  /**
   * Sign out the current user
   */
  async signOut(options?: HttpRequestOptions): Promise<Safe<void>> {
    return await this.httpClient.post(
      `${this.basePath}/sign-out`,
      undefined,
      undefined,
      options
    );
  }

  /**
   * Get the currently authenticated user
   */
  async getCurrentUser(
    options?: HttpRequestOptions
  ): Promise<Safe<CurrentUserSuccessData>> {
    return await this.httpClient.get(
      `${this.basePath}/current-user`,
      undefined,
      {
        ...options,
      },
      authDTO.currentUserResponse
    );
  }

  /**
   * Verify email using callback token
   */
  async verifyEmailCallback(
    input: TEmailCallbackQuery,
    options?: HttpRequestOptions
  ): Promise<Safe<EmailCallbackSuccessData>> {
    return await this.httpClient.get(
      `${this.basePath}/callback`,
      {
        [authSearchParamEnumObject.token_hash]: input.token_hash,
        [authSearchParamEnumObject.type]: input.type,
      },
      {
        ...options,
        authorization: false,
      },
      authDTO.emailCallbackResponse
    );
  }

  /**
   * Send OTP to email
   */
  async sendOtp(
    input: TSendOtpInput,
    options?: HttpRequestOptions
  ): Promise<Safe<void>> {
    return await this.httpClient.post(
      `${this.basePath}/send-otp`,
      input,
      undefined,
      {
        ...options,
        authorization: false,
      }
    );
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(
    input: TVerifyOtpInput,
    options?: HttpRequestOptions
  ): Promise<Safe<VerifyOtpSuccessData>> {
    return await this.httpClient.post(
      `${this.basePath}/verify-otp`,
      input,
      undefined,
      {
        ...options,
        authorization: false,
      },
      authDTO.verifyOtpResponse
    );
  }

  /**
   * Request password reset
   */
  async forgotPassword(
    input: TForgotPasswordInput,
    options?: HttpRequestOptions
  ): Promise<Safe<void>> {
    return await this.httpClient.post(
      `${this.basePath}/forgot-password`,
      input,
      undefined,
      {
        ...options,
        authorization: false,
      }
    );
  }

  /**
   * Reset password with OTP
   */
  async resetPassword(
    input: TResetPasswordInput,
    options?: HttpRequestOptions
  ): Promise<Safe<void>> {
    return await this.httpClient.post(
      `${this.basePath}/reset-password`,
      input,
      undefined,
      {
        ...options,
        authorization: false,
      }
    );
  }

  /**
   * Get session from cookies
   */
  async getSession(
    options?: HttpRequestOptions
  ): Promise<Safe<GetSessionSuccessData>> {
    return await this.httpClient.get(
      `${this.basePath}/get-session`,
      undefined,
      {
        ...options,
        authorization: false,
        credentials: 'include',
      },
      authDTO.getSessionResponse
    );
  }
}
