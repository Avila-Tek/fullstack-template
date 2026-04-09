import { z } from 'zod';
import { userSchema } from '../users/user.schema';
import { passwordComplexitySchema } from './password.schema';

// ---- Request schemas (shared between frontend and API) ----

export const loginInput = z.object({
  email: z.email(),
  password: z.string().min(8),
});

// Full sign-up input including captcha + T&C fields required by the API.
export const signUpInput = z.object({
  email: z.email(),
  password: passwordComplexitySchema,
  rePassword: passwordComplexitySchema,
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  captchaToken: z.string().min(1),
  captchaVersion: z.enum(['v2', 'v3']).optional(),
  termsAccepted: z.literal(true),
  termsAcceptedVersion: z.string().min(1),
});

export const forgetPasswordInput = z.object({
  email: z.email(),
});

export const sendOtpInput = forgetPasswordInput;

export const verifyOtpInput = z.object({
  email: z.email(),
  otp: z.string().length(6),
});

export const resetPasswordInput = z.object({
  token: z.string().min(1),
  newPassword: passwordComplexitySchema,
});

export const resetPasswordWithOtpInput = z.object({
  email: z.email(),
  otp: z.string().length(6),
  newPassword: passwordComplexitySchema,
});

export const changePasswordInput = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordComplexitySchema,
});

export const socialSignInInput = z.object({
  provider: z.enum(['google']),
  callbackUrl: z.string().url().optional(),
});

export const totpVerifyInput = z.object({
  code: z.string().length(6),
});

export const disableTotpInput = z.object({
  password: z.string().min(1),
});

// ---- Response schemas ----

export const signOutResponse = z.object({
  success: z.literal(true),
});

export const verificationResultResponse = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});

export const tokenResponse = z.object({
  token: z.string(),
});

export const socialSignInResponse = z.object({
  url: z.string().url(),
});

export const enableTotpResponse = z.object({
  qrCodeUri: z.string(),
  backupCodes: z.array(z.string()),
});

export const backupCodesResponse = z.object({
  backupCodes: z.array(z.string()),
});

export const getSessionResponse = z.object({
  user: userSchema.nullable(),
  session: z.object({ id: z.string(), expiresAt: z.string() }).nullable(),
});

export const signInResponse = userSchema;
export const signUpResponse = userSchema;
export const verifyOtpResponse = userSchema;
export const currentUserResponse = userSchema;
export const emailCallbackResponse = verificationResultResponse;

// ---- Auth namespace (response schemas grouped for service consumption) ----

export const authDTO = {
  signInResponse,
  signUpResponse,
  emailCallbackResponse,
  verifyOtpResponse,
  currentUserResponse,
  getSessionResponse,
} as const;

// ---- Auth search param keys ----

export const authSearchParamEnumObject = {
  token_hash: 'token_hash',
  type: 'type',
} as const;

// ---- Types ----

export type TLoginInput = z.infer<typeof loginInput>;
export type TSignInInput = z.infer<typeof loginInput>;
export type TSignUpInput = z.infer<typeof signUpInput>;
export type TForgotPasswordInput = z.infer<typeof forgetPasswordInput>;
export type TSendOtpInput = z.infer<typeof sendOtpInput>;
export type TVerifyOtpInput = z.infer<typeof verifyOtpInput>;
export type TResetPasswordInput = z.infer<typeof resetPasswordInput>;
export type TResetPasswordWithOtpInput = z.infer<
  typeof resetPasswordWithOtpInput
>;
export type TChangePasswordInput = z.infer<typeof changePasswordInput>;
export type TSocialSignInInput = z.infer<typeof socialSignInInput>;
export type TTotpVerifyInput = z.infer<typeof totpVerifyInput>;
export type TDisableTotpInput = z.infer<typeof disableTotpInput>;

export interface TEmailCallbackQuery {
  token_hash: string;
  type: string;
}
