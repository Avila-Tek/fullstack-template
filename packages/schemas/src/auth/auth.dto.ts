import { getEnumObjectFromArray } from '@repo/utils';
import { z } from 'zod';

// ── Auth search params (BA token-link flow) ──────────────────────────────────

export const authSearchParam = [
  'token', // BA email verification / password reset token
  'email',
  'reset',
] as const;
export type TAuthSearchParamEnum = (typeof authSearchParam)[number];
export const authSearchParamEnumObject = getEnumObjectFromArray(authSearchParam);

// ── Better Auth raw response shapes ─────────────────────────────────────────

/**
 * Raw user object returned by the Better Auth session endpoint.
 * Core fields are always present; extended fields (firstName, lastName, etc.)
 * are returned when the server adds them via the user plugin.
 */
export const betterAuthUserSchema = z.object({
  id:            z.string(),
  email:         z.string().email(),
  name:          z.string(),
  emailVerified: z.boolean(),
  image:         z.string().nullable().optional(),
  createdAt:     z.coerce.date(),
  updatedAt:     z.coerce.date(),
  // Extended fields from our custom user table (optional — added in later phases)
  firstName:  z.string().nullable().optional(),
  lastName:   z.string().nullable().optional(),
  timezone:   z.string().optional(),
  status:     z.enum(['active', 'inactive']).optional(),
});

export type TBetterAuthUser = z.output<typeof betterAuthUserSchema>;

/**
 * Raw session object returned by the Better Auth session endpoint.
 */
export const betterAuthSessionSchema = z.object({
  id:         z.string(),
  userId:     z.string(),
  expiresAt:  z.coerce.date(),
  token:      z.string().optional(),
  ipAddress:  z.string().nullable().optional(),
  userAgent:  z.string().nullable().optional(),
  createdAt:  z.coerce.date().optional(),
  updatedAt:  z.coerce.date().optional(),
});

export type TBetterAuthSession = z.output<typeof betterAuthSessionSchema>;

/**
 * Shape of `authClient.getSession()` success response.
 */
export const getSessionResponseSchema = z.object({
  session: betterAuthSessionSchema,
  user:    betterAuthUserSchema,
});

export type TGetSessionResponse = z.output<typeof getSessionResponseSchema>;

// ── Service input schemas ────────────────────────────────────────────────────

export const signInEmailInputSchema = z.object({
  email:       z.string().email(),
  password:    z.string().min(8),
  callbackURL: z.string().optional(),
});

export type TSignInEmailInput = z.infer<typeof signInEmailInputSchema>;

export const signUpEmailInputSchema = z.object({
  email:       z.string().email(),
  password:    z.string().min(8),
  name:        z.string().min(1),
  callbackURL: z.string().optional(),
});

export type TSignUpEmailInput = z.infer<typeof signUpEmailInputSchema>;

export const forgotPasswordInputSchema = z.object({
  email:      z.string().email(),
  /** Defaults to '/auth/reset-password' when omitted */
  redirectTo: z.string().optional(),
});

export type TForgotPasswordInput = z.infer<typeof forgotPasswordInputSchema>;

export const resetPasswordInputSchema = z.object({
  newPassword: z.string().min(8),
  /** Token from the password-reset email link (required at runtime) */
  token:       z.string(),
});

export type TResetPasswordInput = z.infer<typeof resetPasswordInputSchema>;

export const verifyEmailInputSchema = z.object({
  token: z.string(),
});

export type TVerifyEmailInput = z.infer<typeof verifyEmailInputSchema>;

export const sendVerificationEmailInputSchema = z.object({
  email:       z.string().email(),
  callbackURL: z.string().optional(),
});

export type TSendVerificationEmailInput = z.infer<typeof sendVerificationEmailInputSchema>;

const oauthProviders = ['google', 'github', 'microsoft', 'apple'] as const;
export type TOAuthProvider = (typeof oauthProviders)[number];

export const signInSocialInputSchema = z.object({
  provider:    z.enum(oauthProviders),
  callbackURL: z.string().optional(),
});

export type TSignInSocialInput = z.infer<typeof signInSocialInputSchema>;

// ── Service output schemas ───────────────────────────────────────────────────

export const signUpResultSchema = z.object({
  requiresEmailVerification: z.literal(true),
});

export type TSignUpResult = z.infer<typeof signUpResultSchema>;

// ── Grouped export ───────────────────────────────────────────────────────────

export const authDTO = Object.freeze({
  // Search params
  authSearchParamEnumObject,
  // Raw BA shapes
  betterAuthUserSchema,
  betterAuthSessionSchema,
  getSessionResponseSchema,
  // Inputs
  signInEmailInputSchema,
  signUpEmailInputSchema,
  forgotPasswordInputSchema,
  resetPasswordInputSchema,
  verifyEmailInputSchema,
  sendVerificationEmailInputSchema,
  signInSocialInputSchema,
  // Outputs
  signUpResultSchema,
});
