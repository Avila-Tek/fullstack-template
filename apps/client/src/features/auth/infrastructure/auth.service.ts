import { authClient } from '@repo/auth';
import type { Session } from '../domain/auth.model';
import type {
  ForgetPasswordInput,
  ResetPasswordInput,
  SignInInput,
  SignUpInput,
  SignUpResult,
  VerifyEmailInput,
} from './auth.interfaces';
import { toSessionDomain } from './auth.transform';

/**
 * AuthServiceClass wraps better-auth client calls with domain error handling.
 * All methods throw an Error with the backend-translated message on failure.
 * The session is established via HTTPOnly cookie — signIn does NOT return tokens.
 *
 * Parsing contract: raw BA responses are parsed through Zod schemas
 * (imported from @repo/schemas) inside auth.transform.ts before they reach
 * the domain types, catching API contract drift at the infrastructure boundary.
 */
export class AuthServiceClass {
  async signIn(input: SignInInput): Promise<Session> {
    const result = await authClient.signIn.email({
      email:       input.email,
      password:    input.password,
      callbackURL: input.callbackURL,
    });
    if (result.error || !result.data) {
      throw new Error(result.error?.message ?? 'Sign in failed');
    }
    // BA sets the session cookie on sign-in; fetch the full session for domain mapping.
    const sessionResult = await authClient.getSession();
    if (!sessionResult.data?.session || !sessionResult.data?.user) {
      throw new Error('Session not found after sign in');
    }
    return toSessionDomain(sessionResult.data);
  }

  async signUp(input: SignUpInput): Promise<SignUpResult> {
    const result = await authClient.signUp.email({
      email:       input.email,
      password:    input.password,
      name:        input.name,
      callbackURL: input.callbackURL,
    });
    if (result.error) {
      throw new Error(result.error.message ?? 'Sign up failed');
    }
    return { requiresEmailVerification: true };
  }

  async signOut(): Promise<void> {
    const result = await authClient.signOut();
    if (result.error) {
      throw new Error(result.error.message ?? 'Sign out failed');
    }
  }

  /** Request a password-reset email. BA endpoint: POST /request-password-reset */
  async forgotPassword(input: ForgetPasswordInput): Promise<void> {
    const result = await authClient.requestPasswordReset({
      email:      input.email,
      redirectTo: input.redirectTo ?? '/auth/reset-password',
    });
    if (result.error) {
      throw new Error(result.error.message ?? 'Failed to send reset email');
    }
  }

  /** Reset password using the token from the email link. BA endpoint: POST /reset-password */
  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const result = await authClient.resetPassword({
      newPassword: input.newPassword,
      token:       input.token,
    });
    if (result.error) {
      throw new Error(result.error.message ?? 'Password reset failed');
    }
  }

  /** Verify email address via token from email link. BA endpoint: GET /verify-email */
  async verifyEmail(input: VerifyEmailInput): Promise<void> {
    const result = await authClient.verifyEmail({ query: { token: input.token } });
    if (result.error) {
      throw new Error(result.error.message ?? 'Email verification failed');
    }
  }

  /** Resend verification email. BA endpoint: POST /send-verification-email */
  async sendVerificationEmail(email: string): Promise<void> {
    const result = await authClient.sendVerificationEmail({
      email,
      callbackURL: '/auth/email-verified',
    });
    if (result.error) {
      throw new Error(result.error.message ?? 'Failed to send verification email');
    }
  }

  /** Initiate Google OAuth flow. BA endpoint: POST /sign-in/social */
  async signInWithGoogle(callbackURL?: string): Promise<void> {
    const result = await authClient.signIn.social({
      provider:    'google',
      callbackURL: callbackURL ?? '/auth/callback',
    });
    if (result.error) {
      throw new Error(result.error.message ?? 'Google sign-in failed');
    }
  }
}

export const AuthService = new AuthServiceClass();
